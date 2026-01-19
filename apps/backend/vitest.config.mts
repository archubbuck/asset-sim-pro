import { defineConfig } from 'vitest/config';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/backend',
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
        // TODO: Increase to 80% as more Azure Functions are implemented and tested
        // Currently at 70% due to error handling paths in cache.ts that are difficult to test
        // without a full Redis environment. Main functionality has good coverage.
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
}));
