import * as sql from 'mssql';
import {
  getSqliteDatabase,
  createRequest,
  setSessionContext as setSqliteSessionContext,
  type SqliteRequest
} from './sqlite-database';

let pool: sql.ConnectionPool | null = null;

/**
 * Check if we should use local development mode (SQLite).
 * Local dev mode must be explicitly enabled via NODE_ENV=development.
 * Missing connection strings in production will fail fast rather than
 * silently falling back to mocks.
 */
function isLocalDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

export async function getConnectionPool(): Promise<sql.ConnectionPool> {
  // In local development, return SQLite-backed adapter
  if (isLocalDevelopment()) {
    // Initialize SQLite database (includes auto-seeding)
    getSqliteDatabase();
    
    // Return adapter that implements the subset of ConnectionPool
    // used by the backend (request/transaction/close)
    const localDevPool = {
      connected: true,
      request(): SqliteRequest {
        return createRequest();
      },
      async transaction(): Promise<sql.Transaction> {
        // SQLite auto-commit mode for local dev (no explicit transactions)
        const tx = {
          async begin(): Promise<void> {
            // No-op: SQLite uses auto-commit in local dev
          },
          async commit(): Promise<void> {
            // No-op: SQLite uses auto-commit in local dev
          },
          async rollback(): Promise<void> {
            // No-op: SQLite uses auto-commit in local dev
          },
          request(): SqliteRequest {
            return createRequest();
          },
        } as unknown as sql.Transaction;
        return tx;
      },
      async close(): Promise<void> {
        // No-op for SQLite-backed local development
      },
    } as unknown as sql.ConnectionPool;
    
    return localDevPool;
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
