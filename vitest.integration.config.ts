import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['tests/helpers/integrationSetup.ts'],
    include: ['tests/**/*.integration.test.ts'],
    exclude: ['node_modules', 'dist', 'client/**/*'],
    testTimeout: 45000,
    hookTimeout: 45000,
    reporters: 'default',
    retry: 1,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
});
