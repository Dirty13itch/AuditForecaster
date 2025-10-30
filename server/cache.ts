/**
 * In-Memory Caching Layer
 * 
 * Provides application-level caching for expensive database queries and computations.
 * Uses node-cache for simple TTL-based caching with automatic cleanup.
 * 
 * Features:
 * - Configurable TTL per cache category
 * - Automatic cache invalidation
 * - Prometheus metrics for monitoring
 * - Typed cache keys for safety
 * - Cache statistics and debugging
 */

import NodeCache from 'node-cache';
import { serverLogger } from './logger';
import { cacheHits, cacheMisses, cacheSize, cacheEvictions } from './metrics';

// TTL values in seconds
export const CacheTTL = {
  // Static data - rarely changes
  ACHIEVEMENT_DEFINITIONS: 86400, // 24 hours
  FINANCIAL_SETTINGS: 3600, // 1 hour
  EQUIPMENT_INVENTORY: 1800, // 30 minutes
  
  // Semi-static data - changes occasionally
  BUILDER_FULL: 3600, // 1 hour
  BUILDER_LIST: 600, // 10 minutes
  PLAN_LIST: 1800, // 30 minutes
  
  // Dynamic data - changes frequently
  DASHBOARD_SUMMARY: 600, // 10 minutes
  JOB_LIST: 120, // 2 minutes
  PHOTO_TAGS_AGGREGATION: 300, // 5 minutes
  
  // Computed data - expensive to calculate
  COMPLIANCE_CALCULATION: 86400, // 24 hours (invalidate on test update)
  BUILDER_PERFORMANCE_METRICS: 3600, // 1 hour
  QA_SCORE_SUMMARY: 600, // 10 minutes
  
  // Session-like data
  USER_PERMISSIONS: 300, // 5 minutes
  INSPECTOR_WORKLOAD: 60, // 1 minute (changes frequently)
} as const;

// Cache categories for metrics and logging
export enum CacheCategory {
  USER = 'user',
  BUILDER = 'builder',
  JOB = 'job',
  PHOTO = 'photo',
  DASHBOARD = 'dashboard',
  COMPLIANCE = 'compliance',
  EQUIPMENT = 'equipment',
  FINANCIAL = 'financial',
  QA = 'qa',
  ACHIEVEMENT = 'achievement',
}

// Type-safe cache key builder
export class CacheKey {
  static user(userId: string, suffix?: string): string {
    return suffix ? `user:${userId}:${suffix}` : `user:${userId}`;
  }
  
  static builder(builderId: string, suffix?: string): string {
    return suffix ? `builder:${builderId}:${suffix}` : `builder:${builderId}`;
  }
  
  static builderList(filters: Record<string, any>): string {
    const filterStr = Object.entries(filters)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    return `builder:list:${filterStr}`;
  }
  
  static job(jobId: string, suffix?: string): string {
    return suffix ? `job:${jobId}:${suffix}` : `job:${jobId}`;
  }
  
  static jobList(filters: Record<string, any>): string {
    const filterStr = Object.entries(filters)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    return `job:list:${filterStr}`;
  }
  
  static compliance(jobId: string): string {
    return `compliance:${jobId}`;
  }
  
  static dashboard(userId: string, period: string = 'month'): string {
    return `dashboard:${userId}:${period}`;
  }
  
  static photoTags(jobId?: string): string {
    return jobId ? `photo:tags:${jobId}` : 'photo:tags:all';
  }
  
  static qaScore(jobId: string): string {
    return `qa:score:${jobId}`;
  }
  
  static builderPerformance(builderId: string, period: string = 'month'): string {
    return `builder:performance:${builderId}:${period}`;
  }
  
  static equipmentInventory(): string {
    return 'equipment:inventory';
  }
  
  static financialSettings(): string {
    return 'financial:settings';
  }
  
  static achievementDefinitions(): string {
    return 'achievement:definitions';
  }
}

/**
 * Main cache instance with standard configuration
 */
