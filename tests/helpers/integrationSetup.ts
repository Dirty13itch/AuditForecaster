import { beforeAll, afterAll } from 'vitest';

const PORT = process.env.PORT || '5000';
const BASE_URL = `http://localhost:${PORT}`;

async function waitForHealth(url: string, timeoutMs = 20000): Promise<void> {
  const start = Date.now();
  let lastErr: any;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return;
    } catch (err) {
      lastErr = err;
    }
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error(`Server did not become healthy within ${timeoutMs}ms${lastErr ? `: ${lastErr}` : ''}`);
}

let stop: undefined | (() => Promise<void>);

beforeAll(async () => {
  // Minimal environment for server to boot in integration mode
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.PORT = PORT;
  process.env.SKIP_AUTH_VALIDATION = 'true';
  process.env.REPLIT_DOMAINS = process.env.REPLIT_DOMAINS || 'localhost,127.0.0.1';
  process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'integration-secret';
  process.env.REPL_ID = process.env.REPL_ID || 'integration';
  process.env.ISSUER_URL = process.env.ISSUER_URL || 'https://replit.com/oidc';

  // Make integration tests use this base URL
  process.env.VITE_API_URL = BASE_URL;

  // Importing the server starts it immediately (server/index.ts auto-starts)
  const serverModule = await import('../../server/index');
  if (typeof (serverModule as any).stopServer === 'function') {
    stop = (serverModule as any).stopServer;
  }

  await waitForHealth(BASE_URL);
});

afterAll(async () => {
  if (stop) {
    try { await stop(); } catch {}
  }
});
