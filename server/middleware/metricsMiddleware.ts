import { Request, Response, NextFunction } from 'express';
import { trackRequestDuration } from '../metrics';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  const originalSend = res.send;
  res.send = function(data: any) {
    const duration = (Date.now() - start) / 1000;
    
    const route = normalizeRoute(req.path);
    
    trackRequestDuration(req.method, route, res.statusCode, duration);
    
    return originalSend.call(this, data);
  };
  
  next();
}

function normalizeRoute(path: string): string {
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[a-zA-Z0-9_-]{20,}/g, '/:id');
}