export const cache = new NodeCache({
  stdTTL: 600, // Default TTL: 10 minutes
  checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: true, // Clone objects on get/set to prevent reference issues
  deleteOnExpire: true,
  maxKeys: 10000, // Prevent unbounded growth
});

/**
 * Separate cache for short-lived data (e.g., request deduplication)
 */
export const shortCache = new NodeCache({
  stdTTL: 60, // 1 minute default
  checkperiod: 10,
  useClones: true,
  deleteOnExpire: true,
  maxKeys: 1000,
});

/**
 * Helper class for cache operations with automatic metrics tracking
 */
export class CacheHelper {
  /**
   * Get value from cache with metrics tracking
   */
  static get<T>(key: string, category: CacheCategory): T | undefined {
    const value = cache.get<T>(key);
    
    if (value !== undefined) {
      cacheHits.inc({ category });
      serverLogger.debug(`[Cache] HIT: ${key}`, { category });
      return value;
    } else {
      cacheMisses.inc({ category });
      serverLogger.debug(`[Cache] MISS: ${key}`, { category });
      return undefined;
    }
  }
  
  /**
   * Set value in cache with metrics tracking
   */
  static set<T>(key: string, value: T, ttl: number, category: CacheCategory): boolean {
    const success = cache.set(key, value, ttl);
    
    if (success) {
      cacheSize.set({ category }, cache.keys().filter(k => k.startsWith(category)).length);
      serverLogger.debug(`[Cache] SET: ${key}`, { category, ttl });
    } else {
      serverLogger.warn(`[Cache] SET FAILED: ${key}`, { category });
    }
    
    return success;
  }
  
  /**
   * Delete specific key(s) from cache
   */
  static del(key: string | string[], category: CacheCategory): number {
    const deleted = cache.del(key);
    
    if (deleted > 0) {
      cacheSize.set({ category }, cache.keys().filter(k => k.startsWith(category)).length);
      cacheEvictions.inc({ category, reason: 'manual' }, deleted);
      serverLogger.debug(`[Cache] DELETE: ${Array.isArray(key) ? key.join(', ') : key}`, { 
        category, 
        deleted 
      });
    }
    
    return deleted;
  }
  
  /**
   * Delete all keys matching a pattern
   */
  static delPattern(pattern: string, category: CacheCategory): number {
    const keys = cache.keys();
    const matchingKeys = keys.filter(key => {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(key);
      }
      return key.startsWith(pattern);
    });
    
    return this.del(matchingKeys, category);
  }
  
  /**
   * Get or set pattern: Try cache first, fallback to async function
   */
  static async getOrSet<T>(
    key: string,
    category: CacheCategory,
    ttl: number,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    // Try cache first
    const cached = this.get<T>(key, category);
    if (cached !== undefined) {
      return cached;
    }
    
    // Cache miss - fetch data
    const start = Date.now();
    const data = await fetchFn();
    const duration = Date.now() - start;
    
    // Store in cache
    this.set(key, data, ttl, category);
    
    serverLogger.debug(`[Cache] Fetch completed: ${key}`, { 
      category, 
      duration,
      willCache: true 
    });
    
    return data;
  }
  
  /**
   * Get cache statistics
   */
  static getStats() {
    const stats = cache.getStats();
    const keys = cache.keys();
    
    // Group by category
    const keysByCategory = keys.reduce((acc, key) => {
      const category = key.split(':')[0];
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      ...stats,
      keysByCategory,
      totalKeys: keys.length,
    };
  }
  
  /**
   * Flush all cache data (use carefully!)
   */
  static flushAll() {
    cache.flushAll();
    serverLogger.warn('[Cache] All cache data flushed');
    
    // Reset metrics
    Object.values(CacheCategory).forEach(category => {
      cacheSize.set({ category }, 0);
    });
  }
  
  /**
   * Flush specific category
   */
  static flushCategory(category: CacheCategory) {
    const keys = cache.keys().filter(k => k.startsWith(category));
    const deleted = cache.del(keys);
    
    cacheSize.set({ category }, 0);
    cacheEvictions.inc({ category, reason: 'flush' }, deleted);
    
    serverLogger.info(`[Cache] Flushed category: ${category}`, { deleted });
    return deleted;
  }
}

