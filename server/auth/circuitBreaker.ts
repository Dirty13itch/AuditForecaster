import { serverLogger } from '../logger';

/**
 * Circuit Breaker states
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit is open, requests fail fast
 * - HALF_OPEN: Testing if service has recovered
 */
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number;
  failureWindowMs: number;
  cooldownPeriodMs: number;
  halfOpenMaxAttempts: number;
}

interface FailureRecord {
  timestamp: number;
  error: string;
}

/**
 * Circuit Breaker implementation for OIDC discovery
 * Prevents cascading failures by opening circuit after threshold failures
 */
export class CircuitBreaker<T> {
  private state: CircuitState = 'CLOSED';
  private failures: FailureRecord[] = [];
  private lastFailureTime: number = 0;
  private halfOpenAttempts: number = 0;
  private cachedResult: T | null = null;
  private config: CircuitBreakerConfig;
  
  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = {
      failureThreshold: 5,
      failureWindowMs: 60000, // 60 seconds
      cooldownPeriodMs: 30000, // 30 seconds
      halfOpenMaxAttempts: 3,
      ...config,
    };
    
    serverLogger.info('[CircuitBreaker] Initialized with config:', this.config);
  }
  
  /**
   * Execute a function through the circuit breaker
   */
  async execute<R extends T>(
    fn: () => Promise<R>,
    fallback?: () => Promise<R>
  ): Promise<R> {
    // Check if we should attempt recovery
    this.checkRecovery();
    
    // If circuit is open, use cached result or fail fast
    if (this.state === 'OPEN') {
      serverLogger.warn('[CircuitBreaker] Circuit is OPEN, using cached result or fallback');
      
      if (this.cachedResult) {
        return this.cachedResult as R;
      }
      
      if (fallback) {
        return fallback();
      }
      
      throw new Error('Circuit breaker is open and no cached result available');
    }
    
    // Try to execute the function
    try {
      const result = await fn();
      this.onSuccess(result);
      return result;
    } catch (error) {
      this.onFailure(error);
      
      // If we have a cached result, return it
      if (this.cachedResult) {
        serverLogger.warn('[CircuitBreaker] Request failed, returning cached result');
        return this.cachedResult as R;
      }
      
      // If we have a fallback, use it
      if (fallback) {
        serverLogger.warn('[CircuitBreaker] Request failed, using fallback');
        return fallback();
      }
      
      throw error;
    }
  }
  
  /**
   * Called when a request succeeds
   */
  private onSuccess(result: T) {
    if (this.state === 'HALF_OPEN') {
      serverLogger.info('[CircuitBreaker] Half-open request succeeded, closing circuit');
      this.state = 'CLOSED';
      this.failures = [];
      this.halfOpenAttempts = 0;
    }
    
    // Cache the successful result
    this.cachedResult = result;
  }
  
  /**
   * Called when a request fails
   */
  private onFailure(error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const now = Date.now();
    
    // Add failure record
    this.failures.push({
      timestamp: now,
      error: errorMessage,
    });
    this.lastFailureTime = now;
    
    // Clean up old failures outside the window
    this.cleanupOldFailures();
    
    serverLogger.error('[CircuitBreaker] Request failed', {
      error: errorMessage,
      failureCount: this.failures.length,
      threshold: this.config.failureThreshold,
      state: this.state,
    });
    
    // Check if we should open the circuit
    if (this.state === 'HALF_OPEN') {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.config.halfOpenMaxAttempts) {
        this.openCircuit();
      }
    } else if (this.state === 'CLOSED') {
      if (this.failures.length >= this.config.failureThreshold) {
        this.openCircuit();
      }
    }
  }
  
  /**
   * Open the circuit
   */
  private openCircuit() {
    serverLogger.error('[CircuitBreaker] Opening circuit', {
      failureCount: this.failures.length,
      threshold: this.config.failureThreshold,
      cooldownPeriod: `${this.config.cooldownPeriodMs}ms`,
    });
    
    this.state = 'OPEN';
  }
  
  /**
   * Check if we should attempt recovery
   */
  private checkRecovery() {
    if (this.state === 'OPEN') {
      const now = Date.now();
      const timeSinceLastFailure = now - this.lastFailureTime;
      
      if (timeSinceLastFailure >= this.config.cooldownPeriodMs) {
        serverLogger.info('[CircuitBreaker] Cooldown period elapsed, entering HALF_OPEN state');
        this.state = 'HALF_OPEN';
        this.halfOpenAttempts = 0;
      }
    }
  }
  
  /**
   * Clean up old failure records outside the window
   */
  private cleanupOldFailures() {
    const now = Date.now();
    const cutoff = now - this.config.failureWindowMs;
    this.failures = this.failures.filter(f => f.timestamp > cutoff);
  }
  
  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }
  
  /**
   * Get failure count
   */
  getFailureCount(): number {
    return this.failures.length;
  }
  
  /**
   * Get cached result if available
   */
  getCachedResult(): T | null {
    return this.cachedResult;
  }
  
  /**
   * Manually reset the circuit breaker
   */
  reset() {
    serverLogger.info('[CircuitBreaker] Manually resetting circuit');
    this.state = 'CLOSED';
    this.failures = [];
    this.halfOpenAttempts = 0;
  }
}
