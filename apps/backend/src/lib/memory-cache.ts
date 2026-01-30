/**
 * MemoryCache - In-memory cache for local development
 * 
 * This replaces Redis with an in-memory Map-based cache for local development.
 * All cache operations work without external dependencies.
 * 
 * ADR-008: Caching Strategy (Updated for Local Development)
 * - In-memory storage using JavaScript Map
 * - TTL support with automatic expiration
 * - Pattern-based key matching for bulk operations
 */

interface CacheEntry {
  value: string;
  expiresAt: number; // timestamp in ms
}

class MemoryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start periodic cleanup of expired entries (every 60 seconds)
    this.startCleanup();
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000); // 60 seconds
    
    // Unref the interval so it doesn't keep Node processes alive
    this.cleanupInterval.unref();
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    if (keysToDelete.length > 0) {
      console.log(`MemoryCache: Cleaned up ${keysToDelete.length} expired entries`);
    }
  }

  /**
   * Set a value with expiration (in seconds)
   */
  setex(key: string, ttlSeconds: number, value: string): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Get a value from cache
   * Returns null if not found or expired
   */
  get(key: string): string | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Delete a key
   */
  del(...keys: string[]): number {
    let deleted = 0;
    for (const key of keys) {
      if (this.cache.delete(key)) {
        deleted++;
      }
    }
    return deleted;
  }

  /**
   * Get keys matching a pattern
   * Supports wildcards: * matches any characters
   */
  keys(pattern: string): string[] {
    const regex = this.patternToRegex(pattern);
    const matchingKeys: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        matchingKeys.push(key);
      }
    }

    return matchingKeys;
  }

  /**
   * Convert Redis pattern to RegExp
   */
  private patternToRegex(pattern: string): RegExp {
    // Escape special regex characters except *
    const escaped = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`);
  }

  /**
   * Scan keys with pattern (async generator to mimic Redis SCAN)
   */
  async *scanStream(options: { match: string; count?: number }): AsyncGenerator<string[]> {
    const keys = this.keys(options.match);
    const count = options.count || 10;

    // Yield keys in chunks
    for (let i = 0; i < keys.length; i += count) {
      yield keys.slice(i, i + count);
    }
  }

  /**
   * Check connection status
   */
  get status(): string {
    return 'ready';
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Quit (cleanup)
   */
  async quit(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

// Singleton instance
let memoryCache: MemoryCache | null = null;

/**
 * Get or create in-memory cache instance
 */
export function getMemoryCache(): MemoryCache {
  if (!memoryCache) {
    memoryCache = new MemoryCache();
    console.log('MemoryCache initialized successfully');
  }
  return memoryCache;
}

/**
 * Reset cache (for testing)
 */
export function resetMemoryCache(): void {
  if (memoryCache) {
    memoryCache.clear();
    memoryCache = null;
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
    const cache = getMemoryCache();
    const key = `QUOTE:${exchangeId}:${symbol}`;
    
    cache.setex(key, ttlSeconds, JSON.stringify(quoteData));
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
    const cache = getMemoryCache();
    const key = `QUOTE:${exchangeId}:${symbol}`;
    
    const data = cache.get(key);
    
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
    const cache = getMemoryCache();
    const key = `CONFIG:${exchangeId}`;
    
    cache.setex(key, ttlSeconds, JSON.stringify(config));
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
    const cache = getMemoryCache();
    const key = `CONFIG:${exchangeId}`;
    
    const data = cache.get(key);
    
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
    const cache = getMemoryCache();
    const key = `CONFIG:${exchangeId}`;
    
    cache.del(key);
  } catch (error) {
    const err = error as Error;
    throw new Error(`Failed to invalidate exchange config for ${exchangeId}: ${err.message}`);
  }
}

/**
 * Invalidate all cached quotes for an exchange
 * Use when exchange is paused or reset
 */
export async function invalidateExchangeQuotes(exchangeId: string): Promise<void> {
  try {
    const cache = getMemoryCache();
    const pattern = `QUOTE:${exchangeId}:*`;
    
    const keys: string[] = [];
    
    for await (const resultKeys of cache.scanStream({ match: pattern, count: 1000 })) {
      keys.push(...resultKeys);
    }

    if (keys.length > 0) {
      cache.del(...keys);
    }
  } catch (error) {
    const err = error as Error;
    throw new Error(`Failed to invalidate quotes for exchange ${exchangeId}: ${err.message}`);
  }
}

/**
 * Close cache connection gracefully
 * Should be called during application shutdown
 */
export async function closeMemoryCacheConnection(): Promise<void> {
  if (memoryCache) {
    await memoryCache.quit();
    memoryCache = null;
  }
}
