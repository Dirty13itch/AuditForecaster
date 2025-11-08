import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  setupFiles: ['tests/setup-env.ts'],
    // Unit test include patterns (exclude integration tests that hit live server)
    include: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
    // Explicitly exclude integration/e2e-like tests; they run in separate config
    exclude: [
      'node_modules',
      'dist',
      'client/**/*',
      '**/*.integration.test.ts',
      'tests/offline-sync.test.ts',
      'server/__tests__/reportTemplates.test.ts',
      'server/__tests__/devMode.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'client/',
        '**/*.test.ts',
        'server/seeds/**',
      ],
      thresholds: {
        // Raised after adding targeted coverage for numberUtils & sentry
        lines: 55,
        functions: 45,
        branches: 50,
        statements: 55,
      },
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
});
