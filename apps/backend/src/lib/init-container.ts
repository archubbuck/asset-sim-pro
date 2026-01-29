/**
 * Container Initialization Script (Development Only)
 * 
 * This script runs during container startup in development mode to ensure
 * the database schema is created and seeded with test data. It is idempotent
 * and safe to run multiple times.
 * 
 * IMPORTANT: This script should ONLY run in development environments.
 * Production databases are managed via CI/CD pipeline migrations.
 * 
 * Environment Variables:
 * - RUN_DB_INIT: Set to 'true' to enable initialization
 * - SQL_CONNECTION_STRING: Database connection string
 * 
 * Usage:
 * - Development: Automatically runs via Dockerfile.dev
 * - Production: Skipped (RUN_DB_INIT not set)
 */

import * as sql from 'mssql';
import * as fs from 'fs';
import * as path from 'path';

// Check if initialization should run
const shouldRun = process.env.RUN_DB_INIT === 'true';

if (!shouldRun) {
  console.log('[init-container] RUN_DB_INIT not set to true, skipping database initialization');
  process.exit(0);
}

console.log('[init-container] Starting database initialization...');

const connectionString = process.env.SQL_CONNECTION_STRING;

if (!connectionString) {
  console.error('[init-container] ERROR: SQL_CONNECTION_STRING environment variable not set');
  process.exit(1);
}

async function waitForDatabase(maxRetries = 30, delayMs = 2000): Promise<void> {
  console.log('[init-container] Waiting for SQL Server to be ready...');
  
  for (let i = 1; i <= maxRetries; i++) {
    try {
      const pool = await sql.connect(connectionString);
      await pool.request().query('SELECT 1');
      await pool.close();
      console.log('[init-container] SQL Server is ready!');
      return;
    } catch (error) {
      console.log(`[init-container] Attempt ${i}/${maxRetries}: SQL Server not ready yet...`);
      if (i === maxRetries) {
        throw new Error('Failed to connect to SQL Server after maximum retries');
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

async function initializeDatabase(): Promise<void> {
  let pool: sql.ConnectionPool | null = null;

  try {
    // Connect to SQL Server
    pool = await sql.connect(connectionString);
    console.log('[init-container] Connected to SQL Server');

    // Read schema SQL file
    const schemaPath = path.join(__dirname, '../../../database/schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      console.warn(`[init-container] WARNING: Schema file not found at ${schemaPath}`);
      console.warn('[init-container] Skipping schema initialization');
      return;
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    
    // Split SQL statements by GO separator (SQL Server batch separator)
    const statements = schemaSql
      .split(/^\s*GO\s*$/gim)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`[init-container] Executing ${statements.length} SQL statements...`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      try {
        await pool.request().query(statements[i]);
        console.log(`[init-container] Statement ${i + 1}/${statements.length} executed successfully`);
      } catch (error: any) {
        // Check if error is due to object already existing (idempotency)
        if (error.message.includes('already exists') || error.number === 2714 || error.number === 2759) {
          console.log(`[init-container] Statement ${i + 1}/${statements.length} skipped (object already exists)`);
        } else {
          console.error(`[init-container] ERROR executing statement ${i + 1}:`, error.message);
          throw error;
        }
      }
    }

    console.log('[init-container] Database schema initialization complete!');

    // Optional: Seed data
    await seedDevelopmentData(pool);

  } catch (error: any) {
    console.error('[init-container] ERROR during database initialization:', error.message);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
      console.log('[init-container] Database connection closed');
    }
  }
}

async function seedDevelopmentData(pool: sql.ConnectionPool): Promise<void> {
  console.log('[init-container] Checking for development seed data...');

  // Check if we already have seed data
  const result = await pool.request().query(`
    SELECT COUNT(*) AS count FROM [Trade].[Exchanges]
  `);

  if (result.recordset[0].count > 0) {
    console.log('[init-container] Seed data already exists, skipping');
    return;
  }

  console.log('[init-container] Inserting development seed data...');

  // Create demo exchange
  await pool.request().query(`
    DECLARE @ExchangeId UNIQUEIDENTIFIER = NEWID();
    
    INSERT INTO [Trade].[Exchanges] ([ExchangeId], [Name])
    VALUES (@ExchangeId, 'Demo Development Exchange');
    
    INSERT INTO [Trade].[ExchangeConfigurations] ([ExchangeId], [VolatilityIndex], [StartingCash])
    VALUES (@ExchangeId, 1.5, 10000000.00);
  `);

  // Insert sample instruments
  await pool.request().query(`
    INSERT INTO [Trade].[Instruments] ([Symbol], [CompanyName], [Sector], [BasePrice])
    VALUES 
      ('SPY', 'SPDR S&P 500 ETF Trust', 'ETF', 450.00),
      ('AAPL', 'Apple Inc.', 'Technology', 180.00),
      ('MSFT', 'Microsoft Corporation', 'Technology', 380.00),
      ('TSLA', 'Tesla Inc.', 'Automotive', 250.00),
      ('NVDA', 'NVIDIA Corporation', 'Technology', 500.00);
  `);

  console.log('[init-container] Development seed data inserted successfully');
}

// Main execution
(async () => {
  try {
    await waitForDatabase();
    await initializeDatabase();
    console.log('[init-container] Initialization completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('[init-container] FATAL ERROR:', error.message);
    process.exit(1);
  }
})();
