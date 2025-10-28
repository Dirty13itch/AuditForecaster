import { serverLogger } from '../logger';

/**
 * Troubleshooting guide for a specific authentication issue
 */
export interface TroubleshootingGuide {
  code: string;
  title: string;
  symptoms: string[];
  commonCauses: string[];
  fixes: Array<{
    step: number;
    instruction: string;
    command?: string;
    example?: string;
  }>;
  relatedEndpoints: Array<{
    method: string;
    path: string;
    description: string;
  }>;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'configuration' | 'network' | 'environment' | 'infrastructure';
}

/**
 * All troubleshooting guides
 */
const troubleshootingGuides: Record<string, TroubleshootingGuide> = {
  DOMAIN_NOT_REGISTERED: {
    code: 'DOMAIN_NOT_REGISTERED',
    title: 'Domain Not Registered for Authentication',
    severity: 'critical',
    category: 'configuration',
    symptoms: [
      'Login button redirects but shows "Domain not registered" error',
      'Cannot access protected routes',
      'Error message mentions "unrecognized domain"',
      'Authentication callback fails with domain mismatch',
    ],
    commonCauses: [
      'REPLIT_DOMAINS environment variable is not set',
      'Current domain not included in REPLIT_DOMAINS list',
      'Domain format is incorrect (includes http:// or https://)',
      'Typo in domain name',
      'Using a custom domain that was not registered',
    ],
    fixes: [
      {
        step: 1,
        instruction: 'Open your Replit project Secrets (Tools → Secrets)',
      },
      {
        step: 2,
        instruction: 'Check if REPLIT_DOMAINS secret exists',
      },
      {
        step: 3,
        instruction: 'Add or update REPLIT_DOMAINS with your Repl domain(s)',
        example: 'your-repl.username.repl.co',
      },
      {
        step: 4,
        instruction: 'For multiple domains, separate with commas',
        example: 'domain1.repl.co,domain2.repl.co,localhost',
      },
      {
        step: 5,
        instruction: 'Do NOT include http:// or https:// in domain names',
      },
      {
        step: 6,
        instruction: 'Restart your application after updating secrets',
      },
      {
        step: 7,
        instruction: 'Test domain recognition using the diagnostics endpoint',
      },
    ],
    relatedEndpoints: [
      {
        method: 'GET',
        path: '/api/health',
        description: 'Check registered domains and current domain status',
      },
      {
        method: 'GET',
        path: '/api/auth/diagnostics',
        description: 'View detailed domain configuration (admin only)',
      },
      {
        method: 'POST',
        path: '/api/auth/test-domain',
        description: 'Test if a specific domain would be recognized (admin only)',
      },
    ],
  },

  OIDC_DISCOVERY_FAILURE: {
    code: 'OIDC_DISCOVERY_FAILURE',
    title: 'OpenID Connect Discovery Failed',
    severity: 'critical',
    category: 'network',
    symptoms: [
      'Application fails to start with OIDC discovery error',
      'Login button returns 500 Internal Server Error',
      'Health check shows OIDC status as "failed"',
      'Circuit breaker is in OPEN state',
    ],
    commonCauses: [
      'No internet connection or firewall blocking outbound requests',
      'Replit authentication service is down',
      'Invalid ISSUER_URL environment variable',
      'DNS resolution issues',
      'Circuit breaker opened due to repeated failures',
    ],
    fixes: [
      {
        step: 1,
        instruction: 'Check your internet connection',
      },
      {
        step: 2,
        instruction: 'Verify the ISSUER_URL secret is correct',
        example: 'https://replit.com/oidc',
      },
      {
        step: 3,
        instruction: 'Check health endpoint to see OIDC status',
        command: 'curl https://your-repl.repl.co/api/health',
      },
      {
        step: 4,
        instruction: 'If circuit breaker is OPEN, wait 30 seconds for cooldown period',
      },
      {
        step: 5,
        instruction: 'Try accessing https://replit.com/oidc/.well-known/openid-configuration directly',
      },
      {
        step: 6,
        instruction: 'Check Replit status page for any service outages',
      },
      {
        step: 7,
        instruction: 'Restart your application to retry OIDC discovery',
      },
    ],
    relatedEndpoints: [
      {
        method: 'GET',
        path: '/api/health',
        description: 'Check OIDC discovery status and circuit breaker state',
      },
      {
        method: 'GET',
        path: '/api/auth/diagnostics',
        description: 'View detailed OIDC configuration (admin only)',
      },
    ],
  },

  TOKEN_REFRESH_FAILURE: {
    code: 'TOKEN_REFRESH_FAILURE',
    title: 'Failed to Refresh Authentication Token',
    severity: 'high',
    category: 'infrastructure',
    symptoms: [
      'User is logged out unexpectedly after period of inactivity',
      'Session expires before the configured TTL',
      'Error message about expired or invalid refresh token',
      'User needs to re-login frequently',
    ],
    commonCauses: [
      'Refresh token has expired (longer than max session time)',
      'Session was cleared from database or memory store',
      'Application was restarted (in-memory sessions lost)',
      'OIDC token endpoint is unreachable',
      'User revoked authorization on Replit',
    ],
    fixes: [
      {
        step: 1,
        instruction: 'Check if database is connected for persistent sessions',
      },
      {
        step: 2,
        instruction: 'Verify DATABASE_URL is set in Secrets if using PostgreSQL',
      },
      {
        step: 3,
        instruction: 'For in-memory sessions, note that sessions are lost on restart',
      },
      {
        step: 4,
        instruction: 'Ask user to log in again - this is expected behavior after long inactivity',
      },
      {
        step: 5,
        instruction: 'Check auth metrics to see token refresh success rate',
      },
      {
        step: 6,
        instruction: 'If refresh rate is low, check OIDC discovery status',
      },
    ],
    relatedEndpoints: [
      {
        method: 'GET',
        path: '/api/health',
        description: 'Check session store type and database connectivity',
      },
      {
        method: 'GET',
        path: '/api/auth/metrics',
        description: 'View token refresh success/failure rates (admin only)',
      },
    ],
  },

  SESSION_EXPIRED: {
    code: 'SESSION_EXPIRED',
    title: 'Session Has Expired',
    severity: 'medium',
    category: 'infrastructure',
    symptoms: [
      'User sees "Session expired" message',
      'Redirected to login page when accessing protected routes',
      'Authentication required after period of inactivity',
    ],
    commonCauses: [
      'Session TTL (time to live) has been reached (default: 7 days)',
      'User cleared browser cookies',
      'Session was deleted from session store',
      'Application server restarted (in-memory sessions only)',
      'User logged out from another tab/window',
    ],
    fixes: [
      {
        step: 1,
        instruction: 'This is normal behavior - ask user to log in again',
      },
      {
        step: 2,
        instruction: 'To increase session duration, modify sessionTtl in server/auth.ts',
      },
      {
        step: 3,
        instruction: 'For persistent sessions across restarts, ensure DATABASE_URL is set',
      },
      {
        step: 4,
        instruction: 'Check if cookies are being blocked by browser settings',
      },
      {
        step: 5,
        instruction: 'Verify SameSite cookie policy is appropriate for your setup',
      },
    ],
    relatedEndpoints: [
      {
        method: 'GET',
        path: '/api/health',
        description: 'Check session store configuration',
      },
      {
        method: 'GET',
        path: '/api/login',
        description: 'Initiate new login flow',
      },
    ],
  },

  COOKIE_ISSUES: {
    code: 'COOKIE_ISSUES',
    title: 'Browser Cookie Problems',
    severity: 'medium',
    category: 'configuration',
    symptoms: [
      'Login appears successful but user is not authenticated',
      'Session cookie not being set or sent',
      'Authentication works in one browser but not another',
      'Login works locally but not in production',
    ],
    commonCauses: [
      'Browser blocking third-party cookies',
      'HTTPS not enabled (cookies set to secure: true)',
      'SameSite policy too restrictive',
      'Cookie domain mismatch',
      'Browser privacy settings blocking cookies',
    ],
    fixes: [
      {
        step: 1,
        instruction: 'Verify application is served over HTTPS (Replit always uses HTTPS)',
      },
      {
        step: 2,
        instruction: 'Check browser developer console for cookie-related warnings',
      },
      {
        step: 3,
        instruction: 'Ensure browser is not blocking cookies for your domain',
      },
      {
        step: 4,
        instruction: 'Review cookie settings in server/auth.ts getSession() function',
      },
      {
        step: 5,
        instruction: 'Test in incognito/private browsing mode to rule out extensions',
      },
      {
        step: 6,
        instruction: 'Verify session cookie appears in browser DevTools → Application → Cookies',
      },
    ],
    relatedEndpoints: [
      {
        method: 'GET',
        path: '/api/health',
        description: 'Check overall authentication health',
      },
    ],
  },

  DATABASE_CONNECTIVITY: {
    code: 'DATABASE_CONNECTIVITY',
    title: 'Database Connection Issues',
    severity: 'high',
    category: 'infrastructure',
    symptoms: [
      'Warning about in-memory session store in logs',
      'Sessions lost after application restart',
      'Database connection errors in health check',
      'Cannot persist user data or sessions',
    ],
    commonCauses: [
      'DATABASE_URL environment variable not set',
      'Database service is not running',
      'Invalid database connection string',
      'Network connectivity issues to database',
      'Database credentials are incorrect',
    ],
    fixes: [
      {
        step: 1,
        instruction: 'Create a PostgreSQL database in Replit (Database icon in left sidebar)',
      },
      {
        step: 2,
        instruction: 'DATABASE_URL will be automatically set by Replit',
      },
      {
        step: 3,
        instruction: 'If manually setting, format: postgresql://user:password@host:port/database',
      },
      {
        step: 4,
        instruction: 'Restart application after setting DATABASE_URL',
      },
      {
        step: 5,
        instruction: 'Check health endpoint to verify database connectivity',
      },
      {
        step: 6,
        instruction: 'Review application logs for database connection errors',
      },
      {
        step: 7,
        instruction: 'For development, in-memory sessions are acceptable (data lost on restart)',
      },
    ],
    relatedEndpoints: [
      {
        method: 'GET',
        path: '/api/health',
        description: 'Check database connectivity status',
      },
      {
        method: 'GET',
        path: '/api/auth/diagnostics',
        description: 'View session statistics and database info (admin only)',
      },
    ],
  },

  INVALID_REPL_ID: {
    code: 'INVALID_REPL_ID',
    title: 'Invalid or Missing REPL_ID',
    severity: 'critical',
    category: 'environment',
    symptoms: [
      'Application fails to start with REPL_ID error',
      'OIDC configuration cannot be initialized',
      'Health check shows REPL_ID validation failed',
    ],
    commonCauses: [
      'REPL_ID environment variable not automatically set by Replit',
      'Running application outside of Replit environment',
      'REPL_ID was manually set to incorrect value',
      'Using old Replit deployment that does not provide REPL_ID',
    ],
    fixes: [
      {
        step: 1,
        instruction: 'REPL_ID is automatically provided by Replit - do not manually set it',
      },
      {
        step: 2,
        instruction: 'If missing, try stopping and starting your Repl',
      },
      {
        step: 3,
        instruction: 'Check if you are running inside a Repl environment',
      },
      {
        step: 4,
        instruction: 'Contact Replit support if REPL_ID is still not available',
      },
      {
        step: 5,
        instruction: 'For local development, you will need to manually set REPL_ID',
        example: 'Use your Repl UUID from the Replit URL',
      },
    ],
    relatedEndpoints: [
      {
        method: 'GET',
        path: '/api/health',
        description: 'Check REPL_ID validation status',
      },
      {
        method: 'GET',
        path: '/api/auth/diagnostics',
        description: 'View REPL_ID value (admin only)',
      },
    ],
  },

  MISSING_ENV_VARS: {
    code: 'MISSING_ENV_VARS',
    title: 'Missing Required Environment Variables',
    severity: 'critical',
    category: 'environment',
    symptoms: [
      'Application fails to start with environment variable error',
      'Validation report shows missing variables',
      'Health check indicates configuration failures',
    ],
    commonCauses: [
      'Required secrets not set in Replit Secrets',
      'Typo in secret name',
      'Secrets not synchronized after adding',
      'Environment variables cleared or deleted',
    ],
    fixes: [
      {
        step: 1,
        instruction: 'Open Replit Secrets panel (Tools → Secrets)',
      },
      {
        step: 2,
        instruction: 'Ensure the following secrets are set:',
      },
      {
        step: 3,
        instruction: 'REPLIT_DOMAINS - Your Repl domain(s), comma-separated',
        example: 'your-repl.username.repl.co',
      },
      {
        step: 4,
        instruction: 'SESSION_SECRET - Random string at least 32 characters',
        command: 'openssl rand -base64 32',
      },
      {
        step: 5,
        instruction: 'REPL_ID - Should be automatically set by Replit',
      },
      {
        step: 6,
        instruction: 'Optional: DATABASE_URL for persistent sessions',
      },
      {
        step: 7,
        instruction: 'Optional: ISSUER_URL (defaults to https://replit.com/oidc)',
      },
      {
        step: 8,
        instruction: 'Restart application after adding secrets',
      },
    ],
    relatedEndpoints: [
      {
        method: 'GET',
        path: '/api/health',
        description: 'Check environment variable validation',
      },
      {
        method: 'GET',
        path: '/api/auth/diagnostics',
        description: 'View all environment variables (admin only)',
      },
    ],
  },

  CIRCUIT_BREAKER_OPEN: {
    code: 'CIRCUIT_BREAKER_OPEN',
    title: 'Circuit Breaker Protecting System from Failures',
    severity: 'high',
    category: 'infrastructure',
    symptoms: [
      'Login requests using cached configuration',
      'Warning messages about circuit breaker being open',
      'Some authentication operations failing fast',
    ],
    commonCauses: [
      'Multiple consecutive OIDC discovery failures',
      'Network connectivity issues',
      'Replit authentication service experiencing issues',
      'Rate limiting or throttling from OIDC provider',
    ],
    fixes: [
      {
        step: 1,
        instruction: 'Circuit breaker is protecting your app from cascading failures',
      },
      {
        step: 2,
        instruction: 'Wait 30 seconds for cooldown period to elapse',
      },
      {
        step: 3,
        instruction: 'Check network connectivity and OIDC service status',
      },
      {
        step: 4,
        instruction: 'Circuit breaker will automatically attempt recovery in HALF_OPEN state',
      },
      {
        step: 5,
        instruction: 'If successful, circuit will close and normal operation resumes',
      },
      {
        step: 6,
        instruction: 'Check diagnostics for recent auth errors to identify root cause',
      },
    ],
    relatedEndpoints: [
      {
        method: 'GET',
        path: '/api/health',
        description: 'Check circuit breaker state',
      },
      {
        method: 'GET',
        path: '/api/auth/diagnostics',
        description: 'View circuit breaker statistics and recent errors (admin only)',
      },
    ],
  },

  CALLBACK_FAILURE: {
    code: 'CALLBACK_FAILURE',
    title: 'Authentication Callback Failed',
    severity: 'high',
    category: 'configuration',
    symptoms: [
      'Redirected back from Replit login but authentication fails',
      'Error on /api/auth/callback route',
      'CSRF validation errors',
      'State parameter mismatch',
    ],
    commonCauses: [
      'CSRF token validation failed',
      'OAuth state parameter mismatch',
      'Session lost between login initiation and callback',
      'Callback URL not matching registered redirect URI',
      'Network timeout during callback processing',
    ],
    fixes: [
      {
        step: 1,
        instruction: 'Verify cookies are enabled and not being blocked',
      },
      {
        step: 2,
        instruction: 'Check that session is persisting through OAuth redirect',
      },
      {
        step: 3,
        instruction: 'Review callback endpoint logs for specific error messages',
      },
      {
        step: 4,
        instruction: 'Ensure REPLIT_DOMAINS includes the domain used in callback URL',
      },
      {
        step: 5,
        instruction: 'Try clearing browser cookies and cache, then login again',
      },
      {
        step: 6,
        instruction: 'Check auth metrics for callback success rate',
      },
    ],
    relatedEndpoints: [
      {
        method: 'GET',
        path: '/api/auth/metrics',
        description: 'View callback success/failure rates (admin only)',
      },
      {
        method: 'GET',
        path: '/api/health',
        description: 'Check overall authentication health',
      },
    ],
  },

  GENERAL_AUTH_ERROR: {
    code: 'GENERAL_AUTH_ERROR',
    title: 'General Authentication Error',
    severity: 'medium',
    category: 'configuration',
    symptoms: [
      'Authentication not working as expected',
      'Errors during login process',
      'Unable to access protected resources',
    ],
    commonCauses: [
      'Multiple potential issues - requires diagnosis',
      'Configuration problems',
      'Network connectivity issues',
      'Service availability problems',
    ],
    fixes: [
      {
        step: 1,
        instruction: 'Check the /api/health endpoint for system status',
      },
      {
        step: 2,
        instruction: 'Review application logs for specific error messages',
      },
      {
        step: 3,
        instruction: 'Verify all required environment variables are set',
      },
      {
        step: 4,
        instruction: 'Test each component separately using diagnostics endpoint (admin)',
      },
      {
        step: 5,
        instruction: 'Try logging out and logging back in',
      },
      {
        step: 6,
        instruction: 'Contact support with correlation ID from error page',
      },
    ],
    relatedEndpoints: [
      {
        method: 'GET',
        path: '/api/health',
        description: 'Check system health and component status',
      },
      {
        method: 'GET',
        path: '/api/auth/diagnostics',
        description: 'View detailed diagnostics (admin only)',
      },
    ],
  },
};

