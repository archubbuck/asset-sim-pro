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
docker compose up -d

# Wait for services to be healthy
docker compose ps

# Run E2E tests
npx playwright test
```

## Critical User Journeys (ADR-005)

The following critical user journeys are tested:

### 1. Complete Trading Journey
**Test:** `should complete full trading journey`
- Verifies application loads with "AssetSim Pro" branding
- Navigates through Terminal (Dashboard) -> Execution -> Fund Performance
- Places a trading order with pre-filled default values (AAPL, 100 shares, BUY, MARKET)
- Verifies order confirmation message
- Confirms orders appear in Position Blotter

### 2. Dashboard Widget Display
**Test:** `should display trading terminal with widgets`
- Verifies Dashboard page loads with "Trading Desk" title
- Confirms all three widgets are visible:
  - L2 Market Depth widget
  - Risk Matrix (VaR) widget
  - News Terminal widget

### 3. Navigation Between Sections
**Test:** `should handle navigation between sections`
- Tests navigation drawer links work correctly
- Verifies routes: / -> /dashboard, /portfolio, /trade
- Confirms page content updates appropriately for each section

### 4. Order Entry Form Validation
**Test:** `should display order entry form with validation`
- Verifies order entry form renders with all required fields
- Checks presence of Symbol, Side, Order Type, Quantity fields
- Confirms Place Order button is available

### 5. Position Blotter Display
**Test:** `should display position blotter with orders`
- Verifies Position Blotter grid renders
- Confirms stub data is displayed (AAPL, MSFT, GOOGL, TSLA)
- Checks grid column headers (Order ID, Symbol, Side, Status)

### 6. Order Status Filtering
**Test:** `should filter orders by status in position blotter`
- Tests status filter dropdown functionality
- Filters orders by status (e.g., "Filled")
- Verifies grid updates with filtered results

### 7. Order Submission
**Test:** `should handle order submission and display success message`
- Submits an order with default values
- Verifies success message displays
- Confirms order ID is returned

## Test Implementation Notes

### Authentication
- In local/test environment, authentication is mocked via `MockAuthService`
- No login form required - users are auto-authenticated
- Production uses Azure AD B2C (not tested in E2E)

### Data Modes
- **Stub Mode**: When backend APIs are unavailable, components display pre-defined stub data
- **Live Mode**: When backend is running, real-time data is fetched
- E2E tests work in both modes - they verify UI behavior and interactions

### Component Selectors
Tests use semantic selectors based on actual component implementation:
- Widget components: `app-market-depth`, `app-risk-matrix`, `app-news-terminal`
- Kendo UI components: `kendo-grid`, `kendo-textbox`, `kendo-dropdownlist`, `kendo-numerictextbox`
- Text-based selectors: `text=AssetSim Pro`, `h3:has-text("Order Entry")`

## Configuration

See `playwright.config.ts` for configuration details.
