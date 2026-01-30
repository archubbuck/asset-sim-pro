import * as sql from 'mssql';
import {
  getSqliteDatabase,
  createRequest as createSqliteRequest,
  setSessionContext as setSqliteSessionContext,
  type SqliteRequest
} from './sqlite-database';

let pool: sql.ConnectionPool | null = null;

/**
 * Check if we should use local development mode (SQLite)
 */
function isLocalDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || !process.env.SQL_CONNECTION_STRING;
}

export async function getConnectionPool(): Promise<sql.ConnectionPool> {
  // In local development, we don't use SQL Server connection pool
  if (isLocalDevelopment()) {
    // Initialize SQLite database
    getSqliteDatabase();
    // Return a dummy pool object (not actually used)
    return {} as sql.ConnectionPool;
  }

  if (pool && pool.connected) {
    return pool;
  }

  // Use connection string from environment
  const connectionString = process.env.SQL_CONNECTION_STRING || '';

  if (!connectionString) {
    throw new Error('SQL_CONNECTION_STRING environment variable is required');
  }

  try {
    pool = await sql.connect(connectionString);
    return pool;
  } catch (err: unknown) {
    // Log detailed information to help diagnose connection issues (e.g. private endpoint/network problems)
    const error = err as Error & { code?: unknown };
    console.error('Failed to initialize SQL connection pool.', {
      message: error.message,
      code: error.code,
    });
    throw err;
  }
}

export async function setSessionContext(
  request: sql.Request | SqliteRequest,
  userId: string,
  exchangeId: string,
  isSuperAdmin: boolean = false
): Promise<void> {
  // In local development, use SQLite session context (no-op)
  if (isLocalDevelopment()) {
    await setSqliteSessionContext(request as SqliteRequest, userId, exchangeId, isSuperAdmin);
    return;
  }

  // Set SESSION_CONTEXT for Row-Level Security
  // Using parameterized approach to prevent SQL injection
  await (request as sql.Request)
    .input('userId', sql.UniqueIdentifier, userId)
    .input('exchangeId', sql.UniqueIdentifier, exchangeId)
    .input('isSuperAdmin', sql.Bit, isSuperAdmin ? 1 : 0)
    .query(`
      EXEC sp_set_session_context @key = N'UserId', @value = @userId;
      EXEC sp_set_session_context @key = N'ExchangeId', @value = @exchangeId;
      EXEC sp_set_session_context @key = N'IsSuperAdmin', @value = @isSuperAdmin;
    `);
}
