import { app, InvocationContext, Timer } from '@azure/functions';
import { getConnectionPool } from '../lib/database';

/**
 * OHLC Aggregation Timer Trigger
 * 
 * ADR-010: Data Retention & Lifecycle Management
 * 
 * Runs every minute to:
 * 1. Aggregate raw tick data from MarketData into 1-minute OHLC candles
 * 2. Store aggregated data in OHLC_1M table (hot path)
 * 
 * Hot Path: Aggregated 1-minute OHLC candles with 7-day retention in SQL
 * Cold Path: Raw data archived to Blob Storage via Event Hubs Capture
 */
export async function ohlcAggregation(
  myTimer: Timer,
  context: InvocationContext
): Promise<void> {
  const timestamp = new Date().toISOString();
  context.log(`OHLC aggregation executed at ${timestamp}`);

  try {
    const pool = await getConnectionPool();

    // Call stored procedure to aggregate raw ticks into 1-minute candles
    const result = await pool.request().execute('[Trade].[sp_AggregateOHLC_1M]');

    const rowsAggregated = result.returnValue || 0;
    
    if (rowsAggregated > 0) {
      context.log(`Successfully aggregated ${rowsAggregated} 1-minute OHLC candles`);
    } else {
      context.log('No new data to aggregate');
    }
  } catch (error) {
    context.error('Error during OHLC aggregation:', error);
    throw error;
  }
}

// Timer trigger: runs every minute
app.timer('ohlcAggregation', {
  schedule: '0 * * * * *', // Every minute at :00 seconds (CRON expression: seconds, minutes, hours, day of month, month, day of week)
  handler: ohlcAggregation,
});
