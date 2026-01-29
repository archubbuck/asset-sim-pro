import { EventHubProducerClient } from '@azure/event-hubs';
import { InvocationContext } from '@azure/functions';
import { PriceUpdateEvent } from '../types/market-engine';

let eventHubClient: EventHubProducerClient | null = null;

/**
 * Reset Event Hub client (for testing purposes)
 * @internal
 */
export function resetEventHubClient(): void {
  eventHubClient = null;
}

/**
 * Get or create Event Hub client singleton
 * 
 * ADR-009: Event-Driven Architecture
 * - Sends price updates to Event Hubs for downstream audit
 */
export function getEventHubClient(): EventHubProducerClient {
  if (eventHubClient) {
    return eventHubClient;
  }

  const connectionString = process.env.EVENT_HUB_CONNECTION_STRING;
  const eventHubName = process.env.EVENT_HUB_NAME || 'market-data-audit';

  if (!connectionString) {
    throw new Error('EVENT_HUB_CONNECTION_STRING environment variable is required');
  }

  eventHubClient = new EventHubProducerClient(connectionString, eventHubName);

  return eventHubClient;
}

/**
 * Send price update to Event Hubs for audit trail
 * 
 * ADR-009: Simultaneous Output
 * - Price updates sent to Event Hubs for downstream audit and compliance
 * 
 * @param priceUpdate - Price update event data
 * @param context - Azure Functions context for logging
 */
export async function sendPriceUpdateToEventHub(
  priceUpdate: PriceUpdateEvent,
  context: InvocationContext
): Promise<void> {
  try {
    const client = getEventHubClient();

    // Create batch of events (single event in this case)
    const batch = await client.createBatch();
    
    const eventData = {
      body: priceUpdate,
      properties: {
        eventType: 'PriceUpdate',
        exchangeId: priceUpdate.exchangeId,
        symbol: priceUpdate.symbol,
      },
    };

    const added = batch.tryAdd(eventData);
    
    if (!added) {
      context.warn('Event too large to add to batch');
      return;
    }

    // Send the batch
    await client.sendBatch(batch);

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
 * Close Event Hub client connection gracefully
 * Should be called during application shutdown
 */
export async function closeEventHubClient(): Promise<void> {
  if (eventHubClient) {
    await eventHubClient.close();
    eventHubClient = null;
  }
}
