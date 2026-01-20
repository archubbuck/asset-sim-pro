import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InvocationContext } from '@azure/functions';

// Create a mock client instance
const mockWebPubSubGroup = {
  sendToAll: vi.fn().mockResolvedValue(undefined),
  addConnection: vi.fn().mockResolvedValue(undefined),
  removeConnection: vi.fn().mockResolvedValue(undefined),
};

const mockWebPubSubClient = {
  group: vi.fn(() => mockWebPubSubGroup),
};

// Mock dependencies - use class syntax for proper constructor mocking
vi.mock('@azure/web-pubsub', () => ({
  WebPubSubServiceClient: class {
    constructor() {
      return mockWebPubSubClient;
    }
  },
}));

vi.mock('@msgpack/msgpack', () => ({
  encode: vi.fn((data) => Buffer.from(JSON.stringify(data))),
}));

import { 
  shouldBroadcastPriceUpdate,
  broadcastPriceUpdate,
  addToTickerGroup,
  removeFromTickerGroup,
  resetSignalRClient,
  PriceUpdateBroadcast,
} from './signalr-broadcast';

describe('SignalR Broadcast Service', () => {
  let mockContext: InvocationContext;

  beforeEach(() => {
    vi.clearAllMocks();
    resetSignalRClient(); // Reset singleton before each test
    
    mockContext = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    } as unknown as InvocationContext;

    // Set environment variable for tests
    process.env.AZURE_SIGNALR_CONNECTION_STRING = 
      'Endpoint=http://localhost;Port=8999;AccessKey=TESTKEY;Version=1.0;';
  });

  afterEach(() => {
    // Reset mocks after each test
    mockWebPubSubClient.group.mockClear();
    mockWebPubSubGroup.sendToAll.mockClear();
    mockWebPubSubGroup.addConnection.mockClear();
    mockWebPubSubGroup.removeConnection.mockClear();
  });

  describe('shouldBroadcastPriceUpdate (Deadband Filtering)', () => {
    it('should return true when price change is >= $0.01', () => {
      expect(shouldBroadcastPriceUpdate(100.00, 100.01)).toBe(true);
      expect(shouldBroadcastPriceUpdate(100.00, 99.99)).toBe(true);
      expect(shouldBroadcastPriceUpdate(50.50, 50.52)).toBe(true);
      expect(shouldBroadcastPriceUpdate(50.50, 50.48)).toBe(true);
    });

    it('should return false when price change is < $0.01', () => {
      expect(shouldBroadcastPriceUpdate(100.00, 100.009)).toBe(false);
      expect(shouldBroadcastPriceUpdate(100.00, 99.991)).toBe(false);
      expect(shouldBroadcastPriceUpdate(50.50, 50.509)).toBe(false);
      expect(shouldBroadcastPriceUpdate(50.50, 50.491)).toBe(false);
    });

    it('should handle edge case at exact threshold', () => {
      expect(shouldBroadcastPriceUpdate(100.00, 100.010)).toBe(true);
      expect(shouldBroadcastPriceUpdate(100.00, 99.990)).toBe(true);
    });

    it('should use absolute value for comparison', () => {
      // Both positive and negative changes should be treated equally
      expect(shouldBroadcastPriceUpdate(100.00, 100.02)).toBe(true);
      expect(shouldBroadcastPriceUpdate(100.00, 99.98)).toBe(true);
    });
  });

  describe('broadcastPriceUpdate', () => {
    const mockPriceUpdate: PriceUpdateBroadcast = {
      exchangeId: 'exchange-123',
      symbol: 'AAPL',
      price: 150.50,
      change: 0.50,
      changePercent: 0.33,
      volume: 1000000,
      timestamp: '2026-01-20T00:00:00Z',
    };

    it('should broadcast price update when change exceeds deadband', async () => {
      await broadcastPriceUpdate(mockPriceUpdate, 150.00, mockContext);

      expect(mockWebPubSubClient.group).toHaveBeenCalledWith('ticker:exchange-123');
      expect(mockWebPubSubGroup.sendToAll).toHaveBeenCalledWith(expect.any(Buffer));
      expect(mockContext.log).toHaveBeenCalledWith(
        expect.stringContaining('Broadcast to ticker:exchange-123')
      );
    });

    it('should skip broadcast when change is below deadband', async () => {
      // Price change of 0.005 is below $0.01 threshold
      await broadcastPriceUpdate(mockPriceUpdate, 150.495, mockContext);

      expect(mockWebPubSubGroup.sendToAll).not.toHaveBeenCalled();
      expect(mockContext.log).toHaveBeenCalledWith(
        expect.stringContaining('Deadband filter: skipping AAPL')
      );
    });

    it('should handle broadcast errors gracefully', async () => {
      mockWebPubSubGroup.sendToAll.mockRejectedValueOnce(new Error('Network error'));

      // Should not throw
      await expect(
        broadcastPriceUpdate(mockPriceUpdate, 150.00, mockContext)
      ).resolves.not.toThrow();

      expect(mockContext.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to broadcast price update')
      );
    });

    it('should use MessagePack content type', async () => {
      await broadcastPriceUpdate(mockPriceUpdate, 150.00, mockContext);

      // MessagePack encoded data should be sent as binary
      expect(mockWebPubSubGroup.sendToAll).toHaveBeenCalledWith(expect.any(Buffer));
    });

    it('should broadcast to correct group name format ticker:{ExchangeId}', async () => {
      const priceUpdate = { ...mockPriceUpdate, exchangeId: 'test-exchange-456' };
      await broadcastPriceUpdate(priceUpdate, 150.00, mockContext);

      expect(mockWebPubSubClient.group).toHaveBeenCalledWith('ticker:test-exchange-456');
    });
  });

  describe('Group Management', () => {
    it('should add connection to ticker group', async () => {
      await addToTickerGroup('connection-123', 'exchange-456');

      expect(mockWebPubSubClient.group).toHaveBeenCalledWith('ticker:exchange-456');
      expect(mockWebPubSubGroup.addConnection).toHaveBeenCalledWith('connection-123');
    });

    it('should remove connection from ticker group', async () => {
      await removeFromTickerGroup('connection-123', 'exchange-456');

      expect(mockWebPubSubClient.group).toHaveBeenCalledWith('ticker:exchange-456');
      expect(mockWebPubSubGroup.removeConnection).toHaveBeenCalledWith('connection-123');
    });
  });
});
