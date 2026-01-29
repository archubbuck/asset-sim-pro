import { app, InvocationContext, Timer } from '@azure/functions';
import * as sql from 'mssql';
import Decimal from 'decimal.js';
import { MarketTickSchema, PriceUpdateEventSchema } from '../types/market-engine';
import { getConnectionPool } from '../lib/database';
import { cacheQuote } from '../lib/cache';
import { broadcastPriceUpdate } from '../lib/signalr-broadcast';
import { sendPriceUpdateToEventHub } from '../lib/event-hub';

/**
 * Default starting price for newly simulated symbols when no explicit reference price
 * is available from configuration or the database.
 *
 * Rationale:
 * - 100 is a neutral, round reference level commonly used in financial simulations and
 *   academic literature for synthetic instruments and indices.
 * - It makes percentage-based reasoning straightforward (e.g., a 1% move is +1.00),
 *   which is useful when validating and debugging the market engine.
 *
 * Realism considerations:
 * - For large-cap equities and many ETFs, a price around 100 USD is within a realistic
 *   order of magnitude.
 * - For other asset classes (e.g., BTC at tens of thousands, micro-cap stocks below 5,
 *   some commodities quoted per contract), this is *not* intended to be realistic and
 *   should be overridden via exchange/asset configuration.
 *
 * This constant is therefore a *safety fallback only* and should not be treated as a
 * domain-accurate default for all assets.
 */
const DEFAULT_INITIAL_PRICE = 100;

/**
 * Default per-tick volatility used when an asset/exchange-specific volatility is not
 * configured.
 *
 * Interpretation:
 * - 0.02 represents 2% volatility at the simulation's tick interval (see the timer
 *   schedule below). The actual realized volatility per unit of *wall-clock* time
 *   depends on how often `marketEngineTick` runs.
 *
 * Rationale:
 * - 2% per tick is a conservative, moderately active level suitable for large-cap
 *   equities and liquid ETFs when ticks represent short horizons (seconds to minutes).
 * - It keeps price paths dynamic enough for training execution/risk workflows without
 *   producing extreme, unrealistic swings by default.
 *
 * Realism & asset-class guidance:
 * - Equities / ETFs: 1–3% per simulation step is a typical range for training scenarios.
 * - Crypto: often requires much higher effective volatility (e.g., 5–15% per comparable
 *   step) to be realistic; crypto symbols should therefore override this default.
 * - Commodities / FX: usually less volatile intraday; 0.5–2% per step is more typical,
 *   and production configs should tune per symbol or per exchange.
 *
 * This value is intended as a generic fallback for environments where detailed
 * calibration is not yet available. For high-fidelity simulations, configure
 * symbol-specific volatility parameters instead of relying on this default.
 */
