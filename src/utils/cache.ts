/**
 * High-performance in-memory and sessionStorage cache with in-flight request deduplication.
 * Eliminates redundant Supabase network roundtrips and makes tab switching instantaneous.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class FastCacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private inFlight = new Map<string, Promise<any>>();
  private DEFAULT_TTL_MS = 25000; // 25 seconds default freshness

  /**
   * Deduplicate concurrent in-flight requests and cache results.
   */
  async dedupe<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = this.DEFAULT_TTL_MS
  ): Promise<T> {
    // 1. Check in-memory cache
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // 2. Check if identical request is currently in-flight
    if (this.inFlight.has(key)) {
      return this.inFlight.get(key) as Promise<T>;
    }

    // 3. Execute fetcher and register in-flight promise
    const promise = (async () => {
      try {
        const result = await fetcher();
        if (result !== null && result !== undefined) {
          this.set(key, result, ttlMs);
        }
        return result;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  get<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number = this.DEFAULT_TTL_MS): void {
    this.memoryCache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  invalidate(keyPrefixOrPattern?: string): void {
    if (!keyPrefixOrPattern) {
      this.memoryCache.clear();
      return;
    }

    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(keyPrefixOrPattern)) {
        this.memoryCache.delete(key);
      }
    }
  }
}

export const fastCache = new FastCacheManager();
