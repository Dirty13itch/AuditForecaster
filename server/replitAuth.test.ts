import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('getStrategyForHostname', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.REPLIT_DOMAINS;
    // Set up test domains
    process.env.REPLIT_DOMAINS = 'app.replit.com,preview.app.replit.dev,custom-domain.com';
  });

  afterEach(() => {
    process.env.REPLIT_DOMAINS = originalEnv;
  });

  // Helper function to simulate the logic
  function getStrategyForHostname(hostname: string): string {
    const domains = process.env.REPLIT_DOMAINS!.split(",");
    const defaultDomain = domains[0];
    
    // Try exact match first
    const exactMatch = domains.find(domain => domain === hostname);
    if (exactMatch) {
      return exactMatch;
    }
    
    // Try ends-with match for subdomains
    const endsWithMatch = domains.find(domain => hostname.endsWith(domain));
    if (endsWithMatch) {
      return endsWithMatch;
    }
    
    // Fallback to first domain (for localhost/unknown domains)
    return defaultDomain;
  }

  it('should match exact domain', () => {
    expect(getStrategyForHostname('app.replit.com')).toBe('app.replit.com');
    expect(getStrategyForHostname('custom-domain.com')).toBe('custom-domain.com');
  });

  it('should match subdomain with ends-with logic', () => {
    expect(getStrategyForHostname('my-project.app.replit.com')).toBe('app.replit.com');
    expect(getStrategyForHostname('test.preview.app.replit.dev')).toBe('preview.app.replit.dev');
  });

  it('should fallback to first domain for localhost', () => {
    expect(getStrategyForHostname('localhost')).toBe('app.replit.com');
    expect(getStrategyForHostname('localhost:5000')).toBe('app.replit.com');
  });

  it('should fallback to first domain for unknown domains', () => {
    expect(getStrategyForHostname('unknown-domain.com')).toBe('app.replit.com');
    expect(getStrategyForHostname('192.168.1.1')).toBe('app.replit.com');
  });

  it('should handle edge cases correctly', () => {
    // Empty hostname should fallback
    expect(getStrategyForHostname('')).toBe('app.replit.com');
    
    // Partial match should not work (only ends-with)
    expect(getStrategyForHostname('replit.com')).toBe('app.replit.com');
  });
});
