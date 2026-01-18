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
      exclude: ['src/**/*.{test,spec}.ts', 'src/types/**/*.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
}));
