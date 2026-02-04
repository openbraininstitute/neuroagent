import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    // Run test files sequentially to avoid database race conditions
    fileParallelism: false,
    // Suppress console output during tests (stdout/stderr)
    // Set to false to see console output for debugging
    silent: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.ts',
        '**/*.d.ts',
        '.next/',
        'dist/',
      ],
    },
    // Property-based testing configuration
    // @ts-expect-error - fast-check config not in vitest types
    fastCheck: {
      numRuns: 100, // Minimum iterations for property tests
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
