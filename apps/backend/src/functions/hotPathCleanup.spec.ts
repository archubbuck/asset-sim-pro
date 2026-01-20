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
import { hotPathCleanup } from './hotPathCleanup';

describe('hotPathCleanup', () => {
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
      execute: vi.fn(),
    };

    vi.mocked(database.getConnectionPool).mockResolvedValue(mockConnectionPool);
  });

  it('should successfully clean up expired OHLC data', async () => {
    // Mock successful cleanup returning 50 deleted rows
    mockConnectionPool.execute.mockResolvedValue({
      returnValue: 50,
      recordset: [],
    });

    await hotPathCleanup(mockTimer, mockContext);

    expect(database.getConnectionPool).toHaveBeenCalledTimes(1);
    expect(mockConnectionPool.request).toHaveBeenCalledTimes(1);
    expect(mockConnectionPool.execute).toHaveBeenCalledWith('[Trade].[sp_CleanupHotPath]');
    expect(mockContext.log).toHaveBeenCalledWith(
      expect.stringContaining('Hot path cleanup executed at')
    );
    expect(mockContext.log).toHaveBeenCalledWith(
      'Successfully deleted 50 expired OHLC candles (>7 days old)'
    );
  });

  it('should handle case when no expired data found', async () => {
    // Mock cleanup with no expired rows
    mockConnectionPool.execute.mockResolvedValue({
      returnValue: 0,
      recordset: [],
    });

    await hotPathCleanup(mockTimer, mockContext);

    expect(mockContext.log).toHaveBeenCalledWith('No expired data found for cleanup');
  });

  it('should throw error and log when cleanup fails', async () => {
    const testError = new Error('Database connection failed');
    mockConnectionPool.execute.mockRejectedValue(testError);

    await expect(hotPathCleanup(mockTimer, mockContext)).rejects.toThrow(
      'Database connection failed'
    );

    expect(mockContext.error).toHaveBeenCalledWith(
      'Error during hot path cleanup:',
      testError
    );
  });

  it('should handle undefined returnValue gracefully', async () => {
    // Mock cleanup with undefined returnValue
    mockConnectionPool.execute.mockResolvedValue({
      returnValue: undefined,
      recordset: [],
    });

    await hotPathCleanup(mockTimer, mockContext);

    expect(mockContext.log).toHaveBeenCalledWith('No expired data found for cleanup');
  });
});
