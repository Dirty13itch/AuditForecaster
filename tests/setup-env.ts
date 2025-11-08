// Minimal environment bootstrap for unit tests
process.env.REPL_ID ||= '00000000-0000-0000-0000-000000000000';
process.env.SESSION_SECRET ||= 'test-session-secret-12345678901234567890';
process.env.REPLIT_DOMAINS ||= 'localhost';
process.env.ISSUER_URL ||= 'https://replit.com/oidc';
// Note: DATABASE_URL intentionally not set for unit tests.
