/**
 * High-performance in-memory cache with in-flight request deduplication,
 * LRU bounded capacity, and atomic invalidation.
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
  private MAX_ENTRIES = 250; // Prevent unbounded memory growth

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
        // Check if key was invalidated while fetch was in-flight
        if (result !== null && result !== undefined && this.inFlight.has(key)) {
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

    // Move to most recently used by re-inserting
    this.memoryCache.delete(key);
    this.memoryCache.set(key, entry);
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number = this.DEFAULT_TTL_MS): void {
    // Evict oldest entry if at capacity
    if (this.memoryCache.size >= this.MAX_ENTRIES) {
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }

    this.memoryCache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Invalidate cache entries matching prefix or pattern,
   * AND clear matching in-flight promises to prevent stale responses from overwriting.
   */
  invalidate(keyPrefixOrPattern?: string): void {
    if (!keyPrefixOrPattern) {
      this.memoryCache.clear();
      this.inFlight.clear();
      return;
    }

    // Invalidate cached items
    for (const key of Array.from(this.memoryCache.keys())) {
      if (key.startsWith(keyPrefixOrPattern)) {
        this.memoryCache.delete(key);
      }
    }

    // Invalidate in-flight promises so they won't store stale data upon completion
    for (const key of Array.from(this.inFlight.keys())) {
      if (key.startsWith(keyPrefixOrPattern)) {
        this.inFlight.delete(key);
      }
    }
  }

  /**
   * Clear all cached data and in-flight tracking (e.g. on user sign out).
   */
  clearAll(): void {
    this.memoryCache.clear();
    this.inFlight.clear();
  }

  /**
   * Cache signed document URLs with safe 10-minute TTL (preserves 1-hour Supabase expiry).
   */
  async dedupeSignedUrl(storagePath: string, fetcher: () => Promise<string>): Promise<string> {
    const key = `signed_url_${storagePath}`;
    return this.dedupe(key, fetcher, 10 * 60 * 1000); // 10 minutes
  }

  get size(): number {
    return this.memoryCache.size;
  }
}

export const fastCache = new FastCacheManager();
