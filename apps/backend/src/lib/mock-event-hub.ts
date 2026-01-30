import { InvocationContext } from '@azure/functions';
import { PriceUpdateEvent } from '../types/market-engine';

/**
 * MockEventHubService - In-memory Event Hub for local development
 * 
 * This replaces Azure Event Hubs with an in-memory implementation
 * that logs events instead of sending to actual Event Hub.
 * 
 * ADR-009: Event-Driven Architecture (Updated for Local Development)
 * - In-memory event logging
 * - No external Event Hub service required
 * - Maintains event history for debugging
 */

interface EventRecord {
  body: any;
  properties: Record<string, any>;
  timestamp: number;
}

class MockEventHubService {
  private events: EventRecord[] = [];
  private maxEvents: number = 1000; // Keep last 1000 events

  /**
   * Send an event
   */
  sendEvent(event: EventRecord): void {
    this.events.push(event);

    // Keep only the last maxEvents
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    console.log(
      `MockEventHub: Event sent [${event.properties.eventType}]`,
      JSON.stringify(event.body).substring(0, 100)
    );
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 10): EventRecord[] {
    return this.events.slice(-limit);
  }

  /**
   * Get events by type
   */
  getEventsByType(eventType: string, limit: number = 10): EventRecord[] {
    return this.events
      .filter(e => e.properties.eventType === eventType)
      .slice(-limit);
  }

  /**
   * Get events by exchange
   */
  getEventsByExchange(exchangeId: string, limit: number = 10): EventRecord[] {
    return this.events
      .filter(e => e.properties.exchangeId === exchangeId)
      .slice(-limit);
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Get event count
   */
  getEventCount(): number {
    return this.events.length;
  }
}

// Singleton instance
let mockEventHubService: MockEventHubService | null = null;

/**
 * Get or create mock Event Hub service
 */
function getMockEventHubService(): MockEventHubService {
  if (!mockEventHubService) {
    mockEventHubService = new MockEventHubService();
    console.log('MockEventHubService initialized successfully');
  }
  return mockEventHubService;
}

/**
 * Reset Event Hub service (for testing purposes)
 * @internal
 */
export function resetMockEventHubService(): void {
  mockEventHubService = null;
}

/**
 * Send price update to Event Hubs for audit trail
 * 
 * ADR-009: Simultaneous Output (Updated for Local Development)
 * - Price updates logged to in-memory store
 * - No external Event Hub service required
 * 
 * @param priceUpdate - Price update event data
 * @param context - Azure Functions context for logging
 */
export async function sendPriceUpdateToEventHub(
  priceUpdate: PriceUpdateEvent,
  context: InvocationContext
): Promise<void> {
  try {
    const service = getMockEventHubService();

    const eventData: EventRecord = {
      body: priceUpdate,
      properties: {
        eventType: 'PriceUpdate',
        exchangeId: priceUpdate.exchangeId,
        symbol: priceUpdate.symbol,
      },
      timestamp: Date.now()
    };

    service.sendEvent(eventData);

    context.log(
      `Sent to Event Hub: ${priceUpdate.symbol} @ ${priceUpdate.price}`
    );
  } catch (error) {
    const err = error as Error;
    context.error(`Failed to send to Event Hub: ${err.message}`);
    // Don't throw - allow market engine to continue even if Event Hub fails
  }
}

/**
 * Get recent events (for debugging)
 */
export function getRecentEvents(limit: number = 10): EventRecord[] {
  const service = getMockEventHubService();
  return service.getRecentEvents(limit);
}

/**
 * Get events by type (for debugging)
 */
export function getEventsByType(eventType: string, limit: number = 10): EventRecord[] {
  const service = getMockEventHubService();
  return service.getEventsByType(eventType, limit);
}

/**
 * Get events by exchange (for debugging)
 */
export function getEventsByExchange(exchangeId: string, limit: number = 10): EventRecord[] {
  const service = getMockEventHubService();
  return service.getEventsByExchange(exchangeId, limit);
}

/**
 * Get event count (for monitoring)
 */
export function getEventCount(): number {
  const service = getMockEventHubService();
  return service.getEventCount();
}

/**
 * Close Event Hub client connection gracefully
 * Should be called during application shutdown
 */
export async function closeMockEventHubClient(): Promise<void> {
  if (mockEventHubService) {
    mockEventHubService.clear();
    mockEventHubService = null;
  }
}