/**
 * Get troubleshooting guide by error code
 */
export function getTroubleshootingGuide(errorCode: string): TroubleshootingGuide | null {
  const guide = troubleshootingGuides[errorCode.toUpperCase()];
  
  if (guide) {
    serverLogger.debug(`[Troubleshooting] Retrieved guide for error code: ${errorCode}`);
    return guide;
  }
  
  serverLogger.warn(`[Troubleshooting] No guide found for error code: ${errorCode}`);
  return null;
}

/**
 * Get all troubleshooting guides
 */
export function getAllTroubleshootingGuides(): TroubleshootingGuide[] {
  return Object.values(troubleshootingGuides);
}

/**
 * Get troubleshooting guides by category
 */
export function getTroubleshootingGuidesByCategory(
  category: 'configuration' | 'network' | 'environment' | 'infrastructure'
): TroubleshootingGuide[] {
  return Object.values(troubleshootingGuides).filter(guide => guide.category === category);
}

/**
 * Get troubleshooting guides by severity
 */
export function getTroubleshootingGuidesBySeverity(
  severity: 'critical' | 'high' | 'medium' | 'low'
): TroubleshootingGuide[] {
  return Object.values(troubleshootingGuides).filter(guide => guide.severity === severity);
}

/**
 * Search troubleshooting guides
 */
