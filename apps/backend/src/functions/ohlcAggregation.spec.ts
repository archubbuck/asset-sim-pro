import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before imports
vi.mock('../lib/database');
vi.mock('mssql', () => ({
  default: {},
}));
vi.mock('@azure/functions', () => ({
  Timer: vi.fn(),
  InvocationContext: vi.fn(),
  app: { timer: vi.fn() },
}));

import { Timer, InvocationContext } from '@azure/functions';
import * as database from '../lib/database';
import { ohlcAggregation } from './ohlcAggregation';

describe('ohlcAggregation', () => {
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
        last: '2026-01-20T03:00:00Z',
        next: '2026-01-20T03:01:00Z',
        lastUpdated: '2026-01-20T03:00:00Z',
      },
    } as Timer;

    // Mock SQL connection pool
    mockConnectionPool = {
      request: vi.fn().mockReturnThis(),
      execute: vi.fn(),
    };

    vi.mocked(database.getConnectionPool).mockResolvedValue(mockConnectionPool);
  });

  it('should successfully aggregate OHLC data', async () => {
    // Mock successful aggregation returning 10 rows
    mockConnectionPool.execute.mockResolvedValue({
      returnValue: 10,
      recordset: [],
    });

    await ohlcAggregation(mockTimer, mockContext);

    expect(database.getConnectionPool).toHaveBeenCalledTimes(1);
    expect(mockConnectionPool.request).toHaveBeenCalledTimes(1);
    expect(mockConnectionPool.execute).toHaveBeenCalledWith('[Trade].[sp_AggregateOHLC_1M]');
    expect(mockContext.log).toHaveBeenCalledWith(
      expect.stringContaining('OHLC aggregation executed at')
    );
    expect(mockContext.log).toHaveBeenCalledWith(
      'Successfully aggregated 10 1-minute OHLC candles'
    );
  });

  it('should handle case when no new data to aggregate', async () => {
    // Mock aggregation with no new rows
    mockConnectionPool.execute.mockResolvedValue({
      returnValue: 0,
      recordset: [],
    });

    await ohlcAggregation(mockTimer, mockContext);

    expect(mockContext.log).toHaveBeenCalledWith('No new data to aggregate');
  });

  it('should throw error and log when aggregation fails', async () => {
    const testError = new Error('Database connection failed');
    mockConnectionPool.execute.mockRejectedValue(testError);

    await expect(ohlcAggregation(mockTimer, mockContext)).rejects.toThrow(
      'Database connection failed'
    );

    expect(mockContext.error).toHaveBeenCalledWith(
      'Error during OHLC aggregation:',
      testError
    );
  });

  it('should handle undefined returnValue gracefully', async () => {
    // Mock aggregation with undefined returnValue
    mockConnectionPool.execute.mockResolvedValue({
      returnValue: undefined,
      recordset: [],
    });

    await ohlcAggregation(mockTimer, mockContext);

    expect(mockContext.log).toHaveBeenCalledWith('No new data to aggregate');
  });
});
