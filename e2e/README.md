# E2E Tests

This directory contains End-to-End tests using Playwright.

## Running E2E Tests

### Local Development
```bash
# Start the application first
npm start

# In another terminal, run E2E tests
npx playwright test

# Run with UI
npx playwright test --ui

# Run specific test file
npx playwright test e2e/critical-journey.spec.ts
```

### CI Environment
In CI, tests run against the Dockerized Local Environment (per ADR-003):
```bash
# Start Docker Compose
docker-compose up -d

# Wait for services to be healthy
docker-compose ps

# Run E2E tests
npx playwright test
```

## Critical User Journeys (ADR-005)

The following critical user journeys are tested:
1. Login -> Place Order -> Verify Blotter
2. Dashboard Widget Display
3. Navigation between sections

## Configuration

See `playwright.config.ts` for configuration details.
