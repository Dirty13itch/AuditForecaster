/**
 * Session Replay Integration
 * 
 * Provides infrastructure for session replay services (LogRocket, FullStory, etc.)
 * 
 * This is a CONFIGURATION-ONLY implementation. Actual API keys and subscriptions
 * must be obtained by the user.
 * 
 * Environment Variables:
 * - VITE_SESSION_REPLAY_ENABLED: "true" | "false"
 * - VITE_SESSION_REPLAY_PROVIDER: "logrocket" | "fullstory" | "hotjar" | "clarity"
 * - VITE_SESSION_REPLAY_APP_ID: Provider-specific app ID
 * 
 * Privacy Configuration:
 * - All sensitive fields are redacted by default
 * - PII masking is enabled
 * - Sensitive pages can be excluded
 */

import { clientLogger } from "./logger";

/**
 * Session Replay Provider Types
 */
export type SessionReplayProvider = "logrocket" | "fullstory" | "hotjar" | "clarity" | null;

/**
 * User identification data
 */
export interface SessionReplayUser {
  id: string;
  email?: string;
  name?: string;
  role?: string;
  [key: string]: any;
}

/**
 * Custom event data
 */
export interface SessionReplayEvent {
  name: string;
  properties?: Record<string, any>;
}

/**
 * Privacy configuration
 */
export interface PrivacyConfig {
  /** CSS selectors for elements to redact */
  redactSelectors: string[];
  
  /** Input types to mask */
  maskInputTypes: string[];
  
  /** Pages to exclude from recording (pathname patterns) */
  excludePages: string[];
  
  /** Enable/disable console log capture */
  captureConsole: boolean;
  
  /** Enable/disable network request capture */
  captureNetwork: boolean;
}

/**
 * Default privacy configuration
 */
const DEFAULT_PRIVACY_CONFIG: PrivacyConfig = {
  // Redact sensitive elements
  redactSelectors: [
    '[data-sensitive]',
    '[data-private]',
    '[type="password"]',
    '[autocomplete="cc-number"]',
    '[autocomplete="cc-csc"]',
    '[autocomplete="cc-exp"]',
    '.sensitive',
    '.private',
    '.ssn',
    '.credit-card'
  ],
  
  // Mask sensitive input types
  maskInputTypes: [
    'password',
    'email',
    'tel',
    'ssn',
    'credit-card'
  ],
  
  // Exclude sensitive pages
  excludePages: [
    '/admin',
    '/settings/security',
    '/payment',
    '/billing'
  ],
  
  // Console and network capture
  captureConsole: true,
  captureNetwork: true
};

/**
 * Session Replay Manager
 */
class SessionReplayManager {
  private provider: SessionReplayProvider = null;
  private initialized: boolean = false;
  private config: PrivacyConfig;

  constructor(config: Partial<PrivacyConfig> = {}) {
    this.config = { ...DEFAULT_PRIVACY_CONFIG, ...config };
  }

  /**
   * Initialize session replay
   */
  async init(): Promise<void> {
    // Check if enabled
    const enabled = import.meta.env.VITE_SESSION_REPLAY_ENABLED === 'true';
    if (!enabled) {
      clientLogger.info('[SessionReplay] Session replay disabled');
      return;
    }

    // Only run in production to avoid costs and dev clutter
    if (!import.meta.env.PROD) {
      clientLogger.info('[SessionReplay] Session replay disabled in development');
      return;
    }

    // Get provider
    this.provider = (import.meta.env.VITE_SESSION_REPLAY_PROVIDER as SessionReplayProvider) || null;
    if (!this.provider) {
      clientLogger.warn('[SessionReplay] No provider specified');
      return;
    }

    // Get app ID
    const appId = import.meta.env.VITE_SESSION_REPLAY_APP_ID;
    if (!appId) {
      clientLogger.warn('[SessionReplay] No app ID provided');
      return;
    }

    // Check if current page should be excluded
    if (this.shouldExcludePage(window.location.pathname)) {
      clientLogger.info('[SessionReplay] Page excluded from recording:', window.location.pathname);
      return;
    }

    try {
      switch (this.provider) {
        case 'logrocket':
          await this.initLogRocket(appId);
          break;
        case 'fullstory':
          await this.initFullStory(appId);
          break;
        case 'hotjar':
          await this.initHotjar(appId);
          break;
        case 'clarity':
          await this.initClarity(appId);
          break;
        default:
          clientLogger.warn('[SessionReplay] Unknown provider:', this.provider);
      }
    } catch (error) {
      clientLogger.error('[SessionReplay] Initialization failed:', error);
    }
  }

