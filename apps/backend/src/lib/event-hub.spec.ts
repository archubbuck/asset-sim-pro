import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvocationContext } from '@azure/functions';

// Create mock Event Hub client
const mockEventHubClient = {
  createBatch: vi.fn().mockResolvedValue({
    tryAdd: vi.fn().mockReturnValue(true),
  }),
  sendBatch: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
};

// Mock dependencies - use class syntax for proper constructor mocking
vi.mock('@azure/event-hubs', () => ({
  EventHubProducerClient: class {
    constructor() {
      return mockEventHubClient;
    }
  },
}));

import { 
  sendPriceUpdateToEventHub,
  closeEventHubClient,
  getEventHubClient,
  resetEventHubClient,
} from './event-hub';

describe('Event Hub Service', () => {
  let mockContext: InvocationContext;

  beforeEach(() => {
    vi.clearAllMocks();
    resetEventHubClient(); // Reset singleton before each test
    
    mockContext = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    } as unknown as InvocationContext;

    // Set environment variables for tests
    process.env.EVENT_HUB_CONNECTION_STRING = 
      'Endpoint=sb://test.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=TESTKEY';
    process.env.EVENT_HUB_NAME = 'market-data-audit';
  });

  describe('sendPriceUpdateToEventHub', () => {
    const mockPriceUpdate = {
      exchangeId: 'exchange-123',
      symbol: 'AAPL',
      price: 150.50,
      change: 0.50,
      changePercent: 0.33,
      volume: 1000000,
      timestamp: '2026-01-20T00:00:00Z',
    };

    it('should send price update to Event Hub', async () => {
      await sendPriceUpdateToEventHub(mockPriceUpdate, mockContext);

      expect(mockEventHubClient.createBatch).toHaveBeenCalled();
      expect(mockEventHubClient.sendBatch).toHaveBeenCalled();
      expect(mockContext.log).toHaveBeenCalledWith(
        expect.stringContaining('Sent to Event Hub: AAPL')
      );
    });

    it('should include event metadata in properties', async () => {
      const mockBatch = {
        tryAdd: vi.fn().mockReturnValue(true),
      };
      mockEventHubClient.createBatch.mockResolvedValueOnce(mockBatch as any);

      await sendPriceUpdateToEventHub(mockPriceUpdate, mockContext);

      expect(mockBatch.tryAdd).toHaveBeenCalledWith({
        body: mockPriceUpdate,
        properties: {
          eventType: 'PriceUpdate',
          exchangeId: 'exchange-123',
          symbol: 'AAPL',
        },
      });
    });

    it('should handle case when event is too large for batch', async () => {
      const mockBatch = {
        tryAdd: vi.fn().mockReturnValue(false), // Event too large
      };
      mockEventHubClient.createBatch.mockResolvedValueOnce(mockBatch as any);

      await sendPriceUpdateToEventHub(mockPriceUpdate, mockContext);

      expect(mockContext.warn).toHaveBeenCalledWith('Event too large to add to batch');
      expect(mockEventHubClient.sendBatch).not.toHaveBeenCalled();
    });

    it('should handle Event Hub errors gracefully', async () => {
      mockEventHubClient.createBatch.mockRejectedValueOnce(new Error('Connection failed'));

      // Should not throw
      await expect(
        sendPriceUpdateToEventHub(mockPriceUpdate, mockContext)
      ).resolves.not.toThrow();

      expect(mockContext.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send to Event Hub')
      );
    });
  });

  describe('Client Initialization', () => {
    it('should throw error if connection string is missing', () => {
      delete process.env.EVENT_HUB_CONNECTION_STRING;
      resetEventHubClient();

      expect(() => getEventHubClient()).toThrow('EVENT_HUB_CONNECTION_STRING environment variable is required');
    });

    it('should use default Event Hub name if not specified', () => {
      delete process.env.EVENT_HUB_NAME;
      resetEventHubClient();

      // Should use 'market-data-audit' as default
      expect(() => getEventHubClient()).not.toThrow();
    });

    it('should reuse existing client (singleton pattern)', () => {
      const client1 = getEventHubClient();
      const client2 = getEventHubClient();

      expect(client1).toBe(client2);
    });
  });

  describe('closeEventHubClient', () => {
    it('should close client gracefully', async () => {
      getEventHubClient(); // Initialize client

      await closeEventHubClient();

      expect(mockEventHubClient.close).toHaveBeenCalled();
    });

    it('should handle case when client is not initialized', async () => {
      // Should not throw even if client is null
      await expect(closeEventHubClient()).resolves.not.toThrow();
    });
  });
});
