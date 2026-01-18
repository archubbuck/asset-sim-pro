# Testing Strategy Implementation (ADR-005)

This document describes the testing strategy for AssetSim Pro, implementing ADR-005 from ARCHITECTURE.md.

## Overview

Per ADR-005, AssetSim Pro enforces a strict testing pyramid with:
- **Unit Testing (Vitest)**: 80% code coverage requirement
- **E2E Testing (Playwright)**: Critical user journeys against Dockerized environment

## Unit Testing with Vitest

### Scope
Unit tests cover all business logic in:
- `libs/client/features/*` - Frontend feature libraries (using **Jest** for Angular components)
- `apps/backend/functions` - Backend Azure Functions (using **Vitest**)

### Coverage Requirements
**80% Code Coverage is required before merge** across:
- Lines
- Functions
- Branches
- Statements

### Running Unit Tests

```bash
# Run all unit tests via Nx
npm test

# Run backend tests (Vitest)
npm run backend:test
npm run backend:test:coverage

# Run client feature tests (Jest via Nx)
npx nx test trading

# Run with coverage in watch mode
npm run test:unit:watch
```

### Test Frameworks
- **Backend (apps/backend)**: Uses Vitest for fast, modern testing
- **Client Libraries (libs/client/features/*)**: Uses Jest with jest-preset-angular for Angular components
- Both frameworks enforce 80% coverage threshold

### Configuration
- Backend: `apps/backend/vitest.config.mts`
- Trading library: `libs/client/features/trading/jest.config.cts`
- Finance models: `libs/shared/finance-models/vitest.config.mts`

## E2E Testing with Playwright

### Scope
E2E tests simulate critical user journeys:
1. **Login → Place Order → Verify Blotter** (Primary journey)
2. Dashboard Widget Display
3. Navigation between sections

### Execution Environment
Per ADR-003, E2E tests **must run against the Dockerized Local Environment** in CI:
- SQL Server 2022
- Redis
- Azurite (Azure Storage emulator)
- SignalR Emulator

### Running E2E Tests

```bash
# Run E2E tests
npm run test:e2e

# Run with UI (development)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed
```

### Local Development
1. Start the application: `npm start`
2. In another terminal: `npm run test:e2e`

### CI Environment
In CI, Docker Compose is started automatically:
```bash
docker-compose up -d
npm run test:e2e
docker-compose down -v
```

## CI/CD Integration

### GitHub Actions Workflow
The `.github/workflows/ci-testing.yml` workflow enforces ADR-005:

1. **Unit Tests Job**
   - Runs Vitest tests with coverage
   - Enforces 80% coverage threshold
   - Tests both client features and backend functions
   - Uploads coverage reports

2. **E2E Tests Job**
   - Starts Dockerized environment (Docker Compose)
   - Waits for services to be healthy
   - Builds and starts the application
   - Runs Playwright tests
   - Uploads test reports and screenshots
   - Cleans up Docker services

3. **Quality Gate Job**
   - Requires both unit and E2E tests to pass
   - Blocks merge if any test fails

### Quality Gates
- ✅ 80% code coverage (enforced by Vitest config)
- ✅ All unit tests passing
- ✅ All E2E tests passing
- ✅ Tests run against Dockerized environment

## Test Structure

### Unit Tests
```
apps/backend/src/
├── lib/
│   ├── auth.ts
│   ├── auth.spec.ts         # Unit tests
│   ├── database.ts
│   └── database.spec.ts     # Unit tests
└── functions/
    └── createExchange.ts    # (tests to be added)

libs/client/features/trading/src/
└── lib/
    ├── trading.ts
    └── trading.spec.ts      # Unit tests
```

### E2E Tests
```
e2e/
├── README.md
└── critical-journey.spec.ts  # Critical user journeys
```

## Best Practices

### Unit Tests
- Test business logic, not implementation details
- Mock external dependencies (database, APIs)
- Aim for fast, isolated tests
- Use descriptive test names

### E2E Tests
- Focus on critical user flows
- Test happy paths and error cases
- Keep tests independent
- Use page objects for reusability
- Run against realistic environment (Docker)

## Continuous Improvement

### Adding New Tests
1. Unit tests should be added alongside new features
2. Update E2E tests when user journeys change
3. Maintain 80% coverage threshold
4. Run tests locally before pushing

### Monitoring Coverage
```bash
# Generate and view coverage report
npm run test:coverage
open coverage/index.html
```

## References
- [ARCHITECTURE.md ADR-005](./ARCHITECTURE.md#adr-005-testing-strategy--quality-gates)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
