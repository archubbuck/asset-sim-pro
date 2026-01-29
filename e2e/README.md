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
npx playwright test e2e/auth-flows.spec.ts
npx playwright test e2e/trading-flow.spec.ts

# Run all tests in a specific category
npx playwright test e2e/dashboard-widgets.spec.ts
npx playwright test e2e/position-blotter.spec.ts
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

The following comprehensive test suites cover all major features and user functionality:

### 1. Authentication & Authorization (`auth-flows.spec.ts`)
**Coverage:** User authentication, session management, and RBAC boundaries
- Auto-authentication with MockAuthService in local environment
- User session persistence across navigation
- Display of user avatar and initials
- Buying power display for authenticated users
- RBAC permission boundaries for different user roles
- Access control to trading terminal and execution features

### 2. App Shell & Navigation (`app-shell.spec.ts`)
**Coverage:** Application layout, navigation drawer, and routing
- AppBar display with branding and menu toggle
- Buying power and user avatar in AppBar
- Navigation drawer with route links (Terminal, Execution, Fund Performance)
- Navigation between Dashboard, Trading, and Portfolio pages
- Browser back/forward button handling
- Responsive layout on desktop, tablet, and mobile viewports

### 3. Dashboard Widgets (`dashboard-widgets.spec.ts`)
**Coverage:** Dynamic dashboard, widget rendering, and feature flags
- Dashboard title and fund name display
- Market Depth (L2) widget rendering and functionality
- Risk Matrix (VaR) widget with portfolio risk metrics
- News Terminal widget with financial news feed
- Dynamic widget layout controlled by feature flags (ADR-021)
- Responsive grid layout adaptation
- Widget performance and error-free loading

### 4. Trading Flow (`trading-flow.spec.ts`)
**Coverage:** Order entry, validation, submission, and real-time updates
- Order entry form with all required fields (Symbol, Side, Order Type, Quantity)
- Default values pre-filled in form (AAPL, 100 shares, BUY, MARKET)
- Order submission with custom values
- Success/error message display after submission
- Input validation for empty, zero, negative, and very large values
- Form field interactions (focus, tab navigation, typing)
- SignalR connection handling for real-time price updates
- Trading page layout with order entry and position blotter

### 5. Position Blotter (`position-blotter.spec.ts`)
**Coverage:** Order grid display, filtering, and data management
- Kendo Grid rendering with order data
- Column headers (Order ID, Symbol, Side, Status, etc.)
- Display of stub order data (AAPL, MSFT, GOOGL, TSLA)
- Status filter dropdown functionality (ALL, FILLED, PENDING)
- Grid row interaction (clicking, selection)
- Order display (symbols, sides, quantities, timestamps)
- Responsive blotter layout on different viewports
- Performance with multiple orders

### 6. Financial Charts (`financial-charts.spec.ts`)
**Coverage:** Kendo Charts, OHLC candlesticks, and price visualization
- Financial chart component rendering with Kendo Charts
- OHLC candlestick chart for price movements (per ADR-006)
- Chart SVG visualization with paths/rects for candles
- Chart interactions (hovering, tooltips)
- Time series data display on X/Y axes
- Institutional dark theme styling (Institutional Slate)
- Bullish/bearish candle colors (green/red)
- Chart performance and efficient rendering
- Integration with order entry and position blotter

### 7. Real-time Updates (`realtime-updates.spec.ts`)
**Coverage:** SignalR connection, live ticker updates, and data streaming
- SignalR connection management on trading page load
- Graceful handling of connection success/failure
- Non-blocking UI during connection attempts
- Live ticker updates via MessagePack protocol (ADR-009)
- Continuous market data streaming without memory leaks
- Deadband filtering for price updates (< $0.01 ignored)
- Connection error handling and recovery
- Exchange-scoped broadcast (ticker:{ExchangeId} groups)
- High-frequency update handling without lag

### 8. Error Handling (`error-handling.spec.ts`)
**Coverage:** API errors, network failures, validation, and user messages
- API error responses (400, 404, 500) with graceful handling
- Network timeout and offline mode functionality
- Stub data fallback when backend unavailable
- Input validation for invalid symbols, quantities, and required fields
- User-friendly error messages (no technical stack traces)
- Consistent error message styling
- Error recovery and form resubmission
- Global error handling without app crashes
- Prevention of error cascades

