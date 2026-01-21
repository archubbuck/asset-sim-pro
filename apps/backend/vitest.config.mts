import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/backend',
  resolve: {
    alias: {
      '@assetsim/shared/error-models': path.resolve(__dirname, '../../libs/shared/error-models/src/index.ts'),
    },
  },
  test: {
    name: 'backend',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/backend',
      provider: 'v8' as const,
      enabled: true,
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/functions/**/*.ts', 'src/lib/**/*.ts'],
      exclude: [
        'src/**/*.{test,spec}.ts',
        'src/types/**/*.ts',
        'src/functions/createExchange.ts', // Exclude until Azure Functions dependencies are available
        'src/functions/createOrder.ts', // Exclude until Azure Functions dependencies are available
        'src/functions/marketEngineTick.ts', // Exclude until Azure Functions dependencies are available
      ],
      thresholds: {
        // TODO: Increase to 80% once Azure Functions dependencies are available
        // Currently at 70% because createOrder.ts, marketEngineTick.ts, and
        // createExchange.ts are excluded from coverage (tests skipped).
        // Lib modules (auth, cache, database) have 74.35% average coverage.
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
}));
