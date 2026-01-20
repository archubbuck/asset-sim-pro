import { app, InvocationContext, Timer } from '@azure/functions';
import { getConnectionPool } from '../lib/database';

/**
 * Hot Path Data Cleanup Timer Trigger
 * 
 * ADR-010: Data Retention & Lifecycle Management
 * 
 * Runs daily to clean up aggregated OHLC data older than 7 days
 * 
 * Hot Path Retention: 7 days of 1-minute OHLC candles in SQL
 * Cold Path: Raw data is permanently archived in Blob Storage via Event Hubs Capture
 */
export async function hotPathCleanup(
  myTimer: Timer,
  context: InvocationContext
): Promise<void> {
  const timestamp = new Date().toISOString();
  context.log(`Hot path cleanup executed at ${timestamp}`);

  try {
    const pool = await getConnectionPool();

    // Call stored procedure to delete OHLC_1M data older than 7 days
    const result = await pool.request().execute('[Trade].[sp_CleanupHotPath]');

    const rowsDeleted = result.returnValue || 0;
    
    if (rowsDeleted > 0) {
      context.log(`Successfully deleted ${rowsDeleted} expired OHLC candles (>7 days old)`);
    } else {
      context.log('No expired data found for cleanup');
    }
  } catch (error) {
    context.error('Error during hot path cleanup:', error);
    throw error;
  }
}

// Timer trigger: runs daily at 2:00 AM UTC
app.timer('hotPathCleanup', {
  schedule: '0 0 2 * * *', // Daily at 2:00 AM UTC (CRON format)
  handler: hotPathCleanup,
});
