#!/usr/bin/env ts-node

/**
 * ADR-024: Local Data Seeding Script
 * 
 * Populates local Docker environment with:
 * - Demo Exchange (Simulation Venue)
 * - Market Configuration
 * - Sample Instruments (Stocks)
 * - Fake Trade History (MarketData OHLC ticks)
 * - Demo Portfolio
 * - Redis Cache (Exchange Config + Quotes)
 * 
 * Designed for local development; runs idempotently.
 * 
 * Usage:
 *   npm run seed:local
 */

import * as sql from 'mssql';
import Redis from 'ioredis';

// Constants
const DEMO_EXCHANGE_ID = '00000000-0000-0000-0000-000000000001';
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000099';
const DEMO_PORTFOLIO_ID = '00000000-0000-0000-0000-000000000100';

// Sample instruments with realistic base prices
const SAMPLE_INSTRUMENTS = [
  { symbol: 'AAPL', companyName: 'Apple Inc.', sector: 'Technology', basePrice: 175.50 },
  { symbol: 'MSFT', companyName: 'Microsoft Corporation', sector: 'Technology', basePrice: 380.25 },
  { symbol: 'GOOGL', companyName: 'Alphabet Inc.', sector: 'Technology', basePrice: 140.75 },
  { symbol: 'AMZN', companyName: 'Amazon.com Inc.', sector: 'Consumer Cyclical', basePrice: 155.30 },
  { symbol: 'TSLA', companyName: 'Tesla Inc.', sector: 'Automotive', basePrice: 245.80 },
  { symbol: 'META', companyName: 'Meta Platforms Inc.', sector: 'Technology', basePrice: 410.90 },
  { symbol: 'NVDA', companyName: 'NVIDIA Corporation', sector: 'Technology', basePrice: 725.40 },
  { symbol: 'JPM', companyName: 'JPMorgan Chase & Co.', sector: 'Financial Services', basePrice: 165.75 },
  { symbol: 'V', companyName: 'Visa Inc.', sector: 'Financial Services', basePrice: 260.20 },
  { symbol: 'WMT', companyName: 'Walmart Inc.', sector: 'Consumer Defensive', basePrice: 168.50 },
  { symbol: 'PG', companyName: 'Procter & Gamble Co.', sector: 'Consumer Defensive', basePrice: 158.90 },
  { symbol: 'JNJ', companyName: 'Johnson & Johnson', sector: 'Healthcare', basePrice: 162.40 },
  { symbol: 'UNH', companyName: 'UnitedHealth Group Inc.', sector: 'Healthcare', basePrice: 520.30 },
  { symbol: 'XOM', companyName: 'Exxon Mobil Corporation', sector: 'Energy', basePrice: 108.75 },
  { symbol: 'BAC', companyName: 'Bank of America Corp.', sector: 'Financial Services', basePrice: 35.60 },
  { symbol: 'DIS', companyName: 'The Walt Disney Company', sector: 'Communication Services', basePrice: 92.15 },
  { symbol: 'NFLX', companyName: 'Netflix Inc.', sector: 'Communication Services', basePrice: 485.60 },
  { symbol: 'CSCO', companyName: 'Cisco Systems Inc.', sector: 'Technology', basePrice: 52.80 },
  { symbol: 'INTC', companyName: 'Intel Corporation', sector: 'Technology', basePrice: 43.90 },
  { symbol: 'PFE', companyName: 'Pfizer Inc.', sector: 'Healthcare', basePrice: 29.75 },
];

// Market config defaults
const DEFAULT_MARKET_CONFIG = {
  volatilityIndex: 1.0,
  startingCash: 10000000.00,
  commission: 5.00,
  allowMargin: true,
  maxPortfolioSize: 50,
  dashboardLayout: '[]',
};

/**
 * Generate realistic OHLC market data for the past 7 days
 */