const DEFAULT_VOLATILITY = 0.02;

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

        // Get all active symbols with their latest prices for this exchange
        // Optimized to reduce N+1 query problem by fetching all symbols and prices in one query
        const symbolsResult = await pool.request()
          .input('exchangeId', sql.UniqueIdentifier, exchangeId)
          .query(`
            WITH LatestPrices AS (
              SELECT 
                Symbol,
                Close,
                Volume,
                ROW_NUMBER() OVER (PARTITION BY Symbol ORDER BY Timestamp DESC) as rn
              FROM [Trade].[MarketData]
              WHERE ExchangeId = @exchangeId
            )
            SELECT Symbol, Close, Volume
            FROM LatestPrices
            WHERE rn = 1
          `);

        // 3. Generate price ticks for each symbol
        for (const symbolRow of symbolsResult.recordset) {
          const symbol = symbolRow.Symbol;
          const lastPriceDb = symbolRow.Close || DEFAULT_INITIAL_PRICE;
          const lastVolumeDb = symbolRow.Volume || 0;

          // Use Decimal.js for all financial calculations (ADR-006)
          const lastPrice = new Decimal(lastPriceDb);
          const lastVolume = new Decimal(lastVolumeDb);

          // Generate new price using random walk with volatility
          const volatility = config.Volatility || DEFAULT_VOLATILITY;
          const randomFactor = (Math.random() - 0.5) * 2; // -1 to 1
          const change = new Decimal(randomFactor).times(volatility);
          const newPrice = lastPrice.times(new Decimal(1).plus(change));

          // Generate volume (random around last volume)
          const volumeRandomFactor = (Math.random() - 0.5) * 0.5; // -0.25 to 0.25
          const volumeChange = new Decimal(1).plus(volumeRandomFactor);
          const newVolume = Decimal.max(0, lastVolume.times(volumeChange));

          // Validate tick with Zod schema
          const tickData = {
            exchangeId,
            symbol,
            timestamp,
            open: lastPrice.toNumber(),
            high: Decimal.max(lastPrice, newPrice).toNumber(),
            low: Decimal.min(lastPrice, newPrice).toNumber(),
            close: newPrice.toNumber(),
            volume: Math.round(newVolume.toNumber()),
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
          await matchOrders(pool, exchangeId, symbol, newPrice.toNumber(), context);

          // Validate and log price update event (use Decimal.js for percentage calculations per ADR-006)
          const priceChange = newPrice.minus(lastPrice);
          const changePercent = priceChange.dividedBy(lastPrice).times(100);
          
          const priceUpdateData = {
            exchangeId,
            symbol,
            price: newPrice.toNumber(),
            change: priceChange.toNumber(),
            changePercent: changePercent.toNumber(),
            volume: tickData.volume,
            timestamp,
          };

          const eventValidation = PriceUpdateEventSchema.safeParse(priceUpdateData);
          if (eventValidation.success) {
            context.log(`Price update for ${symbol}: ${newPrice.toFixed(2)} (${priceUpdateData.changePercent.toFixed(2)}%)`);
            
            // Cache the quote in Redis (ADR-008: QUOTE:{EXCHANGE_ID}:{SYMBOL})
            try {
              await cacheQuote(exchangeId, symbol, {
                price: priceUpdateData.price,
                timestamp: priceUpdateData.timestamp,
                volume: priceUpdateData.volume,
                change: priceUpdateData.change,
                changePercent: priceUpdateData.changePercent,
              });
            } catch (cacheError) {
              // Log but don't fail the tick if caching fails
              context.warn(`Failed to cache quote for ${symbol}: ${cacheError}`);
            }

            // ADR-009: Event-Driven Architecture (Targeted Broadcast)
            // 1. Broadcast to SignalR with MessagePack protocol and deadband filtering
            await broadcastPriceUpdate(
              priceUpdateData,
              lastPrice.toNumber(),
              context
            );

            // 2. Send to Event Hubs for downstream audit
            await sendPriceUpdateToEventHub(priceUpdateData, context);
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
 * Match pending orders against current market price with transaction isolation
 */
async function matchOrders(
  pool: sql.ConnectionPool,
  exchangeId: string,
  symbol: string,
  currentPrice: number,
  context: InvocationContext
): Promise<void> {
  const currentPriceDecimal = new Decimal(currentPrice);
  
  // Get all pending orders for this symbol
  // Note: StopTriggered field may not exist in older schemas, using ISNULL for backward compatibility
  const ordersResult = await pool.request()
    .input('exchangeId', sql.UniqueIdentifier, exchangeId)
    .input('symbol', sql.NVarChar, symbol)
    .query(`
      SELECT OrderId, PortfolioId, Side, OrderType, Quantity, Price, StopPrice, FilledQuantity, 
             ISNULL(StopTriggered, 0) as StopTriggered
      FROM [Trade].[Orders]
      WHERE ExchangeId = @exchangeId 
        AND Symbol = @symbol 
        AND Status = 'PENDING'
    `);

  for (const order of ordersResult.recordset) {
    let shouldFill = false;
    let needsStopTriggerUpdate = false;

    // Determine if order should be filled based on type (before starting transaction)
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
      case 'STOP_LIMIT': {
        // Two-step behavior: first trigger stop, then match as LIMIT
        const stopTriggered = order.StopTriggered || 
          (order.Side === 'BUY' && currentPrice >= order.StopPrice) ||
          (order.Side === 'SELL' && currentPrice <= order.StopPrice);

        if (stopTriggered && !order.StopTriggered) {
          needsStopTriggerUpdate = true;
        }

        // Once triggered, behave exactly like a LIMIT order
        if (stopTriggered) {
          shouldFill = (order.Side === 'BUY' && currentPrice <= order.Price) ||
                       (order.Side === 'SELL' && currentPrice >= order.Price);
        }
        break;
      }
    }

    // Only start transaction if we need to update something
    if (!shouldFill && !needsStopTriggerUpdate) {
      continue;
    }

    // Use transaction to ensure atomic order fill + position + cash update
    const transaction = pool.transaction();
    
    try {
      await transaction.begin();
      
      // Update stop trigger if needed
      if (needsStopTriggerUpdate) {
        await transaction.request()
          .input('orderId', sql.UniqueIdentifier, order.OrderId)
          .query(`
            UPDATE [Trade].[Orders]
            SET StopTriggered = 1,
                UpdatedAt = GETUTCDATE()
            WHERE OrderId = @orderId
          `);
      }

      if (shouldFill) {
        // Use Decimal.js for all financial calculations (ADR-006)
        const fillPriceDecimal = order.OrderType === 'MARKET' 
          ? currentPriceDecimal 
          : new Decimal(order.Price || currentPrice);
        
        const orderQuantity = new Decimal(order.Quantity);
        const filledQuantity = new Decimal(order.FilledQuantity || 0);
        const remainingQuantity = orderQuantity.minus(filledQuantity);

        // Calculate position and cash changes using Decimal.js
        const positionMultiplier = order.Side === 'BUY' ? 1 : -1;
        const quantityChange = remainingQuantity.times(positionMultiplier);
        const cashChange = remainingQuantity.times(fillPriceDecimal).times(-1 * positionMultiplier);

        // Validate sufficient cash balance for BUY orders (including MARKET orders)
        if (order.Side === 'BUY') {
          const portfolioResult = await transaction.request()
            .input('portfolioId', sql.UniqueIdentifier, order.PortfolioId)
            .query(`
              SELECT CashBalance
              FROM [Trade].[Portfolios]
              WHERE PortfolioId = @portfolioId
            `);
          
          const currentCashBalance = new Decimal(portfolioResult.recordset[0]?.CashBalance || 0);
          const requiredCash = remainingQuantity.times(fillPriceDecimal);
          
          if (currentCashBalance.lessThan(requiredCash)) {
            context.log(`Order ${order.OrderId} skipped - insufficient funds. Required: ${requiredCash.toFixed(2)}, Available: ${currentCashBalance.toFixed(2)}`);
            await transaction.rollback();
            continue;
          }
        }

        // Update order to filled
        await transaction.request()
          .input('orderId', sql.UniqueIdentifier, order.OrderId)
          .input('filledQuantity', sql.Decimal(18, 8), orderQuantity.toNumber())
          .input('averagePrice', sql.Decimal(18, 8), fillPriceDecimal.toNumber())
          .input('status', sql.NVarChar, 'FILLED')
          .query(`
            UPDATE [Trade].[Orders]
            SET FilledQuantity = @filledQuantity,
                AveragePrice = @averagePrice,
                Status = @status,
                UpdatedAt = GETUTCDATE()
            WHERE OrderId = @orderId
          `);

        // Update portfolio position with proper handling for position reversals
        await transaction.request()
          .input('portfolioId', sql.UniqueIdentifier, order.PortfolioId)
          .input('symbol', sql.NVarChar, symbol)
          .input('quantityChange', sql.Decimal(18, 8), quantityChange.toNumber())
          .input('avgPrice', sql.Decimal(18, 8), fillPriceDecimal.toNumber())
          .query(`
            MERGE [Trade].[Positions] AS target
            USING (SELECT @portfolioId AS PortfolioId, @symbol AS Symbol) AS source
            ON target.PortfolioId = source.PortfolioId AND target.Symbol = source.Symbol
            WHEN MATCHED THEN
              UPDATE SET 
                Quantity = Quantity + @quantityChange,
                AveragePrice = CASE 
                  -- Position fully closed: reset average price to 0
                  WHEN (Quantity + @quantityChange) = 0 THEN 0
                  -- Position direction changes: Detect sign change explicitly using SIGN()
                  -- If Quantity > 0 and (Quantity + @quantityChange) < 0, signs differ (long to short)
                  -- If Quantity < 0 and (Quantity + @quantityChange) > 0, signs differ (short to long)
                  -- Start new average at current trade price when crossing zero, but not on full closeout
                  -- Using SIGN() is more robust than multiplication for edge cases near zero
                  WHEN SIGN(Quantity) <> SIGN(Quantity + @quantityChange)
                       AND (Quantity + @quantityChange) <> 0 THEN @avgPrice
                  -- Scaling into existing position on same side: weighted average
                  ELSE (AveragePrice * Quantity + @avgPrice * @quantityChange) / (Quantity + @quantityChange)
                END,
                UpdatedAt = GETUTCDATE()
            WHEN NOT MATCHED THEN
              INSERT (PortfolioId, Symbol, Quantity, AveragePrice)
              VALUES (@portfolioId, @symbol, @quantityChange, @avgPrice);
          `);

        // Update portfolio cash balance
        await transaction.request()
          .input('portfolioId', sql.UniqueIdentifier, order.PortfolioId)
          .input('cashChange', sql.Decimal(18, 8), cashChange.toNumber())
          .query(`
            UPDATE [Trade].[Portfolios]
            SET CashBalance = CashBalance + @cashChange,
                UpdatedAt = GETUTCDATE()
            WHERE PortfolioId = @portfolioId
          `);

        context.log(`Order ${order.OrderId} filled at ${fillPriceDecimal.toFixed(2)} for ${symbol}`);
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      context.error(`Error matching order ${order.OrderId}:`, error);
      // Continue processing other orders
    }
  }
}

// Timer trigger: runs every 5 seconds
app.timer('marketEngineTick', {
  schedule: '*/5 * * * * *', // Every 5 seconds (CRON format)
  handler: marketEngineTick,
});
