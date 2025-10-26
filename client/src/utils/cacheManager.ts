import { queryClientLogger } from '@/lib/logger';

// Cache configuration
const CACHE_CONFIG = {
  maxAgeMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxSizeMB: 50, // 50MB per cache
  maxTotalSizeMB: 200, // 200MB total
  cacheNames: {
    static: 'field-inspection-static-v5',
    api: 'field-inspection-api-v5',
    photos: 'field-inspection-photos-v5',
    offline: 'field-inspection-offline-v5',
  },
  priorityEndpoints: [
    '/api/auth/user',
    '/api/jobs',
    '/api/builders',
    '/api/report-templates',
  ],
};

// Cache entry metadata
interface CacheMetadata {
  url: string;
  cachedAt: Date;
  accessedAt: Date;
  size: number;
  priority: 'high' | 'normal' | 'low';
  accessCount: number;
}

// Cache manager class
class CacheManager {
  private metadata = new Map<string, CacheMetadata>();
  private initialized = false;

  constructor() {
    this.init();
  }

  private async init() {
    if (!('caches' in window)) {
      queryClientLogger.warn('[CacheManager] Cache API not supported');
      return;
    }

    // Load metadata from localStorage
    this.loadMetadata();

    // Initialize cache monitoring
    this.startMonitoring();

    this.initialized = true;
    queryClientLogger.info('[CacheManager] Initialized');
  }

  // Load metadata from localStorage
  private loadMetadata() {
    try {
      const stored = localStorage.getItem('cache-metadata');
      if (stored) {
        const data = JSON.parse(stored);
        this.metadata = new Map(Object.entries(data));
      }
    } catch (error) {
      queryClientLogger.error('[CacheManager] Failed to load metadata:', error);
    }
  }

  // Save metadata to localStorage
  private saveMetadata() {
    try {
      const data = Object.fromEntries(this.metadata.entries());
      localStorage.setItem('cache-metadata', JSON.stringify(data));
    } catch (error) {
      queryClientLogger.error('[CacheManager] Failed to save metadata:', error);
    }
  }

  // Start cache monitoring
  private startMonitoring() {
    // Check cache size periodically
    setInterval(() => {
      this.checkCacheSize();
    }, 60 * 60 * 1000); // Every hour

    // Initial check
    this.checkCacheSize();
  }

  // Check cache size and enforce limits
  private async checkCacheSize() {
    try {
      const usage = await this.getStorageUsage();
      
      if (usage.percentage > 80) {
        queryClientLogger.warn('[CacheManager] Cache usage high:', `${usage.percentage}%`);
        await this.evictLRU();
      }

      // Check individual cache sizes
      for (const cacheName of Object.values(CACHE_CONFIG.cacheNames)) {
        const size = await this.getCacheSize(cacheName);
        if (size > CACHE_CONFIG.maxSizeMB * 1024 * 1024) {
          await this.evictFromCache(cacheName);
        }
      }
    } catch (error) {
      queryClientLogger.error('[CacheManager] Failed to check cache size:', error);
    }
  }

