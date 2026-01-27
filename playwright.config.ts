import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E testing against Dockerized Local Environment
 * Per ADR-005: Critical user journeys must run against Docker Compose environment
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? '50%' : undefined,
  reporter: process.env['CI'] ? 'github' : 'list',
  
  use: {
    baseURL: process.env['BASE_URL'] || 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // In CI, only run chromium to match installed browsers; locally test all browsers
  projects: process.env['CI']
    ? [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
      ]
    : [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
        {
          name: 'firefox',
          use: { ...devices['Desktop Firefox'] },
        },
        {
          name: 'webkit',
          use: { ...devices['Desktop Safari'] },
        },
      ],

  // Run local dev server before starting tests
  webServer: process.env['CI']
    ? undefined // In CI, the application is started separately by the CI workflow (see .github/workflows/ci-testing.yml)
    : {
        command: 'npm start',
        url: 'http://localhost:4200',
        reuseExistingServer: !process.env['CI'],
        timeout: 120 * 1000,
      },
});
