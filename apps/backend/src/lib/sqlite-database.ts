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
    
    console.log('SqliteDatabase initialized successfully (in-memory mode)');
    
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
 */
function initializeSchema(database: Database.Database): void {
  // Create Exchanges table
  database.exec(`
    CREATE TABLE IF NOT EXISTS Exchanges (
      ExchangeId TEXT PRIMARY KEY,
      Name TEXT NOT NULL,
      OwnerId TEXT NOT NULL,
      CreatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      VolatilityMultiplier REAL DEFAULT 1.0,
      Status TEXT DEFAULT 'ACTIVE',
      StartingCash REAL DEFAULT 100000.0
    );
  `);

  // Create ExchangeRoles table
  database.exec(`
    CREATE TABLE IF NOT EXISTS ExchangeRoles (
      RoleId TEXT PRIMARY KEY,
      ExchangeId TEXT NOT NULL,
      UserId TEXT NOT NULL,
      Role TEXT NOT NULL CHECK(Role IN ('ADMIN', 'TRADER', 'VIEWER')),
      AssignedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (ExchangeId) REFERENCES Exchanges(ExchangeId)
    );
  `);

  // Create Portfolios table
  database.exec(`
    CREATE TABLE IF NOT EXISTS Portfolios (
      PortfolioId TEXT PRIMARY KEY,
      ExchangeId TEXT NOT NULL,
      UserId TEXT NOT NULL,
      CashBalance REAL NOT NULL DEFAULT 100000.0,
      CreatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      UpdatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (ExchangeId) REFERENCES Exchanges(ExchangeId)
    );
  `);

  // Create Positions table
  database.exec(`
    CREATE TABLE IF NOT EXISTS Positions (
      PositionId TEXT PRIMARY KEY,
      PortfolioId TEXT NOT NULL,
      Symbol TEXT NOT NULL,
      Quantity REAL NOT NULL,
      AverageCost REAL NOT NULL,
      CurrentPrice REAL,
      UpdatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (PortfolioId) REFERENCES Portfolios(PortfolioId)
    );
  `);

  // Create Orders table
  database.exec(`
    CREATE TABLE IF NOT EXISTS Orders (
      OrderId TEXT PRIMARY KEY,
      PortfolioId TEXT NOT NULL,
      Symbol TEXT NOT NULL,
      Side TEXT NOT NULL CHECK(Side IN ('BUY', 'SELL', 'SHORT', 'COVER')),
      OrderType TEXT NOT NULL CHECK(OrderType IN ('MARKET', 'LIMIT', 'STOP')),
      Quantity REAL NOT NULL,
      LimitPrice REAL,
      StopPrice REAL,
      Status TEXT NOT NULL CHECK(Status IN ('PENDING', 'FILLED', 'CANCELLED', 'REJECTED')),
      FilledQuantity REAL DEFAULT 0,
      FilledPrice REAL,
      CreatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      UpdatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (PortfolioId) REFERENCES Portfolios(PortfolioId)
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
    
    CREATE INDEX IF NOT EXISTS idx_orders_status 
    ON Orders(Status);
    
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
      
      // Replace SQL Server parameter syntax (@param) with SQLite syntax (?param)
      let sqliteSql = sql;
      const params: any[] = [];
      
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
        sqliteSql = sql.replace(paramRegex, '?');
      }
      
      // Handle session context calls (these are no-ops in local dev)
      if (sqliteSql.includes('sp_set_session_context')) {
        return {
          recordset: [],
          rowsAffected: [0]
        };
      }
      
      try {
        // Check if this is a SELECT query
        const isSelect = sqliteSql.trim().toUpperCase().startsWith('SELECT');
        
        if (isSelect) {
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
      INSERT INTO Exchanges (ExchangeId, Name, OwnerId, VolatilityMultiplier, Status, StartingCash)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(exchangeId, 'Demo Exchange', userId, 1.0, 'ACTIVE', 100000.0);
    
    // Insert sample role
    database.prepare(`
      INSERT INTO ExchangeRoles (RoleId, ExchangeId, UserId, Role)
      VALUES (?, ?, ?, ?)
    `).run('550e8400-e29b-41d4-a716-446655440002', exchangeId, userId, 'ADMIN');
    
    // Insert sample portfolio
    const portfolioId = '550e8400-e29b-41d4-a716-446655440003';
    database.prepare(`
      INSERT INTO Portfolios (PortfolioId, ExchangeId, UserId, CashBalance)
      VALUES (?, ?, ?, ?)
    `).run(portfolioId, exchangeId, userId, 100000.0);
    
    // Insert sample market data
    const symbols = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'GOOGL'];
    const basePrices = [450.00, 380.00, 175.00, 380.00, 140.00];
    
    for (let i = 0; i < symbols.length; i++) {
      database.prepare(`
        INSERT INTO MarketData (MarketDataId, ExchangeId, Symbol, Price, Volume)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        `md-${i}`,
        exchangeId,
        symbols[i],
        basePrices[i],
        1000000
      );
    }
    
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
