import Redis from 'ioredis';

let redisClient: Redis | null = null;

/**
 * Get or create Redis client singleton
 * Uses Azure Cache for Redis connection string from environment
 * 
 * ADR-008: Caching Strategy
 * - Real-Time Quotes: QUOTE:{EXCHANGE_ID}:{SYMBOL}
 * - Exchange Config: CONFIG:{EXCHANGE_ID}
 */
export function getRedisClient(): Redis {
  if (redisClient && redisClient.status === 'ready') {
    return redisClient;
  }

  const connectionString = process.env.REDIS_CONNECTION_STRING;

  if (!connectionString) {
    throw new Error('REDIS_CONNECTION_STRING environment variable is required');
  }

  try {
    redisClient = new Redis(connectionString, {
      enableAutoPipelining: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisClient.on('error', (error) => {
      console.error('Redis client error:', error);
    });

    return redisClient;
  } catch (err: unknown) {
    const error = err as Error & { code?: unknown };
    console.error('Failed to initialize Redis client.', {
      message: error.message,
      code: error.code,
    });
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
  const client = getRedisClient();
  const key = `QUOTE:${exchangeId}:${symbol}`;
  
  await client.setex(key, ttlSeconds, JSON.stringify(quoteData));
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
  const client = getRedisClient();
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
  const client = getRedisClient();
  const key = `CONFIG:${exchangeId}`;
  
  await client.setex(key, ttlSeconds, JSON.stringify(config));
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
  const client = getRedisClient();
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
}

/**
 * Invalidate (delete) cached exchange configuration
 * Use when configuration is updated
 */
export async function invalidateExchangeConfig(exchangeId: string): Promise<void> {
  const client = getRedisClient();
  const key = `CONFIG:${exchangeId}`;
  
  await client.del(key);
}

/**
 * Invalidate all cached quotes for an exchange
 * Use when exchange is paused or reset
 */
export async function invalidateExchangeQuotes(exchangeId: string): Promise<void> {
  const client = getRedisClient();
  const pattern = `QUOTE:${exchangeId}:*`;
  
  // Use SCAN to avoid blocking
  const stream = client.scanStream({
    match: pattern,
    count: 100,
  });

  const keys: string[] = [];
  
  for await (const resultKeys of stream) {
    keys.push(...resultKeys);
  }

  if (keys.length > 0) {
    await client.del(...keys);
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
