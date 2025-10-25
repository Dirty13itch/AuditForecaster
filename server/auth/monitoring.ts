import { serverLogger } from '../logger';

/**
 * Auth event types
 */
export type AuthEventType = 
  | 'login_attempt'
  | 'login_success'
  | 'login_failure'
  | 'callback_attempt'
  | 'callback_success'
  | 'callback_failure'
  | 'token_refresh_attempt'
  | 'token_refresh_success'
  | 'token_refresh_failure'
  | 'logout';

/**
 * Auth event record
 */
export interface AuthEvent {
  id: string;
  type: AuthEventType;
  timestamp: number;
  correlationId?: string;
  userId?: string;
  domain?: string;
  error?: string;
  latency?: number;
}

/**
 * Auth metrics summary
 */
export interface AuthMetrics {
  totalAttempts: number;
  totalSuccesses: number;
  totalFailures: number;
  successRate: number;
  failureRate: number;
  averageLatency: {
    login: number;
    callback: number;
    refresh: number;
  };
  recentEvents: AuthEvent[];
  errorBreakdown: Record<string, number>;
  lastHourStats: {
    attempts: number;
    successes: number;
    failures: number;
  };
}

/**
 * Auth monitoring service
 * Tracks authentication metrics in memory with bounded storage
 */
class AuthMonitoringService {
  private events: AuthEvent[] = [];
  private readonly maxEvents = 1000; // Keep last 1000 events
  private readonly maxAge = 3600 * 1000; // 1 hour
  private eventCounter = 0;
  
  constructor() {
    // Cleanup old events every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }
  
  /**
   * Record an auth event
   */
  recordEvent(
    type: AuthEventType,
    options?: {
      correlationId?: string;
      userId?: string;
      domain?: string;
      error?: string;
      latency?: number;
    }
  ): void {
    const event: AuthEvent = {
      id: `${Date.now()}-${++this.eventCounter}`,
      type,
      timestamp: Date.now(),
      ...options,
    };
    
    this.events.push(event);
    
    // Log the event
    serverLogger.info(`[AuthMonitoring] ${type}`, {
      correlationId: options?.correlationId,
      userId: options?.userId,
      domain: options?.domain,
      error: options?.error,
      latency: options?.latency ? `${options.latency}ms` : undefined,
    });
    
    // Trim if too many events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }
  
  /**
   * Get current metrics
   */
  getMetrics(): AuthMetrics {
    const now = Date.now();
    const oneHourAgo = now - this.maxAge;
    
    // Filter events from last hour
    const recentEvents = this.events.filter(e => e.timestamp > oneHourAgo);
    
    // Calculate totals
    const attempts = recentEvents.filter(e => e.type.includes('attempt')).length;
    const successes = recentEvents.filter(e => e.type.includes('success')).length;
    const failures = recentEvents.filter(e => e.type.includes('failure')).length;
    
    // Calculate rates
    const totalComplete = successes + failures;
    const successRate = totalComplete > 0 ? (successes / totalComplete) * 100 : 0;
    const failureRate = totalComplete > 0 ? (failures / totalComplete) * 100 : 0;
    
    // Calculate average latencies
    const loginEvents = recentEvents.filter(e => 
      (e.type === 'login_success' || e.type === 'login_failure') && e.latency
    );
    const callbackEvents = recentEvents.filter(e => 
      (e.type === 'callback_success' || e.type === 'callback_failure') && e.latency
    );
    const refreshEvents = recentEvents.filter(e => 
      (e.type === 'token_refresh_success' || e.type === 'token_refresh_failure') && e.latency
    );
    
    const avgLoginLatency = this.calculateAverageLatency(loginEvents);
    const avgCallbackLatency = this.calculateAverageLatency(callbackEvents);
    const avgRefreshLatency = this.calculateAverageLatency(refreshEvents);
    
    // Error breakdown
    const errorBreakdown: Record<string, number> = {};
    recentEvents
      .filter(e => e.error)
      .forEach(e => {
        const errorKey = e.error || 'Unknown error';
        errorBreakdown[errorKey] = (errorBreakdown[errorKey] || 0) + 1;
      });
    
    return {
      totalAttempts: attempts,
      totalSuccesses: successes,
      totalFailures: failures,
      successRate: Math.round(successRate * 100) / 100,
      failureRate: Math.round(failureRate * 100) / 100,
      averageLatency: {
        login: avgLoginLatency,
        callback: avgCallbackLatency,
        refresh: avgRefreshLatency,
      },
      recentEvents: recentEvents.slice(-100), // Last 100 events
      errorBreakdown,
      lastHourStats: {
        attempts,
        successes,
        failures,
      },
    };
  }
  
  /**
   * Calculate average latency from events
   */
  private calculateAverageLatency(events: AuthEvent[]): number {
    if (events.length === 0) return 0;
    
    const total = events.reduce((sum, e) => sum + (e.latency || 0), 0);
    return Math.round(total / events.length);
  }
  
  /**
   * Cleanup old events
   */
  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.maxAge;
    const beforeCount = this.events.length;
    
    this.events = this.events.filter(e => e.timestamp > cutoff);
    
    const removedCount = beforeCount - this.events.length;
    if (removedCount > 0) {
      serverLogger.debug(`[AuthMonitoring] Cleaned up ${removedCount} old events`);
    }
  }
  
  /**
   * Clear all metrics (for testing)
   */
  clear(): void {
    this.events = [];
    this.eventCounter = 0;
    serverLogger.info('[AuthMonitoring] All metrics cleared');
  }
}

// Export singleton instance
export const authMonitoring = new AuthMonitoringService();
