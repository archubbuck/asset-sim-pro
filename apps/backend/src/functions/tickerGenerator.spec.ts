import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before imports
vi.mock('../lib/database');
vi.mock('../lib/cache');
vi.mock('../lib/signalr-broadcast');
vi.mock('../lib/event-hub');
vi.mock('mssql', () => ({
  default: {},
  UniqueIdentifier: 'uniqueidentifier',
  NVarChar: 'nvarchar',
}));
vi.mock('@azure/functions', () => ({
  Timer: vi.fn(),
  InvocationContext: vi.fn(),
  app: { timer: vi.fn() },
  output: {
    eventHub: vi.fn(),
    signalR: vi.fn(),
  },
}));

import { Timer, InvocationContext } from '@azure/functions';
import * as database from '../lib/database';
import * as cache from '../lib/cache';
import * as signalr from '../lib/signalr-broadcast';
import * as eventHub from '../lib/event-hub';
import { tickerGenerator } from './tickerGenerator';

describe('tickerGenerator', () => {
  let mockContext: InvocationContext;
  let mockTimer: Timer;
  let mockConnectionPool: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock InvocationContext
    mockContext = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    } as unknown as InvocationContext;

    // Mock Timer
    mockTimer = {
      isPastDue: false,
      scheduleStatus: {
        last: '2026-01-20T02:00:00Z',
        next: '2026-01-21T02:00:00Z',
        lastUpdated: '2026-01-20T02:00:00Z',
      },
    } as Timer;

    // Mock SQL connection pool
    mockConnectionPool = {
      request: vi.fn().mockReturnThis(),
      input: vi.fn().mockReturnThis(),
      query: vi.fn(),
    };

    vi.mocked(database.getConnectionPool).mockResolvedValue(mockConnectionPool);
    vi.mocked(cache.getQuote).mockResolvedValue(null);
    vi.mocked(cache.cacheQuote).mockResolvedValue();
    vi.mocked(signalr.broadcastPriceUpdate).mockResolvedValue();
    vi.mocked(eventHub.sendPriceUpdateToEventHub).mockResolvedValue();
  });

  it('should successfully generate price ticks for active exchanges', async () => {
    // Mock Math.random to ensure a significant price change that passes deadband filter
    // Use a high volatility multiplier to ensure change > $0.01
    // randomFactor = 0.3 - 0.5 = -0.2
    // change = 450 * 0.02 * 4.5 * -0.2 = -8.1 (which is definitely > $0.01 threshold)
    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.3);

    const validExchangeId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID v4

    // Mock exchanges query
    mockConnectionPool.query
      .mockResolvedValueOnce({
        recordset: [
          {
            ExchangeId: validExchangeId,
            Name: 'Exchange Alpha',
            VolatilityMultiplier: 4.5, // High volatility to ensure significant change
            MarketEngineEnabled: 1,
          },
        ],
      })
      // Mock symbols query
      .mockResolvedValueOnce({
        recordset: [{ Symbol: 'SPY' }],
      })
      // Mock price query for SPY
      .mockResolvedValueOnce({
        recordset: [{ Close: 450.0 }],
      });

    await tickerGenerator(mockTimer, mockContext);

    expect(database.getConnectionPool).toHaveBeenCalledTimes(1);
    expect(mockContext.log).toHaveBeenCalledWith(
      expect.stringContaining('Ticker Generator executed at')
    );
    expect(mockContext.log).toHaveBeenCalledWith('Processing 1 active exchanges');
    expect(cache.cacheQuote).toHaveBeenCalled();
    expect(signalr.broadcastPriceUpdate).toHaveBeenCalled();
    expect(eventHub.sendPriceUpdateToEventHub).toHaveBeenCalled();
    expect(mockContext.log).toHaveBeenCalledWith(
      expect.stringContaining('Ticker Generator completed successfully')
    );
    
    mockRandom.mockRestore();
  });

  it('should skip exchanges with market engine disabled', async () => {
    const validExchangeId = '550e8400-e29b-41d4-a716-446655440001';
    
    mockConnectionPool.query
      .mockResolvedValueOnce({
        recordset: [
          {
            ExchangeId: validExchangeId,
            Name: 'Exchange Disabled',
            VolatilityMultiplier: 1.0,
            MarketEngineEnabled: 0,
          },
        ],
      })
      .mockResolvedValueOnce({
        recordset: [{ Symbol: 'SPY' }],
      });

    await tickerGenerator(mockTimer, mockContext);

    expect(mockContext.log).toHaveBeenCalledWith(
      `Market engine disabled for exchange ${validExchangeId}`
    );
    expect(cache.cacheQuote).not.toHaveBeenCalled();
    expect(signalr.broadcastPriceUpdate).not.toHaveBeenCalled();
  });

  it('should handle no active exchanges gracefully', async () => {
    mockConnectionPool.query.mockResolvedValueOnce({
      recordset: [],
    });

    await tickerGenerator(mockTimer, mockContext);

    expect(mockContext.log).toHaveBeenCalledWith('No active exchanges found');
    expect(cache.cacheQuote).not.toHaveBeenCalled();
  });

  it('should handle no symbols found', async () => {
    const validExchangeId = '550e8400-e29b-41d4-a716-446655440006';
    
    mockConnectionPool.query
      .mockResolvedValueOnce({
        recordset: [
          {
            ExchangeId: validExchangeId,
            Name: 'Exchange Alpha',
            VolatilityMultiplier: 1.0,
            MarketEngineEnabled: 1,
          },
        ],
      })
      .mockResolvedValueOnce({
        recordset: [],
      });

    await tickerGenerator(mockTimer, mockContext);

    expect(mockContext.log).toHaveBeenCalledWith('No symbols found for tick generation');
  });

  it('should use cached quote when available', async () => {
    const validExchangeId = '550e8400-e29b-41d4-a716-446655440002';
    
    mockConnectionPool.query
      .mockResolvedValueOnce({
        recordset: [
          {
            ExchangeId: validExchangeId,
            Name: 'Exchange Alpha',
            VolatilityMultiplier: 1.0,
            MarketEngineEnabled: 1,
          },
        ],
      })
      .mockResolvedValueOnce({
        recordset: [{ Symbol: 'SPY' }],
      });

    // Mock cached quote
    vi.mocked(cache.getQuote).mockResolvedValueOnce({
      price: 455.0,
      timestamp: '2026-01-21T02:00:00Z',
      change: 5.0,
      changePercent: 1.11,
    });

    await tickerGenerator(mockTimer, mockContext);

    expect(cache.getQuote).toHaveBeenCalledWith(validExchangeId, 'SPY');
    // Should not query database for price since cached quote was available
    expect(mockConnectionPool.query).toHaveBeenCalledTimes(2); // Only exchanges and symbols queries
  });

  it('should apply volatility multiplier to regime physics', async () => {
    const highVolatilityMultiplier = 4.5; // Crisis regime
    const validExchangeId = '550e8400-e29b-41d4-a716-446655440003';
    
    mockConnectionPool.query
      .mockResolvedValueOnce({
        recordset: [
          {
            ExchangeId: validExchangeId,
            Name: 'Exchange Crisis',
            VolatilityMultiplier: highVolatilityMultiplier,
            MarketEngineEnabled: 1,
          },
        ],
      })
      .mockResolvedValueOnce({
        recordset: [{ Symbol: 'BTC' }],
      })
      .mockResolvedValueOnce({
        recordset: [{ Close: 65000.0 }],
      });

    await tickerGenerator(mockTimer, mockContext);

    expect(mockContext.log).toHaveBeenCalledWith(
      expect.stringContaining(`volatility: ${highVolatilityMultiplier}`)
    );
  });

  it('should continue processing after error on individual symbol', async () => {
    const validExchangeId = '550e8400-e29b-41d4-a716-446655440004';
    
    mockConnectionPool.query
      .mockResolvedValueOnce({
        recordset: [
          {
            ExchangeId: validExchangeId,
            Name: 'Exchange Alpha',
            VolatilityMultiplier: 1.0,
            MarketEngineEnabled: 1,
          },
        ],
      })
      .mockResolvedValueOnce({
        recordset: [{ Symbol: 'SPY' }, { Symbol: 'BTC' }],
      })
      // First symbol fails
      .mockRejectedValueOnce(new Error('Database error'))
      // Second symbol succeeds
      .mockResolvedValueOnce({
        recordset: [{ Close: 65000.0 }],
      });

    await tickerGenerator(mockTimer, mockContext);

    expect(mockContext.error).toHaveBeenCalledWith(
      expect.stringContaining('Error generating tick for SPY'),
      expect.any(Error)
    );
    // Should continue and complete successfully
    expect(mockContext.log).toHaveBeenCalledWith(
      expect.stringContaining('Ticker Generator completed successfully')
    );
  });

  it('should throw error on fatal database connection failure', async () => {
    const fatalError = new Error('Database connection failed');
    vi.mocked(database.getConnectionPool).mockRejectedValue(fatalError);

    await expect(tickerGenerator(mockTimer, mockContext)).rejects.toThrow(
      'Database connection failed'
    );

    expect(mockContext.error).toHaveBeenCalledWith(
      'Fatal error in Ticker Generator:',
      fatalError
    );
  });

  it('should handle invalid tick data gracefully', async () => {
    mockConnectionPool.query
      .mockResolvedValueOnce({
        recordset: [
          {
            ExchangeId: 'invalid-uuid',
            Name: 'Invalid Exchange',
            VolatilityMultiplier: 1.0,
            MarketEngineEnabled: 1,
          },
        ],
      })
      .mockResolvedValueOnce({
        recordset: [{ Symbol: 'SPY' }],
      })
      .mockResolvedValueOnce({
        recordset: [{ Close: -100.0 }], // Invalid negative price
      });

    await tickerGenerator(mockTimer, mockContext);

    // Should log error but not throw
    expect(mockContext.log).toHaveBeenCalledWith(
      expect.stringContaining('Ticker Generator completed successfully')
    );
  });

  it('should apply deadband filter and skip insignificant price changes', async () => {
    // Mock Math.random to generate a very small change < $0.01
    // randomFactor = 0.5 - 0.5 = 0
    // change = 450 * 0.01 * 0 = 0 (which is < $0.01 threshold)
    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const validExchangeId = '550e8400-e29b-41d4-a716-446655440005';

    mockConnectionPool.query
      .mockResolvedValueOnce({
        recordset: [
          {
            ExchangeId: validExchangeId,
            Name: 'Exchange Alpha',
            VolatilityMultiplier: 1.0,
            MarketEngineEnabled: 1,
          },
        ],
      })
      .mockResolvedValueOnce({
        recordset: [{ Symbol: 'SPY' }],
      })
      .mockResolvedValueOnce({
        recordset: [{ Close: 450.0 }],
      });

    await tickerGenerator(mockTimer, mockContext);

    expect(mockContext.log).toHaveBeenCalledWith(
      expect.stringContaining(`Deadband filter: skipping SPY on ${validExchangeId}`)
    );
    // Should not cache or broadcast when filtered
    expect(cache.cacheQuote).not.toHaveBeenCalled();
    expect(signalr.broadcastPriceUpdate).not.toHaveBeenCalled();
    expect(eventHub.sendPriceUpdateToEventHub).not.toHaveBeenCalled();
    
    mockRandom.mockRestore();
  });
});