  // Get storage usage statistics
  async getStorageUsage(): Promise<{
    used: number;
    quota: number;
    percentage: number;
  }> {
    if (!('storage' in navigator && 'estimate' in navigator.storage)) {
      return { used: 0, quota: 0, percentage: 0 };
    }

    try {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0,
        percentage: estimate.quota ? ((estimate.usage || 0) / estimate.quota) * 100 : 0,
      };
    } catch (error) {
      queryClientLogger.error('[CacheManager] Failed to get storage usage:', error);
      return { used: 0, quota: 0, percentage: 0 };
    }
  }

  // Get size of a specific cache
  private async getCacheSize(cacheName: string): Promise<number> {
    try {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      
      let totalSize = 0;
      for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }
      
      return totalSize;
    } catch (error) {
      queryClientLogger.error('[CacheManager] Failed to get cache size:', error);
      return 0;
    }
  }

  // LRU eviction
  private async evictLRU() {
    queryClientLogger.info('[CacheManager] Starting LRU eviction');

    // Sort metadata by access time and priority
    const entries = Array.from(this.metadata.entries()).sort((a, b) => {
      // Prioritize high priority items
      if (a[1].priority !== b[1].priority) {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        return priorityOrder[a[1].priority] - priorityOrder[b[1].priority];
      }
      
      // Then sort by access time
      return a[1].accessedAt.getTime() - b[1].accessedAt.getTime();
    });

    // Evict least recently used items
    const toEvict = entries.slice(0, Math.floor(entries.length * 0.2)); // Evict 20%
    
    for (const [url] of toEvict) {
      await this.removeFromCache(url);
    }

    queryClientLogger.info(`[CacheManager] Evicted ${toEvict.length} items`);
  }

  // Evict from specific cache
  private async evictFromCache(cacheName: string) {
    try {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      
      // Get metadata for all items
      const items = [];
      for (const request of keys) {
        const meta = this.metadata.get(request.url);
        if (meta) {
          items.push({ request, meta });
        }
      }
      
      // Sort by priority and access time
      items.sort((a, b) => {
        if (a.meta.priority !== b.meta.priority) {
          const priorityOrder = { high: 0, normal: 1, low: 2 };
          return priorityOrder[a.meta.priority] - priorityOrder[b.meta.priority];
        }
        return a.meta.accessedAt.getTime() - b.meta.accessedAt.getTime();
      });
      
      // Evict least important items
      const toEvict = items.slice(0, Math.floor(items.length * 0.3)); // Evict 30%
      
      for (const item of toEvict) {
        await cache.delete(item.request);
        this.metadata.delete(item.request.url);
      }
      
      this.saveMetadata();
    } catch (error) {
      queryClientLogger.error('[CacheManager] Failed to evict from cache:', error);
    }
  }

  // Add item to cache with metadata
  async addToCache(url: string, response: Response, priority?: 'high' | 'normal' | 'low'): Promise<void> {
    try {
      // Determine cache name
      let cacheName = CACHE_CONFIG.cacheNames.api;
      if (url.includes('/photos/') || url.includes('/attached_assets/')) {
        cacheName = CACHE_CONFIG.cacheNames.photos;
      } else if (url.match(/\.(js|css|png|jpg|jpeg|svg|gif|woff|woff2)$/)) {
        cacheName = CACHE_CONFIG.cacheNames.static;
      }
      
      // Open cache and add response
      const cache = await caches.open(cacheName);
      await cache.put(url, response.clone());
      
      // Update metadata
      const blob = await response.blob();
      this.metadata.set(url, {
        url,
        cachedAt: new Date(),
        accessedAt: new Date(),
        size: blob.size,
        priority: priority || this.determinePriority(url),
        accessCount: 1,
      });
      
      this.saveMetadata();
    } catch (error) {
      queryClientLogger.error('[CacheManager] Failed to add to cache:', error);
    }
  }

  // Get from cache with metadata update
  async getFromCache(url: string): Promise<Response | undefined> {
    try {
      // Check all caches
      for (const cacheName of Object.values(CACHE_CONFIG.cacheNames)) {
        const cache = await caches.open(cacheName);
        const response = await cache.match(url);
        
        if (response) {
          // Update metadata
          const meta = this.metadata.get(url);
          if (meta) {
            meta.accessedAt = new Date();
            meta.accessCount++;
            this.metadata.set(url, meta);
            this.saveMetadata();
          }
          
          return response;
        }
      }
    } catch (error) {
      queryClientLogger.error('[CacheManager] Failed to get from cache:', error);
    }
    
    return undefined;
  }

  // Remove from cache
  async removeFromCache(url: string): Promise<void> {
    try {
      // Check all caches
      for (const cacheName of Object.values(CACHE_CONFIG.cacheNames)) {
        const cache = await caches.open(cacheName);
        await cache.delete(url);
      }
      
      // Remove metadata
      this.metadata.delete(url);
      this.saveMetadata();
    } catch (error) {
      queryClientLogger.error('[CacheManager] Failed to remove from cache:', error);
    }
  }

  // Clear specific cache
  async clearCache(cacheName?: string): Promise<void> {
    try {
      if (cacheName) {
        await caches.delete(cacheName);
        
        // Remove metadata for this cache
        for (const [url] of this.metadata) {
          if (this.getCacheNameForUrl(url) === cacheName) {
            this.metadata.delete(url);
          }
        }
      } else {
        // Clear all caches
        const names = await caches.keys();
        await Promise.all(names.map(name => caches.delete(name)));
        this.metadata.clear();
      }
      
      this.saveMetadata();
      queryClientLogger.info('[CacheManager] Cache cleared');
    } catch (error) {
      queryClientLogger.error('[CacheManager] Failed to clear cache:', error);
    }
  }

  // Get cache statistics
  async getCacheStats(): Promise<{
    caches: Array<{
      name: string;
      count: number;
      size: number;
    }>;
    total: {
      count: number;
      size: number;
    };
    usage: {
      used: number;
      quota: number;
      percentage: number;
    };
  }> {
    const stats = {
      caches: [] as Array<{ name: string; count: number; size: number }>,
      total: { count: 0, size: 0 },
      usage: await this.getStorageUsage(),
    };

    try {
      for (const [name, cacheName] of Object.entries(CACHE_CONFIG.cacheNames)) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        const size = await this.getCacheSize(cacheName);
        
        stats.caches.push({
          name,
          count: keys.length,
          size,
        });
        
        stats.total.count += keys.length;
        stats.total.size += size;
      }
    } catch (error) {
      queryClientLogger.error('[CacheManager] Failed to get cache stats:', error);
    }

    return stats;
  }

  // Export cache data
  async exportCacheData(): Promise<{ 
    metadata: Record<string, CacheMetadata>;
    stats: any;
  }> {
    const metadata = Object.fromEntries(this.metadata.entries());
    const stats = await this.getCacheStats();
    
    return { metadata, stats };
  }

  // Import cache data
  async importCacheData(data: { metadata: Record<string, CacheMetadata> }): Promise<void> {
    try {
      this.metadata = new Map(Object.entries(data.metadata));
      this.saveMetadata();
      queryClientLogger.info('[CacheManager] Cache data imported');
    } catch (error) {
      queryClientLogger.error('[CacheManager] Failed to import cache data:', error);
    }
  }

  // Pre-cache critical resources
  async preCacheCriticalResources(): Promise<void> {
    if (!navigator.onLine) {
      return;
    }

    try {
      const cache = await caches.open(CACHE_CONFIG.cacheNames.api);
      
      for (const endpoint of CACHE_CONFIG.priorityEndpoints) {
        try {
          const response = await fetch(endpoint, {
            credentials: 'include',
          });
          
          if (response.ok) {
            await cache.put(endpoint, response.clone());
            await this.addToCache(endpoint, response, 'high');
            queryClientLogger.debug(`[CacheManager] Pre-cached: ${endpoint}`);
          }
        } catch (error) {
          queryClientLogger.warn(`[CacheManager] Failed to pre-cache ${endpoint}:`, error);
        }
      }
    } catch (error) {
      queryClientLogger.error('[CacheManager] Failed to pre-cache resources:', error);
    }
  }

  // Helper methods
  private determinePriority(url: string): 'high' | 'normal' | 'low' {
    if (CACHE_CONFIG.priorityEndpoints.some(endpoint => url.includes(endpoint))) {
      return 'high';
    }
    
    if (url.includes('/photos/') || url.includes('/attached_assets/')) {
      return 'low';
    }
    
    return 'normal';
  }

  private getCacheNameForUrl(url: string): string {
    if (url.includes('/photos/') || url.includes('/attached_assets/')) {
      return CACHE_CONFIG.cacheNames.photos;
    }
    
    if (url.match(/\.(js|css|png|jpg|jpeg|svg|gif|woff|woff2)$/)) {
      return CACHE_CONFIG.cacheNames.static;
    }
    
    return CACHE_CONFIG.cacheNames.api;
  }

  // Request storage persistence
  async requestPersistence(): Promise<boolean> {
    if (!('storage' in navigator && 'persist' in navigator.storage)) {
      return false;
    }

    try {
      const isPersisted = await navigator.storage.persist();
      
      if (isPersisted) {
        queryClientLogger.info('[CacheManager] Storage persistence granted');
      } else {
        queryClientLogger.warn('[CacheManager] Storage persistence denied');
      }
      
      return isPersisted;
    } catch (error) {
      queryClientLogger.error('[CacheManager] Failed to request persistence:', error);
      return false;
    }
  }

  // Check if storage is persisted
  async isStoragePersisted(): Promise<boolean> {
    if (!('storage' in navigator && 'persisted' in navigator.storage)) {
      return false;
    }

    try {
      return await navigator.storage.persisted();
    } catch (error) {
      queryClientLogger.error('[CacheManager] Failed to check persistence:', error);
      return false;
    }
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();

// Export helper functions
export async function clearAllCaches(): Promise<void> {
  return cacheManager.clearCache();
}

export async function getCacheStatistics(): Promise<any> {
  return cacheManager.getCacheStats();
}

export async function exportCacheData(): Promise<any> {
  return cacheManager.exportCacheData();
}

export async function importCacheData(data: any): Promise<void> {
  return cacheManager.importCacheData(data);
}

export async function requestStoragePersistence(): Promise<boolean> {
  return cacheManager.requestPersistence();
}