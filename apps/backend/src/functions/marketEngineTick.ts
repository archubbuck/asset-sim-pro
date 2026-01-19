import { app, InvocationContext, Timer } from '@azure/functions';
import * as sql from 'mssql';
import { MarketTickSchema, PriceUpdateEventSchema } from '../types/market-engine';
import { getConnectionPool } from '../lib/database';

// Configuration constants
const DEFAULT_INITIAL_PRICE = 100; // Default starting price for new symbols
const DEFAULT_VOLATILITY = 0.02; // 2% default volatility

/**
 * Market Engine Timer Trigger
 * 
 * Runs every 5 seconds to:
 * 1. Generate market price updates for active exchanges
 * 2. Match pending orders against current market prices
 * 3. Update order statuses and portfolio positions
 * 
 * Implements ADR-007: Market Engine with Timer Triggers and Zod validation
 */
export async function marketEngineTick(
  myTimer: Timer,
  context: InvocationContext
): Promise<void> {
  const timestamp = new Date().toISOString();
  context.log(`Market Engine tick executed at ${timestamp}`);

  try {
    const pool = await getConnectionPool();

    // 1. Get all active exchanges
    const exchangesResult = await pool.request().query(`
      SELECT ExchangeId, Name
      FROM [Trade].[Exchanges]
      WHERE IsActive = 1
    `);

    if (exchangesResult.recordset.length === 0) {
      context.log('No active exchanges found');
      return;
    }

    context.log(`Processing ${exchangesResult.recordset.length} active exchanges`);

    // 2. Process each exchange
    for (const exchange of exchangesResult.recordset) {
      const exchangeId = exchange.ExchangeId;
      
      if (!exchangeId) {
        context.error('Exchange record missing ExchangeId');
        continue;
      }
      
      context.log(`Processing exchange: ${exchange.Name} (${exchangeId})`);

      try {
        // Get exchange configuration
        const configResult = await pool.request()
          .input('exchangeId', sql.UniqueIdentifier, exchangeId)
          .query(`
            SELECT TickIntervalMs, Volatility, MarketEngineEnabled
            FROM [Trade].[ExchangeConfigurations]
            WHERE ExchangeId = @exchangeId
          `);

        if (configResult.recordset.length === 0 || !configResult.recordset[0].MarketEngineEnabled) {
          context.log(`Market engine disabled for exchange ${exchangeId}`);
          continue;
        }

        const config = configResult.recordset[0];

        // Get all active symbols for this exchange
        const symbolsResult = await pool.request()
          .input('exchangeId', sql.UniqueIdentifier, exchangeId)
          .query(`
            SELECT DISTINCT Symbol
            FROM [Trade].[MarketData]
            WHERE ExchangeId = @exchangeId
          `);

        // 3. Generate price ticks for each symbol
        for (const symbolRow of symbolsResult.recordset) {
          const symbol = symbolRow.Symbol;

          // Get last price
          const lastPriceResult = await pool.request()
            .input('exchangeId', sql.UniqueIdentifier, exchangeId)
            .input('symbol', sql.NVarChar, symbol)
            .query(`
              SELECT TOP 1 Close, Volume
              FROM [Trade].[MarketData]
              WHERE ExchangeId = @exchangeId AND Symbol = @symbol
              ORDER BY Timestamp DESC
            `);

          const lastPrice = lastPriceResult.recordset[0]?.Close || DEFAULT_INITIAL_PRICE;
          const lastVolume = lastPriceResult.recordset[0]?.Volume || 0;

          // Generate new price using random walk with volatility
          const volatility = config.Volatility || DEFAULT_VOLATILITY;
          const change = (Math.random() - 0.5) * 2 * volatility;
          const newPrice = lastPrice * (1 + change);

          // Generate volume (random around last volume)
          const volumeChange = (Math.random() - 0.5) * 0.5;
          const newVolume = Math.max(0, lastVolume * (1 + volumeChange));

          // Validate tick with Zod schema
          const tickData = {
            exchangeId,
            symbol,
            timestamp,
            open: lastPrice,
            high: Math.max(lastPrice, newPrice),
            low: Math.min(lastPrice, newPrice),
            close: newPrice,
            volume: Math.round(newVolume),
          };

          const tickValidation = MarketTickSchema.safeParse(tickData);
          if (!tickValidation.success) {
            context.error(`Invalid tick data for ${symbol}:`, tickValidation.error);
            continue;
          }

          // Insert new market tick
          await pool.request()
            .input('exchangeId', sql.UniqueIdentifier, exchangeId)
            .input('symbol', sql.NVarChar, symbol)
            .input('timestamp', sql.DateTime2, timestamp)
            .input('open', sql.Decimal(18, 8), tickData.open)
            .input('high', sql.Decimal(18, 8), tickData.high)
            .input('low', sql.Decimal(18, 8), tickData.low)
            .input('close', sql.Decimal(18, 8), tickData.close)
            .input('volume', sql.BigInt, tickData.volume)
            .query(`
              INSERT INTO [Trade].[MarketData] 
              ([ExchangeId], [Symbol], [Timestamp], [Open], [High], [Low], [Close], [Volume])
              VALUES (@exchangeId, @symbol, @timestamp, @open, @high, @low, @close, @volume)
            `);

          // 4. Match pending orders for this symbol
          await matchOrders(pool, exchangeId, symbol, newPrice, context);

          // Validate and log price update event
          const priceUpdateData = {
            exchangeId,
            symbol,
            price: newPrice,
            change: newPrice - lastPrice,
            changePercent: ((newPrice - lastPrice) / lastPrice) * 100,
            volume: tickData.volume,
            timestamp,
          };

          const eventValidation = PriceUpdateEventSchema.safeParse(priceUpdateData);
          if (eventValidation.success) {
            context.log(`Price update for ${symbol}: ${newPrice.toFixed(2)} (${priceUpdateData.changePercent.toFixed(2)}%)`);
          }
        }

        context.log(`Completed processing exchange ${exchangeId}`);
      } catch (error) {
        context.error(`Error processing exchange ${exchangeId}:`, error);
        // Continue processing other exchanges
      }
    }

    context.log('Market Engine tick completed successfully');
  } catch (error) {
    context.error('Fatal error in Market Engine tick:', error);
    throw error;
  }
}