function generateMarketData(symbol: string, basePrice: number, days: number = 7): Array<{
  symbol: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}> {
  const data: Array<{
    symbol: string;
    timestamp: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }> = [];
  
  let currentPrice = basePrice;
  const now = new Date();
  
  // Generate data for each day
  for (let day = days; day >= 0; day--) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    date.setHours(9, 30, 0, 0); // Market open
    
    // Generate 390 1-minute candles (6.5 hours * 60 minutes)
    for (let minute = 0; minute < 390; minute++) {
      const timestamp = new Date(date);
      timestamp.setMinutes(timestamp.getMinutes() + minute);
      
      // Random walk with mean reversion
      const volatility = 0.002; // 0.2% per minute
      const drift = (basePrice - currentPrice) * 0.0001; // Mean reversion
      const change = (Math.random() - 0.5) * volatility * currentPrice + drift;
      
      const open = currentPrice;
      const close = currentPrice + change;
      const high = Math.max(open, close) * (1 + Math.random() * 0.001);
      const low = Math.min(open, close) * (1 - Math.random() * 0.001);
      const volume = Math.floor(Math.random() * 1000000) + 100000;
      
      data.push({
        symbol,
        timestamp,
        open: parseFloat(open.toFixed(8)),
        high: parseFloat(high.toFixed(8)),
        low: parseFloat(low.toFixed(8)),
        close: parseFloat(close.toFixed(8)),
        volume,
      });
      
      currentPrice = close;
    }
  }
  
  return data;
}

/**
 * Main seeding function
 */