export function searchTroubleshootingGuides(query: string): TroubleshootingGuide[] {
  const lowerQuery = query.toLowerCase();
  
  return Object.values(troubleshootingGuides).filter(guide => {
    return (
      guide.title.toLowerCase().includes(lowerQuery) ||
      guide.symptoms.some(s => s.toLowerCase().includes(lowerQuery)) ||
      guide.commonCauses.some(c => c.toLowerCase().includes(lowerQuery)) ||
      guide.fixes.some(f => f.instruction.toLowerCase().includes(lowerQuery))
    );
  });
}

/**
 * Get suggested troubleshooting guide based on error message
 */
export function suggestTroubleshootingGuide(errorMessage: string): TroubleshootingGuide | null {
  const lowerError = errorMessage.toLowerCase();
  
  if (lowerError.includes('domain') && lowerError.includes('not registered')) {
    return getTroubleshootingGuide('DOMAIN_NOT_REGISTERED');
  }
  
  if (lowerError.includes('oidc') || lowerError.includes('discovery')) {
    return getTroubleshootingGuide('OIDC_DISCOVERY_FAILURE');
  }
  
  if (lowerError.includes('token') && lowerError.includes('refresh')) {
    return getTroubleshootingGuide('TOKEN_REFRESH_FAILURE');
  }
  
  if (lowerError.includes('session') && lowerError.includes('expired')) {
    return getTroubleshootingGuide('SESSION_EXPIRED');
  }
  
  if (lowerError.includes('cookie')) {
    return getTroubleshootingGuide('COOKIE_ISSUES');
  }
  
  if (lowerError.includes('database') || lowerError.includes('db')) {
    return getTroubleshootingGuide('DATABASE_CONNECTIVITY');
  }
  
  if (lowerError.includes('repl_id') || lowerError.includes('repl id')) {
    return getTroubleshootingGuide('INVALID_REPL_ID');
  }
  
  if (lowerError.includes('environment') || lowerError.includes('missing')) {
    return getTroubleshootingGuide('MISSING_ENV_VARS');
  }
  
  if (lowerError.includes('circuit') && lowerError.includes('breaker')) {
    return getTroubleshootingGuide('CIRCUIT_BREAKER_OPEN');
  }
  
  if (lowerError.includes('callback')) {
    return getTroubleshootingGuide('CALLBACK_FAILURE');
  }
  
  return getTroubleshootingGuide('GENERAL_AUTH_ERROR');
}
