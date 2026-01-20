import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getRedisClient,
  cacheQuote,
  getQuote,
  cacheExchangeConfig,
  getExchangeConfig,
  invalidateExchangeConfig,
  invalidateExchangeQuotes,
  closeRedisConnection,
} from './cache';

// Mock ioredis module
const mockRedisInstance = {
  status: 'ready',
  setex: vi.fn().mockResolvedValue('OK'),
  get: vi.fn().mockResolvedValue(null),
  del: vi.fn().mockResolvedValue(1),
  scanStream: vi.fn().mockReturnValue({
    [Symbol.asyncIterator]: async function* () {
      yield ['QUOTE:exchange1:AAPL', 'QUOTE:exchange1:MSFT'];
    },
  }),
  on: vi.fn(),
  once: vi.fn(),
  quit: vi.fn().mockResolvedValue('OK'),
};

vi.mock('ioredis', () => {
  class MockRedis {
    status = mockRedisInstance.status;
    setex = mockRedisInstance.setex;
    get = mockRedisInstance.get;
    del = mockRedisInstance.del;
    scanStream = mockRedisInstance.scanStream;
    on = mockRedisInstance.on;
    once = mockRedisInstance.once;
    quit = mockRedisInstance.quit;

    constructor() {
      // Simulate immediate 'ready' event for tests
      setTimeout(() => {
        const readyCallback = mockRedisInstance.once.mock.calls.find(
          (call) => call[0] === 'ready'
        )?.[1];
        if (readyCallback) {
          readyCallback();
        }
      }, 0);
    }
  }

  return {
    default: MockRedis,
  };
});

