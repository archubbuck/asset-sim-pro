import Database from 'better-sqlite3';
import { InvocationContext } from '@azure/functions';

let db: Database.Database | null = null;

/**
 * SqliteDatabase - In-memory SQLite database for local development
 * 
 * This replaces SQL Server with an in-memory SQLite database for local development.
 * All queries and operations are mocked to work without external dependencies.
 * 
 * ADR-003: Local Development Strategy (Updated)
 * - Developers run services manually without Docker
 * - In-memory database for zero-config local development
 */

/**
 * Get or create in-memory SQLite database
 * Uses :memory: mode for a fresh database on each startup
 */
export function getSqliteDatabase(): Database.Database {
  if (db) {
    return db;
  }

  try {
    // Create in-memory database
    db = new Database(':memory:');
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Initialize schema
    initializeSchema(db);
    
    // Auto-seed with sample data for local development
    seedDatabase();
    
    console.log('SqliteDatabase initialized successfully (in-memory mode with sample data)');
    
    return db;
  } catch (error) {
    const err = error as Error;
    console.error('Failed to initialize SqliteDatabase:', err.message);
    throw err;
  }
}

/**
 * Initialize database schema for local development
 * Creates tables that match the Azure SQL schema structure
 * 
 * Note: SQLite datetime('now') returns UTC timestamps, which differs from
 * SQL Server's GETDATE() that returns local server time. All timestamps in
 * the mock database are stored in UTC for consistency.
 */
