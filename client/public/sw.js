const CACHE_NAME = 'field-inspection-v1';
const API_CACHE_NAME = 'field-inspection-api-v1';
const STATIC_CACHE_NAME = 'field-inspection-static-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.png',
];

const API_ROUTES = [
  '/api/jobs',
  '/api/builders',
  '/api/schedule-events',
  '/api/expenses',
  '/api/mileage-logs',
  '/api/forecasts',
  '/api/report-instances',
];

// Logger that integrates with centralized logger via postMessage
// All logs are sent to main thread which uses centralized logger
const logger = {
  _postLog: async (level, message, ...args) => {
    // Post log to all clients (main thread) which will use centralized logger
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SW_LOG',
        level,
        message,
        args
      });
    });
  },
  
  info: (message, ...args) => logger._postLog('info', message, ...args),
  warn: (message, ...args) => logger._postLog('warn', message, ...args),
  error: (message, ...args) => logger._postLog('error', message, ...args),
  debug: (message, ...args) => logger._postLog('debug', message, ...args),
};

self.addEventListener('install', (event) => {
  logger.info('Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      logger.info('Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  logger.info('Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== API_CACHE_NAME && 
              cacheName !== STATIC_CACHE_NAME) {
            logger.info('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method === 'GET') {
    if (url.pathname.startsWith('/api/')) {
      event.respondWith(networkFirstStrategy(request));
    } else if (
      url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|woff|woff2)$/) ||
      STATIC_ASSETS.includes(url.pathname)
    ) {
      event.respondWith(cacheFirstStrategy(request));
    } else {
      event.respondWith(networkFirstStrategy(request));
    }
  }
});

async function networkFirstStrategy(request) {
  const cache = await caches.open(
    request.url.includes('/api/') ? API_CACHE_NAME : CACHE_NAME
  );

  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok && request.url.includes('/api/')) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    logger.warn('Network request failed, trying cache:', request.url);
    
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    if (request.url.includes('/api/')) {
      return new Response(
        JSON.stringify({ 
          error: 'Offline', 
          message: 'No cached data available',
          offline: true 
        }),
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    throw error;
  }
}

async function cacheFirstStrategy(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    logger.error('Failed to fetch:', request.url);
    throw error;
  }
}

self.addEventListener('sync', (event) => {
  logger.debug('Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-queue') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'BACKGROUND_SYNC',
            action: 'process-queue'
          });
        });
      })
    );
  }
});

self.addEventListener('message', (event) => {
  logger.debug('Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});
