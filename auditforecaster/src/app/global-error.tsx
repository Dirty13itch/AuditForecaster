'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        {/*
          global-error.tsx replaces the entire page including root layout,
          so Tailwind CSS from globals.css is NOT available here.
          All styling must use inline styles.
        */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '1rem',
            textAlign: 'center',
            fontFamily:
              'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            backgroundColor: '#fafafa',
            color: '#171717',
          }}
        >
          <div
            style={{
              backgroundColor: '#fef2f2',
              padding: '1.5rem',
              borderRadius: '9999px',
              marginBottom: '1.5rem',
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#dc2626"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </div>

          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              marginBottom: '0.5rem',
            }}
          >
            Something went wrong
          </h1>

          <p
            style={{
              color: '#737373',
              marginBottom: '1.5rem',
              maxWidth: '28rem',
              lineHeight: 1.6,
            }}
          >
            A critical error occurred. Please try again, or return to the
            dashboard if the problem persists.
          </p>

          {process.env.NODE_ENV === 'development' && error?.message && (
            <pre
              style={{
                backgroundColor: '#f5f5f5',
                padding: '1rem',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                textAlign: 'left',
                marginBottom: '1.5rem',
                maxWidth: '28rem',
                overflow: 'auto',
                border: '1px solid #e5e5e5',
                wordWrap: 'break-word',
                whiteSpace: 'pre-wrap',
              }}
            >
              {error.message}
              {error.digest && `\n\nDigest: ${error.digest}`}
            </pre>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => reset()}
              style={{
                backgroundColor: '#171717',
                color: '#ffffff',
                padding: '0.625rem 1.25rem',
                borderRadius: '0.375rem',
                border: 'none',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => (window.location.href = '/dashboard')}
              style={{
                backgroundColor: '#ffffff',
                color: '#171717',
                padding: '0.625rem 1.25rem',
                borderRadius: '0.375rem',
                border: '1px solid #e5e5e5',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
