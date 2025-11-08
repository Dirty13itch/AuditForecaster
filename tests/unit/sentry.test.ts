import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We can't spy directly on ESM namespace exports reliably; instead, mock @sentry/node before import
vi.mock('@sentry/node', () => {
  return {
    default: {
      init: vi.fn(),
    },
    init: vi.fn(),
    captureException: vi.fn(),
    addBreadcrumb: vi.fn(),
    setUser: vi.fn(),
    withScope: vi.fn((cb: any) => {
      const scope = {
        setTag: vi.fn(),
        setContext: vi.fn(),
        setExtras: vi.fn(),
      };
      cb(scope);
    }),
    Handlers: {
      errorHandler: vi.fn(() => (req: any, res: any, next: any) => next()),
    },
  };
});

// Mock profiling integration to avoid side effects
vi.mock('@sentry/profiling-node', () => ({
  nodeProfilingIntegration: vi.fn(() => ({})),
}));

async function importFreshSentry() {
  vi.resetModules();
  return await import('../../server/sentry');
}

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV }; // reset per test
  delete process.env.SENTRY_DSN; // default missing
  vi.clearAllMocks();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('server/sentry', () => {
  it('stays disabled without SENTRY_DSN and does not call Sentry APIs', async () => {
    const { isSentryEnabled, initSentry, addBreadcrumb, captureException } = await importFreshSentry();
    expect(isSentryEnabled()).toBe(false);
    initSentry();
    expect(isSentryEnabled()).toBe(false);
    addBreadcrumb('jobs', 'test message');
    captureException(new Error('boom'));
    const sentry = await import('@sentry/node');
    expect((sentry as any).addBreadcrumb).not.toHaveBeenCalled();
    expect((sentry as any).captureException).not.toHaveBeenCalled();
  });

  it('enables Sentry with DSN and forwards breadcrumbs & scoped errors', async () => {
    process.env.SENTRY_DSN = 'https://examplePublicKey@o0.ingest.sentry.io/0';
    process.env.NODE_ENV = 'production';
    const { initSentry, isSentryEnabled, addBreadcrumb, captureErrorWithContext } = await importFreshSentry();
    initSentry();
    expect(isSentryEnabled()).toBe(true);
    addBreadcrumb('jobs', 'queued', { jobId: '123' }, 'warning');
    const sentry = await import('@sentry/node');
    expect((sentry as any).addBreadcrumb).toHaveBeenCalledTimes(1);
    const err = new Error('Boom');
    captureErrorWithContext(err, { jobId: '123', tags: { feature: 'test' }, extra: { foo: 'bar' } });
    expect((sentry as any).withScope).toHaveBeenCalledTimes(1);
    expect((sentry as any).captureException).toHaveBeenCalledWith(err);
  });
});