  /**
   * Initialize LogRocket
   * 
   * Features:
   * - Session replay
   * - Console logs
   * - Network requests
   * - Redux state
   * - Performance monitoring
   * 
   * Pricing: ~$99/mo for 10k sessions
   */
  private async initLogRocket(appId: string): Promise<void> {
    clientLogger.info('[SessionReplay] LogRocket initialization (placeholder)');
    
    // PLACEHOLDER: Actual LogRocket initialization
    // Uncomment when you have a subscription:
    
    /*
    import LogRocket from 'logrocket';
    
    LogRocket.init(appId, {
      // Privacy configuration
      dom: {
        inputSanitizer: true,
        textSanitizer: true,
        isEnabled: true
      },
      
      // Network capture
      network: {
        requestSanitizer: (request) => {
          // Redact authorization headers
          if (request.headers['Authorization']) {
            request.headers['Authorization'] = '[REDACTED]';
          }
          return request;
        },
        responseSanitizer: (response) => {
          // Redact sensitive response data
          return response;
        },
        isEnabled: this.config.captureNetwork
      },
      
      // Console capture
      console: {
        isEnabled: this.config.captureConsole,
        shouldAggregateConsoleErrors: true
      },
      
      // Performance
      shouldCaptureIP: false,
      shouldDebugLog: false
    });
    
    // Setup privacy rules
    LogRocket.redactNode(this.config.redactSelectors.join(', '));
    
    this.initialized = true;
    clientLogger.info('[SessionReplay] LogRocket initialized');
    */
  }

  /**
   * Initialize FullStory
   * 
   * Features:
   * - Session replay
   * - Heatmaps
   * - Funnels
   * - Search and segmentation
   * - Integrations
   * 
   * Pricing: ~$199/mo for 10k sessions
   */
  private async initFullStory(appId: string): Promise<void> {
    clientLogger.info('[SessionReplay] FullStory initialization (placeholder)');
    
    // PLACEHOLDER: Actual FullStory initialization
    // Uncomment when you have a subscription:
    
    /*
    import * as FullStory from '@fullstory/browser';
    
    FullStory.init({
      orgId: appId,
      devMode: import.meta.env.DEV,
      
      // Privacy settings
      recordCrossDomainIFrames: false,
      recordOnlyThisIFrame: false
    });
    
    // Privacy rules
    this.config.redactSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        el.classList.add('fs-exclude');
      });
    });
    
    this.initialized = true;
    clientLogger.info('[SessionReplay] FullStory initialized');
    */
  }

  /**
   * Initialize Hotjar
   * 
   * Features:
   * - Session recordings
   * - Heatmaps
   * - Surveys
   * - Feedback polls
   * 
   * Pricing: Free tier available, ~$39/mo for basic
   */
  private async initHotjar(appId: string): Promise<void> {
    clientLogger.info('[SessionReplay] Hotjar initialization (placeholder)');
    
    // PLACEHOLDER: Actual Hotjar initialization
    // Uncomment when you have a subscription:
    
    /*
    window.hj = window.hj || function(){(window.hj.q=window.hj.q||[]).push(arguments)};
    window._hjSettings = { hjid: parseInt(appId), hjsv: 6 };
    
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://static.hotjar.com/c/hotjar-${appId}.js?sv=6`;
    document.head.appendChild(script);
    
    this.initialized = true;
    clientLogger.info('[SessionReplay] Hotjar initialized');
    */
  }