describe('cache', () => {
  const originalEnv = process.env.REDIS_CONNECTION_STRING;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.REDIS_CONNECTION_STRING = 'redis://localhost:6379';
    // Reset mock implementation
    mockRedisInstance.get.mockResolvedValue(null);
    mockRedisInstance.setex.mockResolvedValue('OK');
    mockRedisInstance.del.mockResolvedValue(1);
    mockRedisInstance.once.mockImplementation((event, callback) => {
      if (event === 'ready') {
        // Call the callback immediately to simulate ready state
        setTimeout(() => callback(), 0);
      }
    });
  });

  afterEach(() => {
    if (originalEnv) {
      process.env.REDIS_CONNECTION_STRING = originalEnv;
    } else {
      delete process.env.REDIS_CONNECTION_STRING;
    }
  });

  describe('getRedisClient', () => {
    it('should throw error when REDIS_CONNECTION_STRING is not set', async () => {
      delete process.env.REDIS_CONNECTION_STRING;

      await expect(getRedisClient()).rejects.toThrow(
        'REDIS_CONNECTION_STRING environment variable is required'
      );
    });

    it('should create and return a Redis client', async () => {
      process.env.REDIS_CONNECTION_STRING = 'redis://localhost:6379';

      const client = await getRedisClient();

      expect(client).toBeDefined();
      expect(client.status).toBe('ready');
    });

    it('should return existing client if already connected', async () => {
      process.env.REDIS_CONNECTION_STRING = 'redis://localhost:6379';

      const client1 = await getRedisClient();
      const client2 = await getRedisClient();

      expect(client1).toBe(client2);
    });
  });

  describe('cacheQuote', () => {
    it('should cache quote with correct key pattern and TTL', async () => {
      const exchangeId = '123e4567-e89b-12d3-a456-426614174000';
      const symbol = 'AAPL';
      const quoteData = {
        price: 150.25,
        timestamp: '2026-01-19T12:00:00Z',
        volume: 1000000,
        change: 2.5,
        changePercent: 1.69,
      };

      await cacheQuote(exchangeId, symbol, quoteData, 60);

      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        `QUOTE:${exchangeId}:${symbol}`,
        60,
        JSON.stringify(quoteData)
      );
    });

    it('should use default TTL of 60 seconds when not specified', async () => {
      const exchangeId = '123e4567-e89b-12d3-a456-426614174000';
      const symbol = 'MSFT';
      const quoteData = {
        price: 350.75,
        timestamp: '2026-01-19T12:00:00Z',
      };

      await cacheQuote(exchangeId, symbol, quoteData);

      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        `QUOTE:${exchangeId}:${symbol}`,
        60,
        JSON.stringify(quoteData)
      );
    });
  });

  describe('getQuote', () => {
    it('should return cached quote data', async () => {
      const exchangeId = '123e4567-e89b-12d3-a456-426614174000';
      const symbol = 'AAPL';
      const quoteData = {
        price: 150.25,
        timestamp: '2026-01-19T12:00:00Z',
        volume: 1000000,
      };

      mockRedisInstance.get.mockResolvedValue(JSON.stringify(quoteData));

      const result = await getQuote(exchangeId, symbol);

      expect(result).toEqual(quoteData);
      expect(mockRedisInstance.get).toHaveBeenCalledWith(`QUOTE:${exchangeId}:${symbol}`);
    });

    it('should return null when quote not found', async () => {
      mockRedisInstance.get.mockResolvedValue(null);

      const exchangeId = '123e4567-e89b-12d3-a456-426614174000';
      const symbol = 'AAPL';

      const result = await getQuote(exchangeId, symbol);

      expect(result).toBeNull();
    });

    it('should return null and log error for invalid JSON', async () => {
      mockRedisInstance.get.mockResolvedValue('invalid-json');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const exchangeId = '123e4567-e89b-12d3-a456-426614174000';
      const symbol = 'AAPL';

      const result = await getQuote(exchangeId, symbol);

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('cacheExchangeConfig', () => {
    it('should cache exchange config with correct key pattern', async () => {
      const exchangeId = '123e4567-e89b-12d3-a456-426614174000';
      const config = {
        volatilityIndex: 1.5,
        startingCash: 10000000,
        commission: 5.0,
        allowMargin: true,
        maxPortfolioSize: 50,
      };

      await cacheExchangeConfig(exchangeId, config, 300);

      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        `CONFIG:${exchangeId}`,
        300,
        JSON.stringify(config)
      );
    });

    it('should use default TTL of 300 seconds when not specified', async () => {
      const exchangeId = '123e4567-e89b-12d3-a456-426614174000';
      const config = {
        volatilityIndex: 1.0,
      };

      await cacheExchangeConfig(exchangeId, config);

      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        `CONFIG:${exchangeId}`,
        300,
        JSON.stringify(config)
      );
    });
  });

  describe('getExchangeConfig', () => {
    it('should return cached exchange config', async () => {
      const exchangeId = '123e4567-e89b-12d3-a456-426614174000';
      const config = {
        volatilityIndex: 1.5,
        startingCash: 10000000,
      };

      mockRedisInstance.get.mockResolvedValue(JSON.stringify(config));

      const result = await getExchangeConfig(exchangeId);

      expect(result).toEqual(config);
      expect(mockRedisInstance.get).toHaveBeenCalledWith(`CONFIG:${exchangeId}`);
    });

    it('should return null when config not found', async () => {
      mockRedisInstance.get.mockResolvedValue(null);

      const exchangeId = '123e4567-e89b-12d3-a456-426614174000';

      const result = await getExchangeConfig(exchangeId);

      expect(result).toBeNull();
    });
  });

  describe('invalidateExchangeConfig', () => {
    it('should delete cached exchange config', async () => {
      const exchangeId = '123e4567-e89b-12d3-a456-426614174000';

      await invalidateExchangeConfig(exchangeId);

      expect(mockRedisInstance.del).toHaveBeenCalledWith(`CONFIG:${exchangeId}`);
    });
  });

  describe('invalidateExchangeQuotes', () => {
    it('should delete all cached quotes for an exchange', async () => {
      const exchangeId = 'exchange1';

      await invalidateExchangeQuotes(exchangeId);

      expect(mockRedisInstance.del).toHaveBeenCalledWith('QUOTE:exchange1:AAPL', 'QUOTE:exchange1:MSFT');
    });

    it('should handle no matching keys gracefully', async () => {
      // Mock empty scan result
      mockRedisInstance.scanStream.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          // No keys yielded
        },
      });

      const exchangeId = 'exchange1';

      await invalidateExchangeQuotes(exchangeId);

      // del should not be called if no keys found
      expect(mockRedisInstance.del).not.toHaveBeenCalled();
    });
  });

  describe('closeRedisConnection', () => {
    it('should close the Redis connection and reset singleton', async () => {
      // First, initialize a client
      const client = await getRedisClient();
      expect(client).toBeDefined();

      // Close the connection
      await closeRedisConnection();

      // Verify quit was called
      expect(mockRedisInstance.quit).toHaveBeenCalled();
    });

    it('should handle case when no client exists', async () => {
      // Close connection without initializing a client
      await closeRedisConnection();

      // Should not throw and should complete successfully
      expect(mockRedisInstance.quit).not.toHaveBeenCalled();
    });
  });
});
