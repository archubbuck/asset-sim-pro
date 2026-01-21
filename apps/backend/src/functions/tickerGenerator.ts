import { app, InvocationContext, Timer, output } from '@azure/functions';
import * as sql from 'mssql';
import Decimal from 'decimal.js';
import { PriceUpdateEventSchema } from '../types/market-engine';
import { getConnectionPool } from '../lib/database';
import { getQuote, cacheQuote } from '../lib/cache';
import { broadcastPriceUpdate } from '../lib/signalr-broadcast';
import { sendPriceUpdateToEventHub } from '../lib/event-hub';

/**
 * Default base price for symbols when no cached or database price is available
 * Per ADR-016: Use realistic base prices for common asset classes
 */
const DEFAULT_BASE_PRICES: Record<string, number> = {
  SPY: 450,
  BTC: 65000,
  ETH: 3500,
  AAPL: 180,
  GOOGL: 140,
  MSFT: 380,
  TSLA: 250,
  DEFAULT: 100,
};

/**
 * ADR-016: Multi-Exchange Ticker Generator
 * 
 * Background timer trigger that generates price ticks based on exchange volatility settings.
 * Runs every 1 second to create realistic market price movements.
 * 
 * Key Features:
 * - Multi-Exchange: Isolated markets per exchange with independent volatility regimes
 * - Regime Physics: Applies volatilityMultiplier to simulate different market conditions
 * - Deadband Filtering: Ignores price changes < $0.01 to optimize bandwidth/storage
 * - Fan-Out Pattern: Broadcasts to both SignalR (real-time UI) and Event Hub (audit)
 * - Group Targeting: SignalR messages sent to ticker:{ExchangeId} groups
 */
export async function tickerGenerator(
  myTimer: Timer,
  context: InvocationContext
): Promise<void> {
  const timestamp = new Date().toISOString();
  context.log(`Ticker Generator executed at ${timestamp}`);

  try {
    const pool = await getConnectionPool();

    // 1. Get all active exchanges with their volatility configurations
    const exchangesResult = await pool.request().query(`
      SELECT e.ExchangeId, e.Name, 
             ISNULL(ec.Volatility, 0.02) AS VolatilityMultiplier,
             ISNULL(ec.MarketEngineEnabled, 1) AS MarketEngineEnabled
      FROM [Trade].[Exchanges] e
      LEFT JOIN [Trade].[ExchangeConfigurations] ec 
        ON e.ExchangeId = ec.ExchangeId
      WHERE e.IsActive = 1
    `);

    if (exchangesResult.recordset.length === 0) {
      context.log('No active exchanges found');
      return;
    }

    context.log(`Processing ${exchangesResult.recordset.length} active exchanges`);

    // 2. Get all unique symbols across all exchanges
    const symbolsResult = await pool.request().query(`
      SELECT DISTINCT Symbol
      FROM [Trade].[MarketData]
    `);

    const symbols = symbolsResult.recordset.map(row => row.Symbol);
    
    if (symbols.length === 0) {
      context.log('No symbols found for tick generation');
      return;
    }

    // 3. Loop through Exchanges to generate Isolated Markets
    for (const exchange of exchangesResult.recordset) {
      const exchangeId = exchange.ExchangeId;
      const volatilityMultiplier = exchange.VolatilityMultiplier;
      
      if (!exchange.MarketEngineEnabled) {
        context.log(`Market engine disabled for exchange ${exchangeId}`);
        continue;
      }

      context.log(`Generating ticks for exchange: ${exchange.Name} (volatility: ${volatilityMultiplier})`);

      // Process each symbol for this exchange
      for (const symbol of symbols) {
        try {
          // Get current price from cache or database
          let basePrice: number;
          const cachedQuote = await getQuote(exchangeId, symbol);
          
          if (cachedQuote?.price) {
            basePrice = cachedQuote.price;
          } else {
            // Fallback to database
            const priceResult = await pool.request()
              .input('exchangeId', sql.UniqueIdentifier, exchangeId)
              .input('symbol', sql.NVarChar, symbol)
              .query(`
                SELECT TOP 1 Close
                FROM [Trade].[MarketData]
                WHERE ExchangeId = @exchangeId AND Symbol = @symbol
                ORDER BY Timestamp DESC
              `);
            
            basePrice = priceResult.recordset[0]?.Close 
              || DEFAULT_BASE_PRICES[symbol] 
              || DEFAULT_BASE_PRICES.DEFAULT;
          }

          // 4. Apply Regime Physics with volatility multiplier
          // ADR-006: Use Decimal.js for all financial calculations
          const basePriceDecimal = new Decimal(basePrice);
          // Base volatility of 1% per tick (1 second interval)
          // This translates to ~283% annualized volatility at base regime (sqrt(31536000 seconds) * 0.01)
          // Scaled by volatilityMultiplier for different regime conditions:
          // - Normal regime (1.0): ~283% annualized
          // - Crisis regime (4.5): ~1274% annualized
          const volatility = new Decimal(0.01).times(volatilityMultiplier);
          const randomFactor = new Decimal(Math.random() - 0.5); // -0.5 to 0.5
          const change = basePriceDecimal.times(volatility).times(randomFactor);
          
          // 5. DEADBAND FILTER: Ignore noise to save bandwidth/storage
          const DEADBAND_THRESHOLD = new Decimal(0.01);
          if (change.abs().lessThan(DEADBAND_THRESHOLD)) {
            context.log(`Deadband filter: skipping ${symbol} on ${exchangeId} (change < $0.01)`);
            continue;
          }

          const newPrice = basePriceDecimal.plus(change);
          const changePercent = change.dividedBy(basePriceDecimal).times(100);

          // Validate with Zod schema
          const priceUpdateData = {
            exchangeId,
            symbol,
            price: newPrice.toNumber(),
            change: change.toNumber(),
            changePercent: changePercent.toNumber(),
            volume: 0, // Ticker generator focuses on price; volume handled by marketEngineTick
            timestamp,
          };

          const validation = PriceUpdateEventSchema.safeParse(priceUpdateData);
          if (!validation.success) {
            context.error(`Invalid tick data for ${symbol}:`, validation.error);
            continue;
          }

          // Cache the updated quote in Redis
          await cacheQuote(exchangeId, symbol, {
            price: priceUpdateData.price,
            timestamp: priceUpdateData.timestamp,
            change: priceUpdateData.change,
            changePercent: priceUpdateData.changePercent,
          });

          context.log(
            `Price tick: ${symbol} @ ${newPrice.toFixed(2)} (${changePercent.toFixed(2)}%) on ${exchange.Name}`
          );

          // 6. Fan-Out: Broadcast to SignalR (real-time) and Event Hub (audit)
          // SignalR broadcast includes deadband filtering and group targeting
          await broadcastPriceUpdate(
            priceUpdateData,
            basePrice,
            context
          );

          // Event Hub for downstream audit
          await sendPriceUpdateToEventHub(priceUpdateData, context);

        } catch (error) {
          context.error(`Error generating tick for ${symbol} on ${exchangeId}:`, error);
          // Continue processing other symbols
        }
      }
    }

    context.log('Ticker Generator completed successfully');
  } catch (error) {
    context.error('Fatal error in Ticker Generator:', error);
    throw error;
  }
}

// Timer trigger: runs every 1 second (per ADR-016 specification)
app.timer('tickerGenerator', {
  schedule: '*/1 * * * * *', // Every 1 second (CRON format: seconds minutes hours days months weekdays)
  handler: tickerGenerator,
});