  /**
   * Initialize Microsoft Clarity
   * 
   * Features:
   * - Session recordings
   * - Heatmaps
   * - Free forever
   * 
   * Pricing: FREE
   */
  private async initClarity(appId: string): Promise<void> {
    clientLogger.info('[SessionReplay] Clarity initialization (placeholder)');
    
    // PLACEHOLDER: Actual Clarity initialization
    // Uncomment when you have a subscription:
    
    /*
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", appId);
    
    this.initialized = true;
    clientLogger.info('[SessionReplay] Clarity initialized');
    */
  }

  /**
   * Identify user
   */
  identify(user: SessionReplayUser): void {
    if (!this.initialized) return;

    try {
      switch (this.provider) {
        case 'logrocket':
          // LogRocket.identify(user.id, user);
          clientLogger.info('[SessionReplay] User identified (placeholder):', user.id);
          break;
        case 'fullstory':
          // FullStory.identify(user.id, user);
          clientLogger.info('[SessionReplay] User identified (placeholder):', user.id);
          break;
        case 'hotjar':
          // window.hj('identify', user.id, user);
          clientLogger.info('[SessionReplay] User identified (placeholder):', user.id);
          break;
        case 'clarity':
          // window.clarity('identify', user.id);
          clientLogger.info('[SessionReplay] User identified (placeholder):', user.id);
          break;
      }
    } catch (error) {
      clientLogger.error('[SessionReplay] User identification failed:', error);
    }
  }

  /**
   * Track custom event
   */
  track(event: SessionReplayEvent): void {
    if (!this.initialized) return;

    try {
      switch (this.provider) {
        case 'logrocket':
          // LogRocket.track(event.name, event.properties);
          clientLogger.info('[SessionReplay] Event tracked (placeholder):', event.name);
          break;
        case 'fullstory':
          // FullStory.event(event.name, event.properties || {});
          clientLogger.info('[SessionReplay] Event tracked (placeholder):', event.name);
          break;
        case 'hotjar':
          // Hotjar doesn't support custom events
          break;
        case 'clarity':
          // window.clarity('event', event.name);
          clientLogger.info('[SessionReplay] Event tracked (placeholder):', event.name);
          break;
      }
    } catch (error) {
      clientLogger.error('[SessionReplay] Event tracking failed:', error);
    }
  }

  /**
   * Check if current page should be excluded
   */
  private shouldExcludePage(pathname: string): boolean {
    return this.config.excludePages.some(pattern => {
      return pathname.startsWith(pattern);
    });
  }

  /**
   * Get session URL (for linking to Sentry, etc.)
   */
  getSessionUrl(): string | null {
    if (!this.initialized) return null;

    try {
      switch (this.provider) {
        case 'logrocket':
          // return LogRocket.sessionURL;
          return '[LogRocket session URL would appear here]';
        case 'fullstory':
          // return FullStory.getCurrentSessionURL();
          return '[FullStory session URL would appear here]';
        default:
          return null;
      }
    } catch (error) {
      clientLogger.error('[SessionReplay] Failed to get session URL:', error);
      return null;
    }
  }
}

// Export singleton instance
export const sessionReplay = new SessionReplayManager();

/**
 * Initialize session replay
 * Call this in main.tsx after app initialization
 */
export function initSessionReplay(config?: Partial<PrivacyConfig>): void {
  const manager = new SessionReplayManager(config);
  manager.init();
}

/**
 * Identify current user
 */
export function identifyUser(user: SessionReplayUser): void {
  sessionReplay.identify(user);
}

/**
 * Track custom event
 */
export function trackEvent(event: SessionReplayEvent): void {
  sessionReplay.track(event);
}

/**
 * Get current session URL
 */
export function getSessionUrl(): string | null {
  return sessionReplay.getSessionUrl();
}
