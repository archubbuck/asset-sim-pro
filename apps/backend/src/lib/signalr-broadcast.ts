import { WebPubSubServiceClient } from '@azure/web-pubsub';
import { encode } from '@msgpack/msgpack';
import { InvocationContext } from '@azure/functions';
import Decimal from 'decimal.js';
import { PriceUpdateEvent } from '../types/market-engine';
import {
  trackUpdateBroadcasted,
  trackBroadcastFailure,
  trackDeadbandFiltered,
  trackBroadcastLatency,
} from './telemetry';
import * as mockSignalR from './mock-signalr';

let signalRClient: WebPubSubServiceClient | null = null;

/**
 * Check if we should use local development mode (mock SignalR).
 * Local dev mode must be explicitly enabled via NODE_ENV=development.
 * Missing connection strings in production will fail fast.
 */
function isLocalDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Reset SignalR client (for testing purposes)
 * @internal
 */
export function resetSignalRClient(): void {
  signalRClient = null;
  mockSignalR.resetMockSignalRService();
}

/**
 * Get or create SignalR client singleton
 * In local development, returns null as we use mock SignalR instead
 * 
 * ADR-009: Event-Driven Architecture (Updated for Local Development)
 * - Uses Azure Web PubSub (SignalR) for real-time broadcasts in production
 * - Uses mock SignalR for local development
 * - MessagePack protocol for efficiency
 * - Group-based broadcasting to ticker:{ExchangeId}
 */
export function getSignalRClient(): WebPubSubServiceClient | null {
  if (isLocalDevelopment()) {
    // Return null - mock SignalR doesn't need a client
    return null;
  }

  if (signalRClient) {
    return signalRClient;
  }

  const connectionString = process.env.AZURE_SIGNALR_CONNECTION_STRING;

  if (!connectionString) {
    throw new Error('AZURE_SIGNALR_CONNECTION_STRING environment variable is required');
  }

  // Create Web PubSub client for 'market-data' hub
  signalRClient = new WebPubSubServiceClient(connectionString, 'market-data');

  return signalRClient;
}

/**
 * Apply deadband filter to price changes
 * 
 * ADR-009: Deadband Filtering
 * - Ignore price changes < $0.01 to reduce bandwidth
 * 
 * ADR-006: Uses Decimal.js for all financial calculations
 * 
 * @param lastPrice - Previous price
 * @param newPrice - Current price
 * @returns true if change is significant enough to broadcast
 */
export function shouldBroadcastPriceUpdate(lastPrice: number, newPrice: number): boolean {
  const DEADBAND_THRESHOLD = new Decimal(0.01); // $0.01
  const priceChange = new Decimal(newPrice).minus(lastPrice).abs();
  return priceChange.greaterThanOrEqualTo(DEADBAND_THRESHOLD);
}

/**
 * Broadcast price update to SignalR group using MessagePack
 * 
 * ADR-009: Fan-Out Pattern with MessagePack (Updated for Local Development)
 * - Broadcasts to group ticker:{ExchangeId}
 * - Uses MessagePack for protocol efficiency
 * - Applies deadband filtering
 * - Uses mock SignalR in local development
 * 
 * ADR-025: Observability & Health Checks
 * - Tracks UpdatesBroadcasted metric for monitoring
 * - Tracks BroadcastFailures for error detection
 * - Tracks DeadbandFiltered for optimization insights
 * 
 * @param priceUpdate - Price update event data
 * @param lastPrice - Previous price for deadband filtering
 * @param context - Azure Functions context for logging
 */
export async function broadcastPriceUpdate(
  priceUpdate: PriceUpdateEvent,
  lastPrice: number,
  context: InvocationContext
): Promise<void> {
  // In local development, use mock SignalR
  if (isLocalDevelopment()) {
    await mockSignalR.broadcastPriceUpdate(priceUpdate, lastPrice, context);
    return;
  }

  const startTime = performance.now();
  
  try {
    // Apply deadband filter
    if (!shouldBroadcastPriceUpdate(lastPrice, priceUpdate.price)) {
      context.log(
        `Deadband filter: skipping ${priceUpdate.symbol} (change < $0.01)`
      );
      
      // ADR-025: Track filtered updates
      trackDeadbandFiltered(priceUpdate.exchangeId, priceUpdate.symbol, context);
      return;
    }

    const client = getSignalRClient();
    if (!client) {
      throw new Error('SignalR client not available');
    }

    const groupName = `ticker:${priceUpdate.exchangeId}`;

    // Encode message using MessagePack for efficiency
    const messageData = encode(priceUpdate);

    // Send to SignalR group using correct API
    // Azure Web PubSub accepts binary data directly
    await client.group(groupName).sendToAll(messageData);

    context.log(
      `Broadcast to ${groupName}: ${priceUpdate.symbol} @ ${priceUpdate.price}`
    );
    
    // ADR-025: Track successful broadcast and latency
    const duration = performance.now() - startTime;
    trackUpdateBroadcasted(priceUpdate.exchangeId, priceUpdate.symbol, context);
    trackBroadcastLatency(duration, priceUpdate.exchangeId, priceUpdate.symbol, context);
    
  } catch (error) {
    const err = error as Error;
    context.error(`Failed to broadcast price update: ${err.message}`);
    
    // ADR-025: Track broadcast failures
    trackBroadcastFailure(priceUpdate.exchangeId, priceUpdate.symbol, err.message, context);
    
    // Don't throw - allow market engine to continue even if broadcast fails
  }
}

/**
 * Add connection to SignalR group
 * Clients call this when they want to subscribe to a specific exchange's ticker
 * 
 * @param connectionId - SignalR connection ID
 * @param exchangeId - Exchange ID to subscribe to
 */
export async function addToTickerGroup(
  connectionId: string,
  exchangeId: string
): Promise<void> {
  // In local development, use mock SignalR
  if (isLocalDevelopment()) {
    await mockSignalR.addToTickerGroup(connectionId, exchangeId);
    return;
  }

  try {
    const client = getSignalRClient();
    if (!client) {
      throw new Error('SignalR client not available');
    }

    const groupName = `ticker:${exchangeId}`;
    
    await client.group(groupName).addConnection(connectionId);
  } catch (error) {
    const err = error as Error;
    throw new Error(`Failed to add connection to group: ${err.message}`);
  }
}

/**
 * Remove connection from SignalR group
 * 
 * @param connectionId - SignalR connection ID
 * @param exchangeId - Exchange ID to unsubscribe from
 */
export async function removeFromTickerGroup(
  connectionId: string,
  exchangeId: string
): Promise<void> {
  // In local development, use mock SignalR
  if (isLocalDevelopment()) {
    await mockSignalR.removeFromTickerGroup(connectionId, exchangeId);
    return;
  }

  try {
    const client = getSignalRClient();
    if (!client) {
      throw new Error('SignalR client not available');
    }

    const groupName = `ticker:${exchangeId}`;
    
    await client.group(groupName).removeConnection(connectionId);
  } catch (error) {
    const err = error as Error;
    throw new Error(`Failed to remove connection from group: ${err.message}`);
  }
}
