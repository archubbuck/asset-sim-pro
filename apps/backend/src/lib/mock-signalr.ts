import { InvocationContext } from '@azure/functions';
import { encode } from '@msgpack/msgpack';
import Decimal from 'decimal.js';
import { PriceUpdateEvent } from '../types/market-engine';
import {
  trackUpdateBroadcasted,
  trackBroadcastFailure,
  trackDeadbandFiltered,
  trackBroadcastLatency,
} from './telemetry';

/**
 * MockSignalRService - In-memory SignalR for local development
 * 
 * This replaces Azure SignalR Service with an in-memory implementation
 * that logs broadcasts instead of sending to actual WebSocket connections.
 * 
 * ADR-009: Event-Driven Architecture (Updated for Local Development)
 * - In-memory group management
 * - Console-based message broadcasting
 * - No external SignalR service required
 */

interface Group {
  name: string;
  connections: Set<string>;
  messageLog: Array<{
    data: any;
    timestamp: number;
  }>;
}

class MockSignalRService {
  private groups: Map<string, Group> = new Map();

  /**
   * Get or create a group
   */
  private getGroup(groupName: string): Group {
    if (!this.groups.has(groupName)) {
      this.groups.set(groupName, {
        name: groupName,
        connections: new Set(),
        messageLog: []
      });
    }
    return this.groups.get(groupName)!;
  }

  /**
   * Add a connection to a group
   */
  addConnectionToGroup(connectionId: string, groupName: string): void {
    const group = this.getGroup(groupName);
    group.connections.add(connectionId);
    console.log(`MockSignalR: Added connection ${connectionId} to group ${groupName} (${group.connections.size} connections)`);
  }

  /**
   * Remove a connection from a group
   */
  removeConnectionFromGroup(connectionId: string, groupName: string): void {
    const group = this.groups.get(groupName);
    if (group) {
      group.connections.delete(connectionId);
      console.log(`MockSignalR: Removed connection ${connectionId} from group ${groupName} (${group.connections.size} connections)`);
    }
  }

  /**
   * Send message to all connections in a group
   */
  sendToGroup(groupName: string, data: any): void {
    const group = this.getGroup(groupName);
    
    // Log the message
    const entry = {
      data,
      timestamp: Date.now()
    };
    
    group.messageLog.push(entry);
    
    // Keep only last 100 messages per group
    if (group.messageLog.length > 100) {
      group.messageLog.shift();
    }

    // Summarize binary payloads for logging
    let displayData = data;
    const isBuffer = typeof Buffer !== 'undefined' && Buffer.isBuffer(data);
    const isBinaryView = data instanceof Uint8Array || ArrayBuffer.isView(data);

    if (isBuffer || isBinaryView) {
      const length =
        typeof (data as any).byteLength === 'number'
          ? (data as any).byteLength
          : (data as any).length;
      displayData = `<Binary: ${length} bytes>`;
    }
    
    console.log(
      `MockSignalR: Broadcast to ${groupName} (${group.connections.size} connections):`,
      displayData
    );
  }

  /**
   * Get recent messages for a group (for debugging)
   */
  getGroupMessages(groupName: string, limit: number = 10): Array<{ data: any; timestamp: number }> {
    const group = this.groups.get(groupName);
    if (!group) {
      return [];
    }
    return group.messageLog.slice(-limit);
  }

  /**
   * Get all groups
   */
  getGroups(): string[] {
    return Array.from(this.groups.keys());
  }

  /**
   * Clear all groups and messages
   */
  clear(): void {
    this.groups.clear();
  }
}

// Singleton instance
let mockSignalRService: MockSignalRService | null = null;

/**
 * Get or create mock SignalR service
 */
function getMockSignalRService(): MockSignalRService {
  if (!mockSignalRService) {
    mockSignalRService = new MockSignalRService();
    console.log('MockSignalRService initialized successfully');
  }
  return mockSignalRService;
}

/**
 * Reset SignalR service (for testing purposes)
 * @internal
 */
export function resetMockSignalRService(): void {
  mockSignalRService = null;
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
 * - Broadcasts to in-memory group
 * - Uses MessagePack for protocol efficiency
 * - Applies deadband filtering
 * - Logs to console instead of sending over network
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

    const service = getMockSignalRService();
    const groupName = `ticker:${priceUpdate.exchangeId}`;

    // Encode message using MessagePack for consistency
    const messageData = encode(priceUpdate);

    // Send to mock SignalR group
    service.sendToGroup(groupName, messageData);

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
  try {
    const service = getMockSignalRService();
    const groupName = `ticker:${exchangeId}`;
    
    service.addConnectionToGroup(connectionId, groupName);
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
  try {
    const service = getMockSignalRService();
    const groupName = `ticker:${exchangeId}`;
    
    service.removeConnectionFromGroup(connectionId, groupName);
  } catch (error) {
    const err = error as Error;
    throw new Error(`Failed to remove connection from group: ${err.message}`);
  }
}

/**
 * Get recent messages for debugging
 */
export function getRecentMessages(exchangeId: string, limit: number = 10): Array<{ data: any; timestamp: number }> {
  const service = getMockSignalRService();
  const groupName = `ticker:${exchangeId}`;
  return service.getGroupMessages(groupName, limit);
}

/**
 * Get all active groups
 */
export function getActiveGroups(): string[] {
  const service = getMockSignalRService();
  return service.getGroups();
}
