import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const NODE_ENV = import.meta.env.MODE;

let sentryEnabled = false;

export function initSentry() {
  if (!SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: NODE_ENV,
    enabled: NODE_ENV === 'production',
    
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    tracesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,
    
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    beforeSend(event, hint) {
      if (NODE_ENV === 'development') {
        return null;
      }
      return event;
    },
  });

  sentryEnabled = true;
}

export function isSentryEnabled(): boolean {
  return sentryEnabled;
}

export function captureException(error: unknown, context?: Sentry.CaptureContext): void {
  if (sentryEnabled) {
    Sentry.captureException(error, context);
  }
}

export { Sentry };