async function seedLocalEnvironment() {
  console.log('🌱 Starting local data seeding (ADR-024)...\n');
  
  // Get connection strings from environment
  const sqlConnectionString = process.env.SQL_CONNECTION_STRING || 
    'Server=localhost,1433;Database=AssetSimPro;User Id=sa;Password=LocalDevPassword123!;Encrypt=true;TrustServerCertificate=true';
  
  const redisConnectionString = process.env.REDIS_CONNECTION_STRING || 'localhost:6379';
  
  let pool: sql.ConnectionPool | null = null;
  let redis: Redis | null = null;
  
  try {
    // Connect to SQL Server
    console.log('📊 Connecting to SQL Server...');
    pool = await sql.connect(sqlConnectionString);
    console.log('✅ Connected to SQL Server\n');
    
    // Connect to Redis
    console.log('📦 Connecting to Redis...');
    redis = new Redis(redisConnectionString);
    await new Promise((resolve, reject) => {
      redis!.once('ready', resolve);
      redis!.once('error', reject);
    });
    console.log('✅ Connected to Redis\n');
    
    // Begin transaction for idempotent seeding
    const transaction = pool.transaction();
    await transaction.begin();
    
    try {
      // 1. Seed Demo Exchange (idempotent)
      console.log('🏢 Seeding Demo Exchange...');
      const exchangeResult = await transaction.request()
        .input('exchangeId', sql.UniqueIdentifier, DEMO_EXCHANGE_ID)
        .input('name', sql.NVarChar, 'Demo Exchange')
        .input('createdBy', sql.UniqueIdentifier, DEMO_USER_ID)
        .query(`
          MERGE [Trade].[Exchanges] AS target
          USING (SELECT @exchangeId AS ExchangeId) AS source
          ON target.ExchangeId = source.ExchangeId
          WHEN NOT MATCHED THEN
            INSERT ([ExchangeId], [Name], [CreatedBy])
            VALUES (@exchangeId, @name, @createdBy);
        `);
      console.log('✅ Demo Exchange created/verified\n');
      
      // 2. Seed Exchange Configuration (idempotent)
      console.log('⚙️  Seeding Market Configuration...');
      await transaction.request()
        .input('exchangeId', sql.UniqueIdentifier, DEMO_EXCHANGE_ID)
        .input('volatilityIndex', sql.Decimal(5, 2), DEFAULT_MARKET_CONFIG.volatilityIndex)
        .input('startingCash', sql.Money, DEFAULT_MARKET_CONFIG.startingCash)
        .input('commission', sql.Money, DEFAULT_MARKET_CONFIG.commission)
        .input('allowMargin', sql.Bit, DEFAULT_MARKET_CONFIG.allowMargin ? 1 : 0)
        .input('maxPortfolioSize', sql.Int, DEFAULT_MARKET_CONFIG.maxPortfolioSize)
        .input('dashboardLayout', sql.NVarChar, DEFAULT_MARKET_CONFIG.dashboardLayout)
        .query(`
          MERGE [Trade].[ExchangeConfigurations] AS target
          USING (SELECT @exchangeId AS ExchangeId) AS source
          ON target.ExchangeId = source.ExchangeId
          WHEN NOT MATCHED THEN
            INSERT ([ExchangeId], [VolatilityIndex], [StartingCash], [Commission], [AllowMargin], [MaxPortfolioSize], [DashboardLayout])
            VALUES (@exchangeId, @volatilityIndex, @startingCash, @commission, @allowMargin, @maxPortfolioSize, @dashboardLayout)
          WHEN MATCHED THEN
            UPDATE SET 
              [VolatilityIndex] = @volatilityIndex,
              [StartingCash] = @startingCash,
              [Commission] = @commission,
              [AllowMargin] = @allowMargin,
              [MaxPortfolioSize] = @maxPortfolioSize,
              [DashboardLayout] = @dashboardLayout;
        `);
      console.log('✅ Market Configuration created/updated\n');
      
      // 3. Seed Exchange Roles (idempotent)
      console.log('👤 Seeding Demo User Role...');
      await transaction.request()
        .input('exchangeId', sql.UniqueIdentifier, DEMO_EXCHANGE_ID)
        .input('userId', sql.UniqueIdentifier, DEMO_USER_ID)
        .input('role', sql.NVarChar, 'RiskManager')
        .query(`
          MERGE [Trade].[ExchangeRoles] AS target
          USING (SELECT @exchangeId AS ExchangeId, @userId AS UserId, @role AS Role) AS source
          ON target.ExchangeId = source.ExchangeId 
            AND target.UserId = source.UserId 
            AND target.Role = source.Role
          WHEN NOT MATCHED THEN
            INSERT ([ExchangeId], [UserId], [Role])
            VALUES (@exchangeId, @userId, @role);
        `);
      console.log('✅ Demo User Role assigned\n');
      
      // 4. Seed Instruments (idempotent)
      console.log('📈 Seeding Sample Instruments...');
      for (const instrument of SAMPLE_INSTRUMENTS) {
        await transaction.request()
          .input('symbol', sql.NVarChar, instrument.symbol)
          .input('companyName', sql.NVarChar, instrument.companyName)
          .input('sector', sql.NVarChar, instrument.sector)
          .input('basePrice', sql.Decimal(18, 2), instrument.basePrice)
          .query(`
            MERGE [Trade].[Instruments] AS target
            USING (SELECT @symbol AS Symbol) AS source
            ON target.Symbol = source.Symbol
            WHEN NOT MATCHED THEN
              INSERT ([Symbol], [CompanyName], [Sector], [BasePrice])
              VALUES (@symbol, @companyName, @sector, @basePrice)
            WHEN MATCHED THEN
              UPDATE SET 
                [CompanyName] = @companyName,
                [Sector] = @sector,
                [BasePrice] = @basePrice;
          `);
      }
      console.log(`✅ ${SAMPLE_INSTRUMENTS.length} instruments seeded\n`);
      
      // 5. Seed Demo Portfolio (idempotent)
      console.log('💼 Seeding Demo Portfolio...');
      await transaction.request()
        .input('portfolioId', sql.UniqueIdentifier, DEMO_PORTFOLIO_ID)
        .input('exchangeId', sql.UniqueIdentifier, DEMO_EXCHANGE_ID)
        .input('userId', sql.UniqueIdentifier, DEMO_USER_ID)
        .input('cashBalance', sql.Money, DEFAULT_MARKET_CONFIG.startingCash)
        .query(`
          MERGE [Trade].[Portfolios] AS target
          USING (SELECT @portfolioId AS PortfolioId) AS source
          ON target.PortfolioId = source.PortfolioId
          WHEN NOT MATCHED THEN
            INSERT ([PortfolioId], [ExchangeId], [UserId], [CashBalance])
            VALUES (@portfolioId, @exchangeId, @userId, @cashBalance);
        `);
      console.log('✅ Demo Portfolio created/verified\n');
      
      // 6. Seed Market Data (historical OHLC)
      console.log('📊 Seeding Historical Market Data (this may take a minute)...');
      
      // Clear existing market data for demo exchange to ensure clean re-seeding
      await transaction.request()
        .input('exchangeId', sql.UniqueIdentifier, DEMO_EXCHANGE_ID)
        .query(`
          DELETE FROM [Trade].[MarketData] WHERE [ExchangeId] = @exchangeId;
          DELETE FROM [Trade].[OHLC_1M] WHERE [ExchangeId] = @exchangeId;
        `);
      
      let totalTicks = 0;
      for (const instrument of SAMPLE_INSTRUMENTS) {
        const marketData = generateMarketData(instrument.symbol, instrument.basePrice);
        
        // Batch insert for performance
        const table = new sql.Table('[Trade].[MarketData]');
        table.columns.add('ExchangeId', sql.UniqueIdentifier);
        table.columns.add('Symbol', sql.NVarChar(10));
        table.columns.add('Timestamp', sql.DateTimeOffset);
        table.columns.add('Open', sql.Decimal(18, 8));
        table.columns.add('High', sql.Decimal(18, 8));
        table.columns.add('Low', sql.Decimal(18, 8));
        table.columns.add('Close', sql.Decimal(18, 8));
        table.columns.add('Volume', sql.BigInt);
        
        for (const tick of marketData) {
          table.rows.add(
            DEMO_EXCHANGE_ID,
            tick.symbol,
            tick.timestamp,
            tick.open,
            tick.high,
            tick.low,
            tick.close,
            tick.volume
          );
        }
        
        const request = transaction.request();
        await request.bulk(table);
        totalTicks += marketData.length;
        
        console.log(`  • ${instrument.symbol}: ${marketData.length} ticks`);
      }
      console.log(`✅ ${totalTicks} total market data ticks seeded\n`);
      
      // Commit transaction
      await transaction.commit();
      console.log('✅ SQL transaction committed\n');
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
    // 7. Cache Exchange Config in Redis
    console.log('📦 Caching Exchange Configuration in Redis...');
    await redis.setex(
      `CONFIG:${DEMO_EXCHANGE_ID}`,
      300, // 5 minutes TTL
      JSON.stringify(DEFAULT_MARKET_CONFIG)
    );
    console.log('✅ Exchange Config cached\n');
    
    // 8. Cache latest quotes in Redis
    console.log('📦 Caching Latest Quotes in Redis...');
    for (const instrument of SAMPLE_INSTRUMENTS) {
      // Get latest price from generated data
      const latestData = (await pool!.request()
        .input('exchangeId', sql.UniqueIdentifier, DEMO_EXCHANGE_ID)
        .input('symbol', sql.NVarChar, instrument.symbol)
        .query(`
          SELECT TOP 1 [Close], [Timestamp], [Volume]
          FROM [Trade].[MarketData]
          WHERE [ExchangeId] = @exchangeId AND [Symbol] = @symbol
          ORDER BY [Timestamp] DESC
        `)).recordset[0];
      
      if (latestData) {
        await redis.setex(
          `QUOTE:${DEMO_EXCHANGE_ID}:${instrument.symbol}`,
          60, // 1 minute TTL
          JSON.stringify({
            price: parseFloat(latestData.Close),
            timestamp: latestData.Timestamp.toISOString(),
            volume: parseInt(latestData.Volume),
          })
        );
      }
    }
    console.log(`✅ ${SAMPLE_INSTRUMENTS.length} quotes cached\n`);
    
    // Success!
    console.log('🎉 Local data seeding completed successfully!\n');
    console.log('📋 Summary:');
    console.log(`   • Exchange ID: ${DEMO_EXCHANGE_ID}`);
    console.log(`   • User ID: ${DEMO_USER_ID}`);
    console.log(`   • Portfolio ID: ${DEMO_PORTFOLIO_ID}`);
    console.log(`   • Instruments: ${SAMPLE_INSTRUMENTS.length}`);
    console.log(`   • Market Data Ticks: ${totalTicks}`);
    console.log(`   • Starting Cash: $${DEFAULT_MARKET_CONFIG.startingCash.toLocaleString()}`);
    console.log('\n✨ Your local environment is ready for development!\n');
    
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    // Cleanup connections
    if (pool) {
      await pool.close();
    }
    if (redis) {
      await redis.quit();
    }
  }
}

// Run seeding
seedLocalEnvironment().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
