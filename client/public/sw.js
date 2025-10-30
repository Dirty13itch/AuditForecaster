// Enhanced Service Worker with comprehensive offline capabilities
const VERSION = 'v7';
const CACHE_NAME = `field-inspection-${VERSION}`;
const API_CACHE_NAME = `field-inspection-api-${VERSION}`;
const STATIC_CACHE_NAME = `field-inspection-static-${VERSION}`;
const PHOTO_CACHE_NAME = `field-inspection-photos-${VERSION}`;
const OFFLINE_PAGE_CACHE = `field-inspection-offline-${VERSION}`;

// Cache size limits
const CACHE_LIMITS = {
  api: 100,        // Max 100 API responses
  photos: 50,      // Max 50 photos cached
  static: 200,     // Max 200 static assets
};

// Cache TTL (time-to-live) in milliseconds
const CACHE_TTL = {
  api: 5 * 60 * 1000,      // 5 minutes for API responses
  static: 24 * 60 * 60 * 1000,  // 24 hours for static assets
  photos: 7 * 24 * 60 * 60 * 1000, // 7 days for photos
};

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.png',
  '/manifest.json',
  '/icons/icon-96x96.png',
  '/icons/icon-144x144.png',
  '/icons/icon-192x192.png',
  '/icons/icon-256x256.png',
  '/icons/icon-512x512.png',
];

// Critical API routes to pre-cache
const CRITICAL_API_ROUTES = [
  '/api/auth/user',
  '/api/jobs',
  '/api/builders',
  '/api/report-templates',
];

// Logger that integrates with centralized logger via postMessage
const logger = {
  _postLog: async (level, message, ...args) => {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SW_LOG',
        level,
        message,
        args,
        timestamp: new Date().toISOString()
      });
    });
  },
  
  info: (message, ...args) => logger._postLog('info', message, ...args),
  warn: (message, ...args) => logger._postLog('warn', message, ...args),
  error: (message, ...args) => logger._postLog('error', message, ...args),
  debug: (message, ...args) => logger._postLog('debug', message, ...args),
};

// Utility to clean old caches
async function deleteOldCaches() {
  const cacheNames = await caches.keys();
  const currentCaches = [
    CACHE_NAME,
    API_CACHE_NAME,
    STATIC_CACHE_NAME,
    PHOTO_CACHE_NAME,
    OFFLINE_PAGE_CACHE
  ];
  
  const promises = cacheNames
    .filter(cacheName => !currentCaches.includes(cacheName))
    .map(cacheName => {
      logger.info('Deleting old cache:', cacheName);
      return caches.delete(cacheName);
    });
  
  return Promise.all(promises);
}

// LRU cache eviction
async function evictLRUCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const requests = await cache.keys();
  
  if (requests.length > maxItems) {
    const toDelete = requests.slice(0, requests.length - maxItems);
    await Promise.all(toDelete.map(req => cache.delete(req)));
    logger.debug(`Evicted ${toDelete.length} items from ${cacheName}`);
  }
}