/**
 * Match pending orders against current market price
 */
async function matchOrders(
  pool: sql.ConnectionPool,
  exchangeId: string,
  symbol: string,
  currentPrice: number,
  context: InvocationContext
): Promise<void> {
  // Get all pending orders for this symbol
  const ordersResult = await pool.request()
    .input('exchangeId', sql.UniqueIdentifier, exchangeId)
    .input('symbol', sql.NVarChar, symbol)
    .query(`
      SELECT OrderId, PortfolioId, Side, OrderType, Quantity, Price, StopPrice, FilledQuantity
      FROM [Trade].[Orders]
      WHERE ExchangeId = @exchangeId 
        AND Symbol = @symbol 
        AND Status = 'PENDING'
    `);

  for (const order of ordersResult.recordset) {
    let shouldFill = false;

    // Determine if order should be filled based on type
    switch (order.OrderType) {
      case 'MARKET':
        shouldFill = true;
        break;
      case 'LIMIT':
        shouldFill = (order.Side === 'BUY' && currentPrice <= order.Price) ||
                     (order.Side === 'SELL' && currentPrice >= order.Price);
        break;
      case 'STOP':
        shouldFill = (order.Side === 'BUY' && currentPrice >= order.StopPrice) ||
                     (order.Side === 'SELL' && currentPrice <= order.StopPrice);
        break;
      case 'STOP_LIMIT':
        // Simplified: trigger if stop price is hit
        shouldFill = (order.Side === 'BUY' && currentPrice >= order.StopPrice && currentPrice <= order.Price) ||
                     (order.Side === 'SELL' && currentPrice <= order.StopPrice && currentPrice >= order.Price);
        break;
    }

    if (shouldFill) {
      const fillPrice = order.OrderType === 'MARKET' ? currentPrice : (order.Price || currentPrice);
      const remainingQuantity = order.Quantity - order.FilledQuantity;

      // Update order to filled
      await pool.request()
        .input('orderId', sql.UniqueIdentifier, order.OrderId)
        .input('filledQuantity', sql.Decimal(18, 8), order.Quantity)
        .input('averagePrice', sql.Decimal(18, 8), fillPrice)
        .input('status', sql.NVarChar, 'FILLED')
        .query(`
          UPDATE [Trade].[Orders]
          SET FilledQuantity = @filledQuantity,
              AveragePrice = @averagePrice,
              Status = @status,
              UpdatedAt = GETUTCDATE()
          WHERE OrderId = @orderId
        `);

      // Update portfolio position
      const positionMultiplier = order.Side === 'BUY' ? 1 : -1;
      const quantityChange = remainingQuantity * positionMultiplier;
      const cashChange = -1 * remainingQuantity * fillPrice * positionMultiplier;

      await pool.request()
        .input('portfolioId', sql.UniqueIdentifier, order.PortfolioId)
        .input('symbol', sql.NVarChar, symbol)
        .input('quantityChange', sql.Decimal(18, 8), quantityChange)
        .input('avgPrice', sql.Decimal(18, 8), fillPrice)
        .query(`
          MERGE [Trade].[Positions] AS target
          USING (SELECT @portfolioId AS PortfolioId, @symbol AS Symbol) AS source
          ON target.PortfolioId = source.PortfolioId AND target.Symbol = source.Symbol
          WHEN MATCHED THEN
            UPDATE SET 
              Quantity = Quantity + @quantityChange,
              AveragePrice = CASE 
                WHEN (Quantity + @quantityChange) = 0 THEN 0
                ELSE (AveragePrice * Quantity + @avgPrice * @quantityChange) / (Quantity + @quantityChange)
              END,
              UpdatedAt = GETUTCDATE()
          WHEN NOT MATCHED THEN
            INSERT (PortfolioId, Symbol, Quantity, AveragePrice)
            VALUES (@portfolioId, @symbol, @quantityChange, @avgPrice);
        `);

      // Update portfolio cash balance
      await pool.request()
        .input('portfolioId', sql.UniqueIdentifier, order.PortfolioId)
        .input('cashChange', sql.Decimal(18, 8), cashChange)
        .query(`
          UPDATE [Trade].[Portfolios]
          SET CashBalance = CashBalance + @cashChange,
              UpdatedAt = GETUTCDATE()
          WHERE PortfolioId = @portfolioId
        `);

      context.log(`Order ${order.OrderId} filled at ${fillPrice} for ${symbol}`);
    }
  }
}

// Timer trigger: runs every 5 seconds
app.timer('marketEngineTick', {
  schedule: '*/5 * * * * *', // Every 5 seconds (CRON format)
  handler: marketEngineTick,
});
