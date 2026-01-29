/**
 * Shared database connection utilities
 */

import * as sql from 'mssql';

/**
 * Connect to SQL Server with retry logic
 * @param connectionString Connection string to use
 * @param maxAttempts Maximum number of connection attempts (default: 5)
 * @param delayMs Delay between retry attempts in milliseconds (default: 3000)
 * @returns Connected SQL Server connection pool
 * @throws Error if all connection attempts fail
 */
export async function connectWithRetry(
  connectionString: string,
  maxAttempts = 5,
  delayMs = 3000
): Promise<sql.ConnectionPool> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const pool = await sql.connect(connectionString);
      return pool;
    } catch (error) {
      lastError = error as Error;
      
      // If this is the last attempt, throw the error
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      // Otherwise, log and retry
      console.log(`   ⚠️  Connection attempt ${attempt} failed: ${lastError.message}`);
      console.log(`   ⏳ Retrying in ${delayMs / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  // This line is unreachable but TypeScript requires it
  throw lastError || new Error('Failed to connect after all attempts');
}
