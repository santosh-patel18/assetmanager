import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', '.next', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/lib/**/*.ts'],
      exclude: [
        'src/lib/auth-context.tsx',  // React context — needs jsdom
        'src/lib/db.ts',             // Prisma client — needs real DB
      ],
      thresholds: {
        // Initial targets — increase as coverage grows
        statements: 50,
        branches: 40,
        functions: 50,
        lines: 50,
      },
    },
    // Timeout for individual tests (ms)
    testTimeout: 10_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
