/**
 * Smart Cache Manager
 *
 * Caches AI responses with content-based hashing to reduce API calls
 * Tracks cache hits, cost savings, and provides warming capabilities
 */

import NodeCache from "node-cache";
import { createHash } from "node:crypto";
import { logger } from "./logger.js";

export interface CacheConfig {
  ttl?: number;              // Time to live in seconds (default: 1 hour)
  checkPeriod?: number;      // Check for expired keys every N seconds
  maxKeys?: number;          // Maximum number of keys to store
  enableStats?: boolean;     // Track statistics
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  keys: number;
  size: number;
  costSavings: number;  // Estimated cost savings in cents
}

interface CachedItem<T> {
  value: T;
  timestamp: number;
  cost: number;  // Cost in cents
}

/**
 * Smart cache with content hashing and statistics
 */
export class SmartCache {
  private cache: NodeCache;
  private hits: number = 0;
  private misses: number = 0;
  private totalCostSaved: number = 0;
  private enableStats: boolean;

  constructor(config: CacheConfig = {}) {
    const {
      ttl = 3600,  // 1 hour default
      checkPeriod = 600,  // Check every 10 minutes
      maxKeys = 1000,
      enableStats = true,
    } = config;

    this.cache = new NodeCache({
      stdTTL: ttl,
      checkperiod: checkPeriod,
      maxKeys,
      useClones: false,  // Don't clone objects (faster)
    });

    this.enableStats = enableStats;

    // Log cache events
    this.cache.on("expired", (key) => {
      logger.debug(`[Cache] Key expired: ${key}`);
    });

    this.cache.on("del", (key) => {
      logger.debug(`[Cache] Key deleted: ${key}`);
    });
  }

  /**
   * Generate a content hash for caching
   */
  private hash(content: string): string {
    return createHash("sha256").update(content).digest("hex").substring(0, 16);
  }

  /**
   * Create a cache key from request parameters
   */
  createKey(params: {
    userInput: string;
    context?: any;
    options?: any;
  }): string {
    // Normalize the input to create consistent keys
    const normalized = {
      input: params.userInput.toLowerCase().trim(),
      context: params.context || {},
      options: params.options || {},
    };

    const content = JSON.stringify(normalized);
    return `req:${this.hash(content)}`;
  }

  /**
   * Get cached value
   */
  get<T>(key: string): T | undefined {
    const item = this.cache.get<CachedItem<T>>(key);

    if (item) {
      this.hits++;
      this.totalCostSaved += item.cost;
      logger.debug(`[Cache] HIT: ${key}`);
      return item.value;
    }

    this.misses++;
    logger.debug(`[Cache] MISS: ${key}`);
    return undefined;
  }

  /**
   * Set cached value
   */
  set<T>(key: string, value: T, cost: number = 0, ttl?: number): boolean {
    const item: CachedItem<T> = {
      value,
      timestamp: Date.now(),
      cost,
    };

    const success = ttl ? this.cache.set(key, item, ttl) : this.cache.set(key, item);

    if (success) {
      logger.debug(`[Cache] SET: ${key} (cost: ${cost}c, ttl: ${ttl || 'default'}s)`);
    }

    return success;
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete a key
   */
  delete(key: string): number {
    return this.cache.del(key);
  }

  /**
   * Clear all keys
   */
  clear(): void {
    this.cache.flushAll();
    logger.info("[Cache] Cleared all keys");
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const keys = this.cache.keys();
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      keys: keys.length,
      size: this.cache.getStats().ksize,
      costSavings: Math.round(this.totalCostSaved * 100) / 100,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.totalCostSaved = 0;
    logger.info("[Cache] Statistics reset");
  }

  /**
   * Get all keys matching a pattern
   */
  getKeys(pattern?: string): string[] {
    const keys = this.cache.keys();

    if (!pattern) {
      return keys;
    }

    const regex = new RegExp(pattern);
    return keys.filter((key) => regex.test(key));
  }

  /**
   * Warm the cache with common queries
   */
  async warmCache(
    commonQueries: Array<{ key: string; value: any; cost?: number }>,
    ttl?: number
  ): Promise<number> {
    logger.info(`[Cache] Warming cache with ${commonQueries.length} queries`);

    let warmed = 0;
    for (const query of commonQueries) {
      const success = this.set(query.key, query.value, query.cost || 0, ttl);
      if (success) warmed++;
    }

    logger.info(`[Cache] Warmed ${warmed}/${commonQueries.length} queries`);
    return warmed;
  }

  /**
   * Export cache contents for persistence
   */
  export(): Record<string, any> {
    const keys = this.cache.keys();
    const data: Record<string, any> = {};

    for (const key of keys) {
      data[key] = this.cache.get(key);
    }

    return data;
  }

  /**
   * Import cache contents
   */
  import(data: Record<string, any>, ttl?: number): number {
    let imported = 0;

    for (const [key, value] of Object.entries(data)) {
      const success = ttl ? this.cache.set(key, value, ttl) : this.cache.set(key, value);
      if (success) imported++;
    }

    logger.info(`[Cache] Imported ${imported} keys`);
    return imported;
  }
}

/**
 * Global cache instance for requirements parsing
 */
export const requirementsCache = new SmartCache({
  ttl: 3600,  // 1 hour
  maxKeys: 500,
});

/**
 * Global cache instance for code generation
 */
export const codeCache = new SmartCache({
  ttl: 7200,  // 2 hours
  maxKeys: 200,
});

/**
 * Estimate API cost in cents
 */
export function estimateAPICost(params: {
  inputTokens: number;
  outputTokens: number;
  model: string;
}): number {
  const { inputTokens, outputTokens, model } = params;

  // DeepSeek pricing (per 1M tokens)
  const prices: Record<string, { input: number; output: number }> = {
    "deepseek-chat": { input: 0.14, output: 0.28 },  // $0.14 / $0.28 per 1M tokens
    "deepseek-coder": { input: 0.14, output: 0.28 },
  };

  const price = prices[model] || prices["deepseek-chat"];

  const inputCost = (inputTokens / 1_000_000) * price.input * 100;  // Convert to cents
  const outputCost = (outputTokens / 1_000_000) * price.output * 100;

  return Math.round((inputCost + outputCost) * 100) / 100;
}

/**
 * Log cache statistics periodically
 */
export function startCacheStatsLogger(intervalMs: number = 60000): NodeJS.Timeout {
  return setInterval(() => {
    const reqStats = requirementsCache.getStats();
    const codeStats = codeCache.getStats();

    logger.info("[Cache] Requirements Cache Stats", reqStats);
    logger.info("[Cache] Code Cache Stats", codeStats);

    const totalSavings = reqStats.costSavings + codeStats.costSavings;
    if (totalSavings > 0) {
      logger.info(`[Cache] Total cost savings: $${(totalSavings / 100).toFixed(2)}`);
    }
  }, intervalMs);
}