// Install event - cache static assets and setup offline page
self.addEventListener('install', event => {
  logger.info('Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then(cache => {
        logger.info('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Create offline page
      caches.open(OFFLINE_PAGE_CACHE).then(cache => {
        const offlineHTML = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Offline - Field Inspection</title>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                  background: #f8f9fa;
                  color: #212529;
                }
                .container {
                  text-align: center;
                  padding: 2rem;
                  max-width: 400px;
                }
                h1 { color: #2E5BBA; margin-bottom: 1rem; }
                p { color: #6c757d; line-height: 1.5; }
                .status {
                  display: inline-block;
                  padding: 0.5rem 1rem;
                  background: #FD7E14;
                  color: white;
                  border-radius: 8px;
                  margin-top: 1rem;
                  font-weight: 500;
                }
                .btn {
                  display: inline-block;
                  margin-top: 1.5rem;
                  padding: 0.75rem 1.5rem;
                  background: #2E5BBA;
                  color: white;
                  text-decoration: none;
                  border-radius: 8px;
                  font-weight: 500;
                  cursor: pointer;
                  border: none;
                  font-size: 16px;
                }
                .btn:hover { background: #1e4ba8; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>You're Offline</h1>
                <p>Don't worry! Your work has been saved locally and will sync when you're back online.</p>
                <div class="status">Offline Mode Active</div>
                <button class="btn" onclick="window.location.reload()">Try Again</button>
              </div>
              <script>
                // Check for connection periodically
                setInterval(() => {
                  if (navigator.onLine) {
                    window.location.reload();
                  }
                }, 5000);
              </script>
            </body>
          </html>
        `;
        
        return cache.put('/offline.html', new Response(offlineHTML, {
          headers: { 'Content-Type': 'text/html' }
        }));
      }),
      
      // Pre-cache critical API data
      caches.open(API_CACHE_NAME).then(async cache => {
        const promises = CRITICAL_API_ROUTES.map(async route => {
          try {
            const response = await fetch(route, { credentials: 'include' });
            if (response.ok) {
              await cache.put(route, response);
              logger.debug(`Pre-cached: ${route}`);
            }
          } catch (error) {
            logger.warn(`Failed to pre-cache ${route}:`, error);
          }
        });
        return Promise.all(promises);
      })
    ]).then(() => {
      // Skip waiting to activate immediately
      return self.skipWaiting();
    })
  );
});

// Activate event - clean old caches and take control
self.addEventListener('activate', event => {
  logger.info('Service Worker activating...');
  
  event.waitUntil(
    deleteOldCaches().then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    }).then(() => {
      // Notify clients about update
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            version: VERSION
          });
        });
      });
    })
  );
});

// Fetch event - implement cache strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip OAuth routes
  if (url.pathname === '/api/login' || 
      url.pathname === '/api/callback' ||
      url.pathname === '/api/logout') {
    return;
  }

  // Handle different request types
  if (request.method === 'GET') {
    // Static assets - cache first
    if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|woff|woff2|ico)$/) ||
        STATIC_ASSETS.includes(url.pathname)) {
      event.respondWith(cacheFirst(request));
    }
    // Mutable API routes - network only (no cache) to prevent stale data
    else if (url.pathname.match(/^\/api\/(expenses|jobs|builders|photos|mileage|reports|pending-events)/)) {
      // Force network request with no HTTP caching to prevent 304 stale responses
      event.respondWith(fetch(request, { cache: 'no-cache' }));
    }
    // Other API calls - network first with cache fallback
    else if (url.pathname.startsWith('/api/')) {
      event.respondWith(networkFirstWithCache(request));
    }
    // Photos - special handling with size limits
    else if (url.pathname.includes('/photos/') || url.pathname.includes('/attached_assets/')) {
      event.respondWith(photoCacheStrategy(request));
    }
    // HTML pages - network first with offline fallback
    else {
      event.respondWith(networkFirstWithOfflineFallback(request));
    }
  }
  // Handle POST/PUT/PATCH/DELETE with background sync
  else if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    event.respondWith(handleMutationWithSync(request));
  }
});

// Cache strategies
async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cached = await cache.match(request);
  
  if (cached) {
    // Update cache in background
    fetch(request).then(response => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
    });
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
      await evictLRUCache(STATIC_CACHE_NAME, CACHE_LIMITS.static);
    }
    return response;
  } catch (error) {
    logger.error('Cache first strategy failed:', error);
    throw error;
  }
}

// Check if cached response is still fresh based on TTL
function isCacheFresh(response, ttl) {
  const cachedTime = response.headers.get('sw-cache-time');
  if (!cachedTime) return false;
  
  const age = Date.now() - parseInt(cachedTime);
  return age < ttl;
}

async function networkFirstWithCache(request) {
  const cache = await caches.open(API_CACHE_NAME);
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      // Add timestamp header for TTL tracking
      const responseToCache = response.clone();
      const headers = new Headers(responseToCache.headers);
      headers.append('sw-cache-time', Date.now().toString());
      
      const modifiedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      // Cache successful responses with timestamp
      await cache.put(request, modifiedResponse);
      await evictLRUCache(API_CACHE_NAME, CACHE_LIMITS.api);
      
      // Add metadata for sync tracking
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'API_SYNCED',
          url: request.url,
          timestamp: new Date().toISOString()
        });
      });
    }
    
    return response;
  } catch (error) {
    // Network failed, try cache
    const cached = await cache.match(request);
    
    if (cached) {
      // Check cache freshness
      if (!isCacheFresh(cached, CACHE_TTL.api)) {
        logger.warn('Cached data is stale but serving due to offline:', request.url);
      } else {
        logger.info('Serving fresh cached data (offline):', request.url);
      }
      
      // Clone and modify response to indicate it's from cache
      const cachedData = await cached.json();
      return new Response(JSON.stringify({
        ...cachedData,
        _offline: true,
        _cachedAt: cached.headers.get('date'),
        _stale: !isCacheFresh(cached, CACHE_TTL.api)
      }), {
        status: 200,
        statusText: 'OK (from cache)',
        headers: {
          'Content-Type': 'application/json',
          'X-From-Cache': 'true',
          'X-Cache-Stale': (!isCacheFresh(cached, CACHE_TTL.api)).toString()
        }
      });
    }
    
    // No cache available
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'Network unavailable and no cached data',
      offline: true
    }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function photoCacheStrategy(request) {
  const cache = await caches.open(PHOTO_CACHE_NAME);
  
  // Try network first
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      // Only cache if under size limit (e.g., 5MB)
      const contentLength = response.headers.get('content-length');
      if (!contentLength || parseInt(contentLength) < 5 * 1024 * 1024) {
        await cache.put(request, response.clone());
        await evictLRUCache(PHOTO_CACHE_NAME, CACHE_LIMITS.photos);
      }
    }
    
    return response;
  } catch (error) {
    // Try cache on network failure
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    
    // Return placeholder image
    return new Response('', {
      status: 404,
      statusText: 'Not Found (Offline)'
    });
  }
}

async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    // Serve offline page for navigation requests
    if (request.mode === 'navigate') {
      const cache = await caches.open(OFFLINE_PAGE_CACHE);
      const offlinePage = await cache.match('/offline.html');
      if (offlinePage) {
        return offlinePage;
      }
    }
    
    throw error;
  }
}

async function handleMutationWithSync(request) {
  try {
    const response = await fetch(request.clone());
    return response;
  } catch (error) {
    // Queue for background sync
    logger.info('Queueing request for sync:', request.url);
    
    // Store request in IndexedDB through client
    const clients = await self.clients.matchAll();
    const requestData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: await request.text(),
      timestamp: new Date().toISOString()
    };
    
    clients.forEach(client => {
      client.postMessage({
        type: 'QUEUE_REQUEST',
        request: requestData
      });
    });
    
    // Register background sync
    await self.registration.sync.register('sync-queue');
    
    // Return optimistic response
    return new Response(JSON.stringify({
      queued: true,
      message: 'Request queued for sync when online',
      queuedAt: new Date().toISOString()
    }), {
      status: 202,
      statusText: 'Accepted (Queued)',
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Background sync event
self.addEventListener('sync', event => {
  logger.debug('Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-queue') {
    event.waitUntil(
      processSyncQueue()
    );
  }
});

async function processSyncQueue() {
  logger.info('Processing sync queue...');
  
  // Notify clients to process their queues
  const clients = await self.clients.matchAll();
  
  await Promise.all(clients.map(client => {
    return new Promise(resolve => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = event => {
        if (event.data.type === 'SYNC_COMPLETE') {
          logger.info('Sync completed for client');
          resolve();
        }
      };
      
      client.postMessage({
        type: 'PROCESS_SYNC_QUEUE'
      }, [messageChannel.port2]);
      
      // Timeout after 30 seconds
      setTimeout(resolve, 30000);
    });
  }));
}

// Message event handler
self.addEventListener('message', event => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CLEAR_ALL_CACHES':
      event.waitUntil(
        caches.keys().then(names => {
          return Promise.all(names.map(name => caches.delete(name)));
        }).then(() => {
          logger.info('All caches cleared');
        })
      );
      break;
      
    case 'CLEAR_CACHE':
      if (data && data.cacheName) {
        event.waitUntil(
          caches.delete(data.cacheName).then(() => {
            logger.info(`Cache cleared: ${data.cacheName}`);
          })
        );
      }
      break;
      
    case 'CACHE_STATUS':
      event.waitUntil(
        getCacheStatus().then(status => {
          event.ports[0].postMessage({
            type: 'CACHE_STATUS_RESPONSE',
            status
          });
        })
      );
      break;
      
    case 'FORCE_UPDATE':
      event.waitUntil(
        self.registration.update().then(() => {
          logger.info('Forced update check');
        })
      );
      break;
  }
});

// Get cache statistics
async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {};
  
  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    status[name] = {
      count: keys.length,
      urls: keys.map(req => req.url)
    };
  }
  
  // Estimate storage usage if available
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    status.storage = {
      usage: estimate.usage,
      quota: estimate.quota,
      percentage: ((estimate.usage / estimate.quota) * 100).toFixed(2)
    };
  }
  
  return status;
}

// Periodic cache cleanup (every hour)
setInterval(async () => {
  logger.debug('Running periodic cache cleanup');
  await evictLRUCache(API_CACHE_NAME, CACHE_LIMITS.api);
  await evictLRUCache(PHOTO_CACHE_NAME, CACHE_LIMITS.photos);
  await evictLRUCache(STATIC_CACHE_NAME, CACHE_LIMITS.static);
}, 60 * 60 * 1000);

logger.info('Service Worker script loaded', { version: VERSION });