import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as sql from 'mssql';
import { setSessionContext } from './database';

// Mock the mssql module
vi.mock('mssql', () => ({
  connect: vi.fn(),
  UniqueIdentifier: 'uniqueidentifier',
  Bit: 'bit',
  NVarChar: 'nvarchar',
}));

describe('database', () => {
  const originalEnv = process.env.SQL_CONNECTION_STRING;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    if (originalEnv) {
      process.env.SQL_CONNECTION_STRING = originalEnv;
    } else {
      delete process.env.SQL_CONNECTION_STRING;
    }
  });

  describe('getConnectionPool', () => {
    it('should throw error when SQL_CONNECTION_STRING is not set', async () => {
      delete process.env.SQL_CONNECTION_STRING;

      // Import fresh to get the error
      const { getConnectionPool } = await import('./database');
      await expect(getConnectionPool()).rejects.toThrow(
        'SQL_CONNECTION_STRING environment variable is required'
      );
    });

    it('should create and return a new connection pool', async () => {
      process.env.SQL_CONNECTION_STRING = 'Server=localhost;Database=test;';
      
      const mockPool = {
        connected: true,
      } as any;
      
      const connectMock = vi.mocked(sql.connect);
      connectMock.mockResolvedValue(mockPool);

      const { getConnectionPool } = await import('./database');
      const pool = await getConnectionPool();

      expect(connectMock).toHaveBeenCalledWith('Server=localhost;Database=test;');
      expect(pool).toBe(mockPool);
    });

    it('should return existing pool if already connected', async () => {
      process.env.SQL_CONNECTION_STRING = 'Server=localhost;Database=test;';
      
      const mockPool = {
        connected: true,
      } as any;
      
      const connectMock = vi.mocked(sql.connect);
      connectMock.mockResolvedValue(mockPool);

      const { getConnectionPool } = await import('./database');
      const pool1 = await getConnectionPool();
      const pool2 = await getConnectionPool();

      // Connect should only be called once since pool is reused
      expect(connectMock).toHaveBeenCalledTimes(1);
      expect(pool1).toBe(pool2);
    });

    it('should handle connection errors and log details', async () => {
      process.env.SQL_CONNECTION_STRING = 'Server=localhost;Database=test;';
      
      const mockError = new Error('Connection failed');
      (mockError as Error & { code?: string }).code = 'ECONNREFUSED';
      
      const connectMock = vi.mocked(sql.connect);
      connectMock.mockRejectedValue(mockError);
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { getConnectionPool } = await import('./database');
      
      await expect(getConnectionPool()).rejects.toThrow('Connection failed');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to initialize SQL connection pool.',
        {
          message: 'Connection failed',
          code: 'ECONNREFUSED',
        }
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('setSessionContext', () => {
    it('should set session context for RLS', async () => {
      const mockRequest = {
        input: vi.fn().mockReturnThis(),
        query: vi.fn().mockResolvedValue({}),
      } as unknown as sql.Request;

      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const exchangeId = '987e6543-e21b-12d3-a456-426614174000';

      await setSessionContext(mockRequest, userId, exchangeId, false);

      expect(mockRequest.input).toHaveBeenCalledWith('userId', sql.UniqueIdentifier, userId);
      expect(mockRequest.input).toHaveBeenCalledWith('exchangeId', sql.UniqueIdentifier, exchangeId);
      expect(mockRequest.input).toHaveBeenCalledWith('isSuperAdmin', sql.Bit, 0);
      expect(mockRequest.query).toHaveBeenCalled();
    });

    it('should set super admin flag when specified', async () => {
      const mockRequest = {
        input: vi.fn().mockReturnThis(),
        query: vi.fn().mockResolvedValue({}),
      } as unknown as sql.Request;

      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const exchangeId = '987e6543-e21b-12d3-a456-426614174000';

      await setSessionContext(mockRequest, userId, exchangeId, true);

      expect(mockRequest.input).toHaveBeenCalledWith('isSuperAdmin', sql.Bit, 1);
    });
  });
});
