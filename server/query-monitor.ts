import { serverLogger } from './logger';

// Configuration
const SLOW_QUERY_THRESHOLD_MS = 1000; // Log queries taking longer than 1 second
const VERY_SLOW_QUERY_THRESHOLD_MS = 3000; // Warn for queries taking longer than 3 seconds

// Query performance tracking
export interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  stackTrace?: string;
}

const recentSlowQueries: QueryMetrics[] = [];
const MAX_SLOW_QUERIES_TRACKED = 100;

// Wrapper function to monitor query execution time
export async function monitorQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  logDetails?: Record<string, any>
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await queryFn();
    const duration = Date.now() - startTime;
    
    // Log slow queries
    if (duration > VERY_SLOW_QUERY_THRESHOLD_MS) {
      serverLogger.warn(`VERY SLOW QUERY: ${queryName} took ${duration}ms`, {
        duration,
        threshold: VERY_SLOW_QUERY_THRESHOLD_MS,
        ...logDetails
      });
      
      // Track for analytics
      trackSlowQuery(queryName, duration);
    } else if (duration > SLOW_QUERY_THRESHOLD_MS) {
      serverLogger.info(`Slow query: ${queryName} took ${duration}ms`, {
        duration,
        threshold: SLOW_QUERY_THRESHOLD_MS,
        ...logDetails
      });
      
      // Track for analytics
      trackSlowQuery(queryName, duration);
    } else {
      // Log successful fast queries at debug level
      serverLogger.debug(`Query: ${queryName} took ${duration}ms`);
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    serverLogger.error(`Query FAILED: ${queryName} after ${duration}ms`, {
      duration,
      error: error instanceof Error ? error.message : String(error),
      ...logDetails
    });
    throw error;
  }
}

// Track slow queries for analysis
function trackSlowQuery(query: string, duration: number): void {
  const metrics: QueryMetrics = {
    query,
    duration,
    timestamp: new Date(),
  };
  
  recentSlowQueries.push(metrics);
  
  // Keep only recent slow queries
  if (recentSlowQueries.length > MAX_SLOW_QUERIES_TRACKED) {
    recentSlowQueries.shift();
  }
}

// Get slow query statistics
export function getSlowQueryStats(): {
  count: number;
  averageDuration: number;
  slowest: QueryMetrics | null;
  recent: QueryMetrics[];
} {
  if (recentSlowQueries.length === 0) {
    return {
      count: 0,
      averageDuration: 0,
      slowest: null,
      recent: []
    };
  }
  
  const totalDuration = recentSlowQueries.reduce((sum, q) => sum + q.duration, 0);
  const averageDuration = totalDuration / recentSlowQueries.length;
  const slowest = [...recentSlowQueries].sort((a, b) => b.duration - a.duration)[0];
  
  return {
    count: recentSlowQueries.length,
    averageDuration: Math.round(averageDuration),
    slowest,
    recent: recentSlowQueries.slice(-10) // Last 10 slow queries
  };
}

// Clear slow query tracking
export function clearSlowQueryStats(): void {
  recentSlowQueries.length = 0;
  serverLogger.info('Slow query statistics cleared');
}
