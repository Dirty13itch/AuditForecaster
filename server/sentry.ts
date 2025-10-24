import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

const SENTRY_DSN = process.env.SENTRY_DSN;
const NODE_ENV = process.env.NODE_ENV || 'development';

let sentryEnabled = false;

export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn('[Sentry] SENTRY_DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: NODE_ENV,
    enabled: NODE_ENV === 'production',
    
    tracesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,
    
    profilesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,

    integrations: [
      nodeProfilingIntegration(),
    ],

    beforeSend(event, hint) {
      if (NODE_ENV === 'development') {
        console.log('[Sentry] Would send error:', event);
        return null;
      }
      return event;
    },
  });

  sentryEnabled = true;
  console.log('[Sentry] Initialized for environment:', NODE_ENV);
}

export function isSentryEnabled(): boolean {
  return sentryEnabled;
}

export function captureException(error: unknown): void {
  if (sentryEnabled) {
    Sentry.captureException(error);
  }
}

export { Sentry };