/**
 * Cache invalidation helpers - call these when data changes
 */
export class CacheInvalidator {
  /**
   * Invalidate all job-related cache when job data changes
   */
  static job(jobId: string) {
    CacheHelper.delPattern(`job:${jobId}*`, CacheCategory.JOB);
    CacheHelper.delPattern(`job:list*`, CacheCategory.JOB);
    CacheHelper.delPattern(`dashboard:*`, CacheCategory.DASHBOARD);
    CacheHelper.delPattern(`compliance:${jobId}`, CacheCategory.COMPLIANCE);
    
    serverLogger.debug('[Cache Invalidate] Job updated', { jobId });
  }
  
  /**
   * Invalidate builder-related cache
   */
  static builder(builderId: string) {
    CacheHelper.delPattern(`builder:${builderId}*`, CacheCategory.BUILDER);
    CacheHelper.delPattern(`builder:list*`, CacheCategory.BUILDER);
    CacheHelper.delPattern(`builder:performance:${builderId}*`, CacheCategory.BUILDER);
    
    serverLogger.debug('[Cache Invalidate] Builder updated', { builderId });
  }
  
  /**
   * Invalidate compliance cache when test data changes
   */
  static compliance(jobId: string) {
    CacheHelper.delPattern(`compliance:${jobId}`, CacheCategory.COMPLIANCE);
    CacheHelper.delPattern(`qa:score:${jobId}`, CacheCategory.QA);
    CacheHelper.delPattern(`job:${jobId}*`, CacheCategory.JOB);
    
    serverLogger.debug('[Cache Invalidate] Compliance data updated', { jobId });
  }
  
  /**
   * Invalidate photo cache when photos added/updated
   */
  static photo(jobId: string) {
    CacheHelper.delPattern(`photo:*`, CacheCategory.PHOTO);
    CacheHelper.delPattern(`job:${jobId}*`, CacheCategory.JOB);
    
    serverLogger.debug('[Cache Invalidate] Photo updated', { jobId });
  }
  
  /**
   * Invalidate dashboard cache for specific user
   */
  static dashboard(userId?: string) {
    if (userId) {
      CacheHelper.delPattern(`dashboard:${userId}*`, CacheCategory.DASHBOARD);
    } else {
      CacheHelper.delPattern(`dashboard:*`, CacheCategory.DASHBOARD);
    }
    
    serverLogger.debug('[Cache Invalidate] Dashboard cache cleared', { userId });
  }
  
  /**
   * Invalidate equipment cache
   */
  static equipment() {
    CacheHelper.delPattern(`equipment:*`, CacheCategory.EQUIPMENT);
    
    serverLogger.debug('[Cache Invalidate] Equipment cache cleared');
  }
  
  /**
   * Invalidate financial settings cache
   */
  static financialSettings() {
    CacheHelper.delPattern(`financial:*`, CacheCategory.FINANCIAL);
    
    serverLogger.debug('[Cache Invalidate] Financial settings cache cleared');
  }
}

// Event listeners for cache lifecycle
cache.on('expired', (key, value) => {
  const category = (key.split(':')[0] || 'unknown') as CacheCategory;
  cacheEvictions.inc({ category, reason: 'expired' });
  serverLogger.debug('[Cache] Key expired', { key });
});

cache.on('del', (key, value) => {
  const category = (key.split(':')[0] || 'unknown') as CacheCategory;
  serverLogger.debug('[Cache] Key deleted', { key });
});

// Periodic stats logging (every 5 minutes)
setInterval(() => {
  const stats = CacheHelper.getStats();
  serverLogger.info('[Cache] Statistics', stats);
  
  // Update metrics
  Object.entries(stats.keysByCategory).forEach(([category, count]) => {
    cacheSize.set({ category }, count);
  });
}, 5 * 60 * 1000);

// Export everything
export { cache, shortCache };
export default cache;
