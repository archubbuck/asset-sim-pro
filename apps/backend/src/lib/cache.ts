import Redis from 'ioredis';
import { getMemoryCache } from './memory-cache';

let redisClient: Redis | null = null;
let connecting: Promise<Redis> | null = null;

/**
 * Check if we should use local development mode (in-memory cache)
 */
function isLocalDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || !process.env.REDIS_CONNECTION_STRING;
}

/**
 * Get or create Redis client singleton
 * Uses Azure Cache for Redis connection string from environment
 * In local development, returns a mock client that wraps MemoryCache
 * 
 * ADR-008: Caching Strategy (Updated for Local Development)
 * - Real-Time Quotes: QUOTE:{EXCHANGE_ID}:{SYMBOL}
 * - Exchange Config: CONFIG:{EXCHANGE_ID}
 * - Local development uses in-memory cache instead of Redis
 * 
 * @returns Promise that resolves to Redis client when ready
 */
export async function getRedisClient(): Promise<Redis | ReturnType<typeof getMemoryCache>> {
  // In local development, use in-memory cache
  if (isLocalDevelopment()) {
    return getMemoryCache() as any;
  }

  // Return existing ready client immediately
  if (redisClient && redisClient.status === 'ready') {
    return redisClient;
  }

  const connectionString = process.env.REDIS_CONNECTION_STRING;

  if (!connectionString) {
    throw new Error('REDIS_CONNECTION_STRING environment variable is required');
  }

  // Prevent race condition by using a shared connection promise
  if (!connecting) {
    try {
      connecting = new Promise<Redis>((resolve, reject) => {
        try {
          const client = new Redis(connectionString, {
            enableAutoPipelining: true,
            maxRetriesPerRequest: 3,
            retryStrategy: (times: number) => {
              const delay = Math.min(times * 50, 2000);
              return delay;
            },
          });

          client.on('error', (error) => {
            // Note: Using console.error here is acceptable for utility modules
            // Azure Functions context.error is used in function handlers
            console.error('Redis client error:', error);
          });

          client.on('close', () => {
            console.warn('Redis connection closed');
            redisClient = null;
          });

          client.once('ready', () => {
            redisClient = client;
            connecting = null;
            resolve(client);
          });
        } catch (err) {
          connecting = null;
          reject(err);
        }
      });
    } catch (err: unknown) {
      const error = err as Error & { code?: unknown };
      console.error('Failed to initialize Redis client.', {
        message: error.message,
        code: error.code,
      });
      throw err;
    }
  }

  try {
    return await connecting;
  } catch (err: unknown) {
    connecting = null;
    throw err;
  }
}

/**
 * Cache a real-time quote for a specific exchange and symbol
 * Key Pattern: QUOTE:{EXCHANGE_ID}:{SYMBOL}
 * TTL: 60 seconds (quotes are highly ephemeral)
 */
export async function cacheQuote(
  exchangeId: string,
  symbol: string,
  quoteData: {
    price: number;
    timestamp: string;
    volume?: number;
    change?: number;
    changePercent?: number;
  },
  ttlSeconds: number = 60
): Promise<void> {
  try {
    const client = await getRedisClient();
    const key = `QUOTE:${exchangeId}:${symbol}`;
    
    await client.setex(key, ttlSeconds, JSON.stringify(quoteData));
  } catch (error) {
    const err = error as Error;
    throw new Error(`Failed to cache quote for ${exchangeId}:${symbol}: ${err.message}`);
  }
}

/**
 * Get cached quote for a specific exchange and symbol
 * Returns null if not found or expired
 */
export async function getQuote(
  exchangeId: string,
  symbol: string
): Promise<{
  price: number;
  timestamp: string;
  volume?: number;
  change?: number;
  changePercent?: number;
} | null> {
  try {
    const client = await getRedisClient();
    const key = `QUOTE:${exchangeId}:${symbol}`;
    
    const data = await client.get(key);
    
    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data);
    } catch (error) {
      console.error(`Failed to parse cached quote for ${key}:`, error);
      return null;
    }
  } catch (error) {
    const err = error as Error;
    console.error(`Failed to retrieve quote for ${exchangeId}:${symbol}: ${err.message}`);
    return null;
  }
}

/**
 * Cache exchange configuration
 * Key Pattern: CONFIG:{EXCHANGE_ID}
 * TTL: 300 seconds (5 minutes - configurations change infrequently)
 */
export async function cacheExchangeConfig(
  exchangeId: string,
  config: {
    volatilityIndex?: number;
    startingCash?: number;
    commission?: number;
    allowMargin?: boolean;
    maxPortfolioSize?: number;
    dashboardLayout?: string;
  },
  ttlSeconds: number = 300
): Promise<void> {
  try {
    const client = await getRedisClient();
    const key = `CONFIG:${exchangeId}`;
    
    await client.setex(key, ttlSeconds, JSON.stringify(config));
  } catch (error) {
    const err = error as Error;
    throw new Error(`Failed to cache exchange config for ${exchangeId}: ${err.message}`);
  }
}

/**
 * Get cached exchange configuration
 * Returns null if not found or expired
 */
export async function getExchangeConfig(
  exchangeId: string
): Promise<{
  volatilityIndex?: number;
  startingCash?: number;
  commission?: number;
  allowMargin?: boolean;
  maxPortfolioSize?: number;
  dashboardLayout?: string;
} | null> {
  try {
    const client = await getRedisClient();
    const key = `CONFIG:${exchangeId}`;
    
    const data = await client.get(key);
    
    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data);
    } catch (error) {
      console.error(`Failed to parse cached config for ${key}:`, error);
      return null;
    }
  } catch (error) {
    const err = error as Error;
    console.error(`Failed to retrieve exchange config for ${exchangeId}: ${err.message}`);
    return null;
  }
}

/**
 * Invalidate (delete) cached exchange configuration
 * Use when configuration is updated
 */
export async function invalidateExchangeConfig(exchangeId: string): Promise<void> {
  try {
    const client = await getRedisClient();
    const key = `CONFIG:${exchangeId}`;
    
    await client.del(key);
  } catch (error) {
    const err = error as Error;
    throw new Error(`Failed to invalidate exchange config for ${exchangeId}: ${err.message}`);
  }
}

/**
 * Invalidate all cached quotes for an exchange
 * Use when exchange is paused or reset
 * Uses SCAN with count=1000 for efficient bulk deletion
 */
export async function invalidateExchangeQuotes(exchangeId: string): Promise<void> {
  try {
    const client = await getRedisClient();
    const pattern = `QUOTE:${exchangeId}:*`;
    
    // Use SCAN to avoid blocking (count increased to 1000 for efficiency)
    const stream = client.scanStream({
      match: pattern,
      count: 1000,
    });

    const keys: string[] = [];
    
    for await (const resultKeys of stream) {
      keys.push(...resultKeys);
    }

    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch (error) {
    const err = error as Error;
    throw new Error(`Failed to invalidate quotes for exchange ${exchangeId}: ${err.message}`);
  }
}

/**
 * Close Redis connection gracefully
 * Should be called during application shutdown
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