### 9. Exchange Configuration (`exchange-config.spec.ts`)
**Coverage:** Exchange setup, rules, market regimes, and multi-tenancy
- Exchange configuration loading on app initialization
- Exchange ID context in SignalR connections and API calls
- Exchange rules retrieval (GET /api/v1/exchange/rules)
- Market regime configuration (High Volatility, Liquidity Crisis, etc.)
- Regime-specific trading rules and risk metrics
- Multi-tenant isolation (data scoped to current exchange)
- Exchange-specific SignalR groups (ticker:{ExchangeId})
- Prevention of cross-exchange data leakage
- Exchange creation workflow (POST /api/v1/exchanges)
- RiskManager role assignment to exchange creator
- Exchange context persistence across navigation and refresh
- Exchange-scoped dashboard layout and features

### 10. Complete Trading Journey (`critical-journey.spec.ts`)
**Test:** Original critical journey test suite
- Verifies application loads with "AssetSim Pro" branding
- Navigates through Terminal (Dashboard) -> Execution
- Places a trading order with pre-filled default values (AAPL, 100 shares, BUY, MARKET)
- Verifies order confirmation message
- Confirms orders appear in Position Blotter on the same page

## Test Implementation Notes

### Architecture Compliance
All tests follow the architectural decisions defined in [ARCHITECTURE.md](../ARCHITECTURE.md):
- **ADR-002:** Zero Trust Network with Exchange-Scoped RBAC
- **ADR-005:** Testing Strategy - E2E tests run against Dockerized Local Environment
- **ADR-006:** Kendo UI mandatory for financial charts and components
- **ADR-009:** Event-Driven Architecture with SignalR and MessagePack
- **ADR-018:** Standardized Error Handling with Problem Details (RFC 7807)
- **ADR-021:** Feature Flag Engine for dynamic configuration
- **ADR-022:** Trading UI Components implementation

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
- Trading components: `app-order-entry`, `app-position-blotter`, `app-financial-chart`
- Kendo UI components: `kendo-grid`, `kendo-textbox`, `kendo-dropdownlist`, `kendo-numerictextbox`, `kendo-chart`, `kendo-appbar`, `kendo-drawer`
- Text-based selectors: `text=AssetSim Pro`, `h3:has-text("Order Entry")`, `button:has-text("Place Order")`

### Test Organization
Tests are organized by feature area:
- **auth-flows.spec.ts**: Authentication, authorization, and RBAC
- **app-shell.spec.ts**: Application shell, navigation, and routing
- **dashboard-widgets.spec.ts**: Dashboard widgets and dynamic layout
- **trading-flow.spec.ts**: Order entry, validation, and submission
- **position-blotter.spec.ts**: Order grid, filtering, and display
- **financial-charts.spec.ts**: Kendo Charts for OHLC visualization
- **realtime-updates.spec.ts**: SignalR connections and live data streaming
- **error-handling.spec.ts**: Error responses, validation, and recovery
- **exchange-config.spec.ts**: Exchange configuration and multi-tenancy
- **critical-journey.spec.ts**: End-to-end user workflows

### Coverage Metrics
These E2E tests provide comprehensive coverage of:
- ✅ User authentication and authorization flows
- ✅ Application navigation and routing
- ✅ Dashboard widgets and dynamic layouts
- ✅ Trading workflows (order entry and execution)
- ✅ Position blotter and order management
- ✅ Financial charts and price visualization
- ✅ Real-time data updates via SignalR
- ✅ Error handling and validation
- ✅ Exchange configuration and multi-tenancy
- ✅ RBAC permission boundaries
- ✅ Responsive design (desktop, tablet, mobile)
- ✅ Performance and memory management

### Best Practices
1. **Isolation**: Each test is independent and can run in any order
2. **Reliability**: Tests use proper wait strategies and timeouts
3. **Maintainability**: Semantic selectors based on component structure
4. **Performance**: Tests are optimized to run quickly in CI
5. **Readability**: Clear test names and descriptions
6. **Coverage**: Tests cover both happy paths and error scenarios

## Configuration

See `playwright.config.ts` for configuration details.
