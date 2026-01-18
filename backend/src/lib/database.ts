import * as sql from 'mssql';

let pool: sql.ConnectionPool | null = null;

export async function getConnectionPool(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) {
    return pool;
  }

  const config: sql.config = {
    server: process.env.SQL_SERVER || '',
    database: process.env.SQL_DATABASE || '',
    authentication: {
      type: 'default',
      options: {
        userName: process.env.SQL_USER || '',
        password: process.env.SQL_PASSWORD || '',
      },
    },
    options: {
      encrypt: true,
      trustServerCertificate: false,
    },
  };

  pool = await sql.connect(config);
  return pool;
}

export async function setSessionContext(
  request: sql.Request,
  userId: string,
  exchangeId: string,
  isSuperAdmin: boolean = false
): Promise<void> {
  // Set SESSION_CONTEXT for Row-Level Security
  await request.query(`
    EXEC sp_set_session_context @key = N'UserId', @value = '${userId}';
    EXEC sp_set_session_context @key = N'ExchangeId', @value = '${exchangeId}';
    EXEC sp_set_session_context @key = N'IsSuperAdmin', @value = ${isSuperAdmin ? 1 : 0};
  `);
}