function initializeSchema(database: Database.Database): void {
  // Create Exchanges table (matches [Trade].[Exchanges])
  database.exec(`
    CREATE TABLE IF NOT EXISTS Exchanges (
      ExchangeId TEXT PRIMARY KEY,
      Name TEXT NOT NULL,
      CreatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      CreatedBy TEXT NOT NULL
    );
  `);

  // Create ExchangeRoles table (matches [Trade].[ExchangeRoles])
  database.exec(`
    CREATE TABLE IF NOT EXISTS ExchangeRoles (
      ExchangeId TEXT NOT NULL,
      UserId TEXT NOT NULL,
      Role TEXT NOT NULL CHECK(Role IN ('RiskManager', 'PortfolioManager', 'Analyst')),
      AssignedAt TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (ExchangeId, UserId, Role),
      FOREIGN KEY (ExchangeId) REFERENCES Exchanges(ExchangeId)
    );
  `);

  // Create ExchangeConfigurations table
  database.exec(`
    CREATE TABLE IF NOT EXISTS ExchangeConfigurations (
      ExchangeId TEXT PRIMARY KEY,
      VolatilityIndex REAL DEFAULT 1.0,
      StartingCash REAL DEFAULT 10000000.00,
      Commission REAL DEFAULT 5.00,
      AllowMargin INTEGER DEFAULT 1,
      MaxPortfolioSize INTEGER DEFAULT 50,
      DashboardLayout TEXT DEFAULT '[]',
      FOREIGN KEY (ExchangeId) REFERENCES Exchanges(ExchangeId)
    );
  `);

  // Create Instruments table
  database.exec(`
    CREATE TABLE IF NOT EXISTS Instruments (
      Symbol TEXT PRIMARY KEY,
      CompanyName TEXT NOT NULL,
      Sector TEXT,
      BasePrice REAL NOT NULL
    );
  `);

  // Create Portfolios table
  database.exec(`
    CREATE TABLE IF NOT EXISTS Portfolios (
      PortfolioId TEXT PRIMARY KEY,
      ExchangeId TEXT NOT NULL,
      UserId TEXT NOT NULL,
      CashBalance REAL NOT NULL,
      CreatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (ExchangeId) REFERENCES Exchanges(ExchangeId)
    );
  `);

  // Create Positions table
  database.exec(`
    CREATE TABLE IF NOT EXISTS Positions (
      PositionId INTEGER PRIMARY KEY AUTOINCREMENT,
      PortfolioId TEXT NOT NULL,
      Symbol TEXT NOT NULL,
      Quantity REAL NOT NULL,
      AverageCost REAL NOT NULL,
      FOREIGN KEY (PortfolioId) REFERENCES Portfolios(PortfolioId),
      FOREIGN KEY (Symbol) REFERENCES Instruments(Symbol)
    );
  `);

  // Create Orders table (matches [Trade].[Orders] schema)
  database.exec(`
    CREATE TABLE IF NOT EXISTS Orders (
      OrderId TEXT PRIMARY KEY,
      PortfolioId TEXT NOT NULL,
      ExchangeId TEXT NOT NULL,
      Symbol TEXT NOT NULL,
      Side TEXT NOT NULL CHECK(Side IN ('BUY', 'SELL', 'SHORT', 'COVER')),
      Type TEXT NOT NULL CHECK(Type IN ('MARKET', 'LIMIT', 'STOP')),
      Status TEXT NOT NULL DEFAULT 'PENDING',
      Quantity REAL NOT NULL,
      LimitPrice REAL,
      ExecutedPrice REAL,
      Timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (PortfolioId) REFERENCES Portfolios(PortfolioId),
      FOREIGN KEY (ExchangeId) REFERENCES Exchanges(ExchangeId)
    );
  `);

  // Create Transactions table
  database.exec(`
    CREATE TABLE IF NOT EXISTS Transactions (
      TransactionId TEXT PRIMARY KEY,
      OrderId TEXT NOT NULL,
      PortfolioId TEXT NOT NULL,
      Symbol TEXT NOT NULL,
      Side TEXT NOT NULL,
      Quantity REAL NOT NULL,
      Price REAL NOT NULL,
      Commission REAL DEFAULT 0,
      ExecutedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (OrderId) REFERENCES Orders(OrderId),
      FOREIGN KEY (PortfolioId) REFERENCES Portfolios(PortfolioId)
    );
  `);

  // Create MarketData table (for price history)
  database.exec(`
    CREATE TABLE IF NOT EXISTS MarketData (
      MarketDataId TEXT PRIMARY KEY,
      ExchangeId TEXT NOT NULL,
      Symbol TEXT NOT NULL,
      Price REAL NOT NULL,
      Volume REAL,
      Timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (ExchangeId) REFERENCES Exchanges(ExchangeId)
    );
  `);

  // Create indexes for common queries
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_portfolios_exchange 
    ON Portfolios(ExchangeId);
    
    CREATE INDEX IF NOT EXISTS idx_portfolios_user 
    ON Portfolios(UserId);
    
    CREATE INDEX IF NOT EXISTS idx_positions_portfolio 
    ON Positions(PortfolioId);
    
    CREATE INDEX IF NOT EXISTS idx_orders_portfolio 
    ON Orders(PortfolioId);
    
    CREATE INDEX IF NOT EXISTS idx_orders_exchange_status 
    ON Orders(ExchangeId, Status);
    
    CREATE INDEX IF NOT EXISTS idx_marketdata_exchange_symbol 
    ON MarketData(ExchangeId, Symbol);
  `);

  console.log('SqliteDatabase schema initialized');
}

/**
 * Execute a query with parameters (similar to SQL Server Request API)
 * This provides compatibility with existing database code
 */
export interface SqliteRequest {
  input(name: string, type: any, value: any): SqliteRequest;
  query(sql: string): Promise<SqliteResult>;
  execute(procedureName: string): Promise<SqliteResult>;
}

export interface SqliteResult {
  recordset: any[];
  rowsAffected: number[];
}

/**
 * Create a request object that mimics mssql.Request API
 */
export function createRequest(): SqliteRequest {
  const inputs: Map<string, any> = new Map();
  
  return {
    input(name: string, type: any, value: any): SqliteRequest {
      inputs.set(name, value);
      return this;
    },
    
    async query(sql: string): Promise<SqliteResult> {
      const database = getSqliteDatabase();
      
      // Translate SQL Server syntax to SQLite
      let sqliteSql = sql;
      const params: any[] = [];
      
      // Remove [Trade] schema prefix (SQLite doesn't use schemas)
      sqliteSql = sqliteSql.replace(/\[Trade\]\./g, '');
      
      // Remove bracket identifiers [TableName] -> TableName
      sqliteSql = sqliteSql.replace(/\[(\w+)\]/g, '$1');
      
      // Handle OUTPUT INSERTED.* clause (SQL Server specific)
      // Convert: INSERT INTO table OUTPUT INSERTED.* VALUES -> INSERT INTO table VALUES ... RETURNING *
      const outputInsertedMatch = sqliteSql.match(/INSERT INTO (\w+)\s+.*?OUTPUT INSERTED\.\*\s+(VALUES.*)/is);
      if (outputInsertedMatch) {
        const tableName = outputInsertedMatch[1];
        const valuesClause = outputInsertedMatch[2];
        sqliteSql = `INSERT INTO ${tableName} ${valuesClause} RETURNING *`;
      } else {
        // Handle specific column OUTPUT INSERTED
        const outputMatch = sqliteSql.match(/OUTPUT INSERTED\.(\[?\w+\]?(?:,\s*INSERTED\.\[?\w+\]?)*)/i);
        if (outputMatch) {
          const columns = outputMatch[1].replace(/INSERTED\./gi, '').replace(/\[|\]/g, '');
          sqliteSql = sqliteSql.replace(/OUTPUT INSERTED\.\[?\w+\]?(?:,\s*INSERTED\.\[?\w+\]?)*/i, '');
          sqliteSql = sqliteSql.trim();
          if (!sqliteSql.toUpperCase().includes('RETURNING')) {
            sqliteSql += ` RETURNING ${columns}`;
          }
        }
      }
      
      // Extract parameters in order they appear
      const paramRegex = /@(\w+)/g;
      const matches = sql.match(paramRegex);
      
      if (matches) {
        for (const match of matches) {
          const paramName = match.substring(1); // Remove @
          const value = inputs.get(paramName);
          params.push(value);
        }
        
        // Replace @param with ?
        sqliteSql = sqliteSql.replace(paramRegex, '?');
      }
      
      // Handle session context calls (these are no-ops in local dev)
      if (sqliteSql.includes('sp_set_session_context')) {
        return {
          recordset: [],
          rowsAffected: [0]
        };
      }
      
      // Handle stored procedure calls (not supported in SQLite)
      if (sqliteSql.includes('EXEC ') || sqliteSql.includes('EXECUTE ')) {
        console.warn('Stored procedure calls not supported in SQLite local dev:', sqliteSql);
        return {
          recordset: [],
          rowsAffected: [0]
        };
      }
      
      // Handle MERGE statements (convert to INSERT OR REPLACE for simple cases)
      if (sqliteSql.toUpperCase().includes('MERGE ')) {
        console.warn('MERGE statements translated to INSERT OR REPLACE in SQLite local dev');
        // This is a simplified translation - may need enhancement for complex MERGE logic
        sqliteSql = sqliteSql.replace(/MERGE\s+(\w+)\s+AS\s+target/i, 'INSERT OR REPLACE INTO $1');
        sqliteSql = sqliteSql.replace(/USING\s+\(.*?\)\s+AS\s+source.*?ON.*?WHEN MATCHED THEN UPDATE SET.*?WHEN NOT MATCHED THEN INSERT/is, '');
      }
      
      try {
        // Check if this is a SELECT query or RETURNING clause
        const isSelect = sqliteSql.trim().toUpperCase().startsWith('SELECT') || 
                        sqliteSql.toUpperCase().includes('RETURNING');
        
        if (isSelect || sqliteSql.toUpperCase().includes('RETURNING')) {
          const stmt = database.prepare(sqliteSql);
          const rows = stmt.all(...params);
          return {
            recordset: rows,
            rowsAffected: [rows.length]
          };
        } else {
          const stmt = database.prepare(sqliteSql);
          const result = stmt.run(...params);
          return {
            recordset: [],
            rowsAffected: [result.changes || 0]
          };
        }
      } catch (error) {
        const err = error as Error;
        console.error('SQLite query error:', err.message, 'SQL:', sqliteSql);
        throw err;
      }
    },
    
    async execute(procedureName: string): Promise<SqliteResult> {
      // Stored procedures are not supported in SQLite
      // Log and return empty result for local development
      console.warn(`Stored procedure execution not supported in SQLite local dev: ${procedureName}`);
      return {
        recordset: [],
        rowsAffected: [0]
      };
    }
  };
}

/**
 * Set session context (no-op for local development)
 * In production, this sets Row-Level Security context
 */
export async function setSessionContext(
  request: SqliteRequest,
  userId: string,
  exchangeId: string,
  isSuperAdmin: boolean = false
): Promise<void> {
  // No-op for local development - RLS not enforced in SQLite
  // In production, this would set SESSION_CONTEXT for SQL Server RLS
}

/**
 * Seed the database with sample data for local development
 */
export function seedDatabase(context?: InvocationContext): void {
  const database = getSqliteDatabase();
  
  try {
    // Check if data already exists
    const existingExchanges = database.prepare('SELECT COUNT(*) as count FROM Exchanges').get() as { count: number };
    
    if (existingExchanges.count > 0) {
      console.log('Database already seeded, skipping...');
      return;
    }
    
    // Insert sample exchange
    const exchangeId = '550e8400-e29b-41d4-a716-446655440000';
    const userId = '550e8400-e29b-41d4-a716-446655440001';
    
    database.prepare(`
      INSERT INTO Exchanges (ExchangeId, Name, CreatedBy)
      VALUES (?, ?, ?)
    `).run(exchangeId, 'Demo Exchange', userId);
    
    // Insert sample configuration
    database.prepare(`
      INSERT INTO ExchangeConfigurations (ExchangeId, VolatilityIndex, StartingCash, Commission)
      VALUES (?, ?, ?, ?)
    `).run(exchangeId, 1.0, 10000000.00, 5.00);
    
    // Insert sample role (RiskManager)
    database.prepare(`
      INSERT INTO ExchangeRoles (ExchangeId, UserId, Role)
      VALUES (?, ?, ?)
    `).run(exchangeId, userId, 'RiskManager');
    
    // Insert sample instruments
    const instruments = [
      ['SPY', 'SPDR S&P 500 ETF Trust', 'ETF', 450.00],
      ['QQQ', 'Invesco QQQ Trust', 'ETF', 380.00],
      ['AAPL', 'Apple Inc.', 'Technology', 175.00],
      ['MSFT', 'Microsoft Corporation', 'Technology', 380.00],
      ['GOOGL', 'Alphabet Inc.', 'Technology', 140.00]
    ];
    
    for (const [symbol, name, sector, price] of instruments) {
      database.prepare(`
        INSERT INTO Instruments (Symbol, CompanyName, Sector, BasePrice)
        VALUES (?, ?, ?, ?)
      `).run(symbol, name, sector, price);
    }
    
    // Insert sample portfolio
    const portfolioId = '550e8400-e29b-41d4-a716-446655440003';
    database.prepare(`
      INSERT INTO Portfolios (PortfolioId, ExchangeId, UserId, CashBalance)
      VALUES (?, ?, ?, ?)
    `).run(portfolioId, exchangeId, userId, 10000000.00);
    
    console.log('Database seeded with sample data');
    if (context) {
      context.log('SqliteDatabase seeded with sample data');
    }
  } catch (error) {
    const err = error as Error;
    console.error('Failed to seed database:', err.message);
    throw err;
  }
}

/**
 * Reset database (for testing)
 */
export function resetDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('SqliteDatabase connection closed');
  }
}
