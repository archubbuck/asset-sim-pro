import { WebPubSubServiceClient } from '@azure/web-pubsub';
import { encode } from '@msgpack/msgpack';
import { InvocationContext } from '@azure/functions';

let signalRClient: WebPubSubServiceClient | null = null;

/**
 * Reset SignalR client (for testing purposes)
 * @internal
 */
export function resetSignalRClient(): void {
  signalRClient = null;
}

/**
 * Get or create SignalR client singleton
 * 
 * ADR-009: Event-Driven Architecture
 * - Uses Azure Web PubSub (SignalR) for real-time broadcasts
 * - MessagePack protocol for efficiency
 * - Group-based broadcasting to ticker:{ExchangeId}
 */
export function getSignalRClient(): WebPubSubServiceClient {
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
 * Price update event for broadcasting
 */
export interface PriceUpdateBroadcast {
  exchangeId: string;
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
}

/**
 * Apply deadband filter to price changes
 * 
 * ADR-009: Deadband Filtering
 * - Ignore price changes < $0.01 to reduce bandwidth
 * 
 * @param lastPrice - Previous price
 * @param newPrice - Current price
 * @returns true if change is significant enough to broadcast
 */
export function shouldBroadcastPriceUpdate(lastPrice: number, newPrice: number): boolean {
  const DEADBAND_THRESHOLD = 0.01; // $0.01
  const priceChange = Math.abs(newPrice - lastPrice);
  return priceChange >= DEADBAND_THRESHOLD;
}

/**
 * Broadcast price update to SignalR group using MessagePack
 * 
 * ADR-009: Fan-Out Pattern with MessagePack
 * - Broadcasts to group ticker:{ExchangeId}
 * - Uses MessagePack for protocol efficiency
 * - Applies deadband filtering
 * 
 * @param priceUpdate - Price update event data
 * @param lastPrice - Previous price for deadband filtering
 * @param context - Azure Functions context for logging
 */
export async function broadcastPriceUpdate(
  priceUpdate: PriceUpdateBroadcast,
  lastPrice: number,
  context: InvocationContext
): Promise<void> {
  try {
    // Apply deadband filter
    if (!shouldBroadcastPriceUpdate(lastPrice, priceUpdate.price)) {
      context.log(
        `Deadband filter: skipping ${priceUpdate.symbol} (change < $0.01)`
      );
      return;
    }

    const client = getSignalRClient();
    const groupName = `ticker:${priceUpdate.exchangeId}`;

    // Encode message using MessagePack for efficiency
    const messageData = encode(priceUpdate);

    // Send to SignalR group using correct API
    // Azure Web PubSub accepts binary data directly
    await client.group(groupName).sendToAll(messageData);

    context.log(
      `Broadcast to ${groupName}: ${priceUpdate.symbol} @ ${priceUpdate.price.toFixed(2)}`
    );
  } catch (error) {
    const err = error as Error;
    context.error(`Failed to broadcast price update: ${err.message}`);
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
  const client = getSignalRClient();
  const groupName = `ticker:${exchangeId}`;
  
  await client.group(groupName).addConnection(connectionId);
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
  const client = getSignalRClient();
  const groupName = `ticker:${exchangeId}`;
  
  await client.group(groupName).removeConnection(connectionId);
}
