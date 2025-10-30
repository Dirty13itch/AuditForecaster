import { Request, Response, NextFunction } from 'express';
import { trackRequestDuration } from '../metrics';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  // Capture metrics on response finish event (captures ALL response types)
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    
    // Normalize route to avoid high cardinality (replace IDs with :id)
    const route = normalizeRoute(req.path);
    
    trackRequestDuration(req.method, route, res.statusCode, duration);
  });
  
  // Also capture on close event (for aborted requests)
  res.on('close', () => {
    if (!res.headersSent) {
      // Request was aborted before response could be sent
      const duration = (Date.now() - start) / 1000;
      const route = normalizeRoute(req.path);
      
      // Track as 499 (client closed request)
      trackRequestDuration(req.method, route, 499, duration);
    }
  });
  
  next();
}

function normalizeRoute(path: string): string {
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[a-zA-Z0-9_-]{20,}/g, '/:id');
}
