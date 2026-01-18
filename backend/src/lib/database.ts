import * as sql from 'mssql';

let pool: sql.ConnectionPool | null = null;

export async function getConnectionPool(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) {
    return pool;
  }

  // Use connection string from environment
  const connectionString = process.env.SQL_CONNECTION_STRING || '';

  if (!connectionString) {
    throw new Error('SQL_CONNECTION_STRING environment variable is required');
  }

  pool = await sql.connect(connectionString);
  return pool;
}

export async function setSessionContext(
  request: sql.Request,
  userId: string,
  exchangeId: string,
  isSuperAdmin: boolean = false
): Promise<void> {
  // Set SESSION_CONTEXT for Row-Level Security
  // Using parameterized approach to prevent SQL injection
  await request
    .input('userId', sql.UniqueIdentifier, userId)
    .input('exchangeId', sql.UniqueIdentifier, exchangeId)
    .input('isSuperAdmin', sql.Bit, isSuperAdmin ? 1 : 0)
    .query(`
      EXEC sp_set_session_context @key = N'UserId', @value = @userId;
      EXEC sp_set_session_context @key = N'ExchangeId', @value = @exchangeId;
      EXEC sp_set_session_context @key = N'IsSuperAdmin', @value = @isSuperAdmin;
    `);
}
