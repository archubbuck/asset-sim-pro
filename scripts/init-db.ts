#!/usr/bin/env ts-node

/**
 * Database Initialization Script
 * 
 * Creates the AssetSimPro database and applies schema.sql
 * Must be run before seed-local.ts
 */

import * as sql from 'mssql';
import * as fs from 'fs';
import * as path from 'path';

async function initDatabase() {
  console.log('🗄️  Initializing database...\n');
  
  // Connection string for master database (to create AssetSimPro database)
  // Fallback value matches .env.local.example for local development only
  const masterConnectionString = 
    'Server=localhost,1433;Database=master;User Id=sa;Password=LocalDevPassword123!;Encrypt=true;TrustServerCertificate=true';
  
  let pool: sql.ConnectionPool | null = null;
  
  try {
    // Connect to master database
    console.log('📊 Connecting to SQL Server master database...');
    pool = await sql.connect(masterConnectionString);
    console.log('✅ Connected\n');
    
    // Check if database exists
    console.log('🔍 Checking if AssetSimPro database exists...');
    const dbCheck = await pool.request().query(`
      SELECT database_id FROM sys.databases WHERE name = 'AssetSimPro'
    `);
    
    if (dbCheck.recordset.length === 0) {
      console.log('📝 Creating AssetSimPro database...');
      await pool.request().query('CREATE DATABASE [AssetSimPro]');
      console.log('✅ Database created\n');
    } else {
      console.log('✅ Database already exists\n');
    }
    
    await pool.close();
    
    // Connect to AssetSimPro database and apply schema
    console.log('📊 Connecting to AssetSimPro database...');
    // Fallback value matches .env.local.example for local development only
    const assetSimProConnectionString = 
      'Server=localhost,1433;Database=AssetSimPro;User Id=sa;Password=LocalDevPassword123!;Encrypt=true;TrustServerCertificate=true';
    
    pool = await sql.connect(assetSimProConnectionString);
    console.log('✅ Connected\n');
    
    // Read schema.sql
    console.log('📄 Reading schema.sql...');
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    console.log('✅ Schema loaded\n');
    
    // Split schema into batches (separated by GO)
    console.log('⚙️  Applying database schema...');
    const batches = schema
      .split(/\nGO\n/gi)
      .map(batch => batch.trim())
      .filter(batch => batch.length > 0);
    
    console.log(`   Processing ${batches.length} batches...`);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      try {
        await pool.request().query(batch);
      } catch (err) {
        // Ignore "already exists" errors during re-initialization
        const error = err as Error & { number?: number };
        if (error.number !== 2714 && // object already exists
            error.number !== 2759 && // schema already exists
            error.number !== 15233 && // security policy already exists
            error.number !== 1913) { // user already exists
          console.error(`\n❌ Error in batch ${i + 1}:`, error.message);
          throw err;
        }
      }
    }
    
    console.log('✅ Schema applied successfully\n');
    
    console.log('🎉 Database initialization completed!\n');
    console.log('You can now run: npm run seed:local\n');
    
  } catch (error) {
    console.error('\n❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// Run initialization
initDatabase().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
