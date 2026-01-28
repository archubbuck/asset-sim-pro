# Client Application - AssetSim Pro

## 1. Project Overview

**Institutional Trading Portal** - Angular 21+ Standalone Application with Kendo UI

The AssetSim Pro client is the primary user interface for the enterprise-grade simulation platform. Built with Angular 21+ and leveraging Kendo UI for Angular, it provides a sophisticated institutional-grade trading portal for Asset Management Firms, Hedge Funds, and Proprietary Trading Desks.

### Key Features

- **Real-time Market Data Visualization**: Kendo UI financial charts for OHLC candlesticks and time-series data
- **Trading Execution Interface**: Advanced order entry with Market, Limit, and Stop orders
- **Portfolio Management**: Real-time portfolio tracking with P&L analytics
- **Signals-First Architecture**: Leveraging Angular 21's zoneless change detection with Signals
- **Zero Trust Security**: Integration with Azure AD authentication and secure backend APIs
- **High-Fidelity Simulation**: Configurable market regimes for training and strategy testing

## 2. Directory Structure

```
apps/client/
├── src/
│   ├── app/
│   │   ├── nx-welcome.ts      # Core UI and Nx/Angular commands with helpful onboarding and demo info
│   │   ├── app.config.ts      # Angular app config including Kendo UI, HTTP client, and authentication (ADR-018, ADR-020)
│   │   ├── app.ts             # Root component with Signals-based reactivity
│   │   ├── app.html           # Root template
│   │   ├── app.scss           # Root styles
│   │   └── app.routes.ts      # Application routing configuration
│   ├── index.html             # App entry HTML for the Angular portal
│   ├── main.ts                # Application bootstrap with zoneless change detection
│   └── styles.scss            # Global styles and Kendo UI Institutional Slate theme
├── public/                    # Static assets (favicon, images)
├── project.json               # Nx project configuration
├── tsconfig.app.json          # TypeScript configuration for the app
├── tsconfig.json              # Root TypeScript configuration
└── tsconfig.spec.json         # TypeScript configuration for tests
```

### Key Angular/Kendo UI Configuration

#### Application Configuration (`app.config.ts`)

The application configuration follows **ADR-004** (Nx Workspace with Angular 21+ and Kendo UI), **ADR-018** (HTTP Error Handling), and **ADR-020** (Authentication).

**Key configuration from [`app.config.ts`](./src/app/app.config.ts#L33-L46):**

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    // Zoneless change detection - signals-based reactivity
    provideZonelessChangeDetection(),

    // Router configuration
    provideRouter(appRoutes),

    // Animations required for Kendo UI components
    provideAnimations(),

    // HTTP client with fetch API and error interceptor (ADR-018)
    provideHttpClient(withFetch(), withInterceptors([errorInterceptor])),

    // Authentication service with factory pattern (ADR-020)
    // Automatically uses MockAuthService for localhost, AzureAuthService for production
    provideAuthService(),
  ],
};
```

**Key Features:**

- **Zoneless Change Detection**: Signals-first approach for improved performance
- **Kendo UI Support**: Animation provider required for Kendo components
- **Error Handling**: RFC 7807 compliant error interceptor
- **Authentication**: Factory pattern with automatic environment detection (local vs. Azure AD)

#### Application Entry Point (`index.html`)

**From [`index.html`](./src/index.html):**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>AssetSim Pro - Institutional Trading Portal</title>
    <base href="/" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/x-icon" href="favicon.ico" />
  </head>
  <body>
    <app-root></app-root>
  </body>
</html>
```

#### Nx Welcome Demo & Commands

**From [`nx-welcome.ts`](./src/app/nx-welcome.ts):**

This component provides onboarding information, demo content, and helpful Nx/Angular commands including:

- Sample UI components and styling
- Nx workspace commands and references
- Links to workspace documentation
- Interactive demo with Angular Signals

This is a starter component that can be deleted when starting actual feature development.

## 3. Usage & Quick Start

### Prerequisites

Before starting development on the client application, ensure you have completed the workspace-level setup. See the **[workspace-level README.md](../../README.md#L20-L45)** for initial setup instructions including:

- Node.js 20.x or higher
- npm or yarn package manager
- Docker and Docker Compose for local development
- Local services running (SQL Server, Redis, Azurite, SignalR)

### Initial Setup

1. **Install dependencies** (from workspace root):

   ```bash
   npm install
   ```

2. **Start local services** (required for full functionality):
   ```bash
   docker compose up -d
   npm run db:init
   npm run seed:local
   ```

### Development Commands

```bash
# Start Angular dev server for client app
nx serve client
# or
npm start

# Application will be available at http://localhost:4200

# Build for production
nx build client
# or
npm run build:prod

# Run tests
nx test client

# Run linting
nx lint client

# View dependency graph (includes client and its dependencies)
nx graph
```

### Development Server

The development server starts with:

- **Hot Module Replacement (HMR)** for fast development
- **Zoneless change detection** for optimal performance
- **Kendo UI Institutional Slate theme** pre-configured
- **Mock authentication service** for local development

## 4. Workspace & ADR Reference

### Workspace Structure

AssetSim Pro uses an **Nx monorepo** architecture. For complete workspace breakdown, see:

- **[ARCHITECTURE.md](../../ARCHITECTURE.md)** - Complete architectural decisions (ADR-001 through ADR-024)
- **[NX_WORKSPACE_GUIDE.md](../../docs/development/NX_WORKSPACE_GUIDE.md)** - Nx monorepo usage and commands
- **[GETTING_STARTED.md](../../GETTING_STARTED.md)** - Quick setup guide for local development and Azure deployment

### Relevant ADRs

The client application implements several key architectural decisions:

- **ADR-004**: Nx Workspace with Angular 21+ and Kendo UI
  - See [ARCHITECTURE.md](../../ARCHITECTURE.md) for implementation details
  - Nx monorepo structure with apps and libs
  - Angular 21.1.0 with zoneless change detection
  - Signals-first reactivity approach
  - Kendo UI for Angular with Institutional Slate theme

- **ADR-006**: GitHub Copilot Enterprise for AI-Assisted Development
  - See [.github/copilot-instructions.md](../../.github/copilot-instructions.md)
  - Mandatory use of Kendo UI for financial charts
  - Decimal.js required for financial calculations
  - RxJS throttling for real-time data streams

- **ADR-018**: RFC 7807 Error Handling
  - Implemented via `errorInterceptor` in `app.config.ts`
  - Standardized error responses from backend

- **ADR-020**: Azure AD Authentication
  - Factory pattern with environment detection
  - MockAuthService for local development
  - AzureAuthService for production

### Verification and Testing

For verification procedures and testing strategies, see:

- **[VERIFICATION.md](../../docs/architecture/VERIFICATION.md)** - Post-deployment verification steps
- **[TESTING.md](../../docs/development/TESTING.md)** - Testing strategy and quality gates

## 5. Additional Code References

### Feature Libraries

The client application uses several shared and feature libraries:

- **`libs/client/core/`** - Core authentication and HTTP services
  - `errorInterceptor` - HTTP error handling (ADR-018)
  - `provideAuthService()` - Authentication factory (ADR-020)

- **`libs/client/features/trading/`** - Trading execution logic
  - Order entry components
  - Trade execution services
  - Position management

- **`libs/client/dashboard/`** - Dashboard and analytics features
  - Portfolio overview components
  - Performance analytics
  - Market data visualization

### Shared Types

- **`libs/shared/finance-models/`** - Shared TypeScript types and interfaces
  - `ExchangeConfig`, `Portfolio`, `Order`, `Position`
  - Market data models (OHLC, Quote, Trade)
  - Common financial calculation utilities

- **`libs/shared/auth-models/`** - Authentication types
  - User roles and permissions
  - Token models

- **`libs/shared/api-client/`** - API client services
  - Backend API communication
  - WebSocket/SignalR integration

### Import Examples

```typescript
// Importing shared types
import { ExchangeConfig, Portfolio } from '@assetsim/shared/finance-models';

// Importing feature components
import { TradingComponent } from '@assetsim/client/features/trading';

// Importing core services
import { AuthService } from '@assetsim/client/core';
```

## 6. Kendo UI Components

The client application uses Kendo UI for Angular components for a professional institutional look and feel.

### Available Component Packages

```typescript
// Financial Charts (most commonly used)
import { ChartModule } from '@progress/kendo-angular-charts';
import { StockChartModule } from '@progress/kendo-angular-charts';

// Data Grid
import { GridModule } from '@progress/kendo-angular-grid';

// Layout & Navigation
import { LayoutModule } from '@progress/kendo-angular-layout';
import { NavigationModule } from '@progress/kendo-angular-navigation';

// Forms & Inputs
import { InputsModule } from '@progress/kendo-angular-inputs';
import { DropDownsModule } from '@progress/kendo-angular-dropdowns';
import { DateInputsModule } from '@progress/kendo-angular-dateinputs';

// Dialogs & Notifications
import { DialogsModule } from '@progress/kendo-angular-dialog';
import { NotificationModule } from '@progress/kendo-angular-notification';
```

### Example: Financial Chart Component

```typescript
import { Component, signal } from '@angular/core';
import { ChartModule } from '@progress/kendo-angular-charts';

@Component({
  selector: 'app-price-chart',
  standalone: true,
  imports: [ChartModule],
  template: `
    <kendo-chart [seriesDefaults]="{ type: 'candlestick' }">
      <kendo-chart-series>
        <kendo-chart-series-item
          [data]="ohlcData()"
          openField="open"
          highField="high"
          lowField="low"
          closeField="close"
          categoryField="date"
        >
        </kendo-chart-series-item>
      </kendo-chart-series>
    </kendo-chart>
  `,
})
export class PriceChartComponent {
  ohlcData = signal<OHLCData[]>([]);
}
```

**Note**: Following **ADR-006**, Kendo UI charts are **mandatory** for all financial data visualization in AssetSim Pro.

## 7. Development Guidelines

### Angular Signals Best Practices

The application uses Angular Signals for reactive state management:

```typescript
import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-example',
  standalone: true,
  template: `
    <p>Count: {{ count() }}</p>
    <p>Double: {{ doubleCount() }}</p>
    <button (click)="increment()">Increment</button>
  `,
})
export class ExampleComponent {
  // Signal-based state
  protected count = signal(0);

  // Computed signal
  protected doubleCount = computed(() => this.count() * 2);

  // Update signal
  increment(): void {
    this.count.update((value) => value + 1);
  }
}
```

### Styling with Institutional Slate Theme

The application uses a custom Kendo UI theme. Global styles are in `src/styles.scss`:

```scss
// Kendo UI theme import
@import '@progress/kendo-theme-default/dist/all.scss';

// Custom theme variables for Institutional Slate
$primary-color: #1e293b; // Dark slate
$secondary-color: #3b82f6; // Professional blue
$background-color: #0f172a; // Deep dark
$text-color: #e2e8f0; // Light slate
```

### Code Quality Standards

Following **ADR-001** (Source Control Governance):

- **Commit Messages**: Use Conventional Commits format

  ```bash
  git commit -m "feat(client): add portfolio overview component"
  ```

- **Code Style**: Follows Angular style guide and ESLint rules
- **Testing**: 80% minimum test coverage requirement
- **Type Safety**: Strict TypeScript mode enabled

## 8. Troubleshooting

### Common Issues

**Issue**: Kendo UI components not rendering

- **Solution**: Ensure `provideAnimations()` is included in `app.config.ts`

**Issue**: HTTP requests failing

- **Solution**: Verify local services are running (`docker compose ps`)
- Check `.env.local` configuration

**Issue**: Authentication errors in local development

- **Solution**: MockAuthService should be used automatically for localhost
- Verify `provideAuthService()` is in `app.config.ts`

**Issue**: Build errors with Nx

- **Solution**: Clear Nx cache with `nx reset`
- Reinstall dependencies with `npm install`

### Getting Help

- **Documentation Hub**: [docs/README.md](../../docs/README.md)
- **Contributing Guide**: [CONTRIBUTING.md](../../CONTRIBUTING.md)
- **Architecture Details**: [ARCHITECTURE.md](../../ARCHITECTURE.md)

## 9. Next Steps

After setting up the client application:

1. **Explore the codebase**: Start with `nx-welcome.ts` for Nx command examples
2. **Review architecture**: Read [ARCHITECTURE.md](../../ARCHITECTURE.md) for design decisions
3. **Add features**: Follow [NX_WORKSPACE_GUIDE.md](../../docs/development/NX_WORKSPACE_GUIDE.md) for generating components and libraries
4. **Run tests**: Ensure quality gates with `nx test client`
5. **Deploy**: Follow [DEPLOYMENT_GUIDE.md](../../docs/deployment/DEPLOYMENT_GUIDE.md) for Azure deployment

---

**Version**: 1.0.0  
**Last Updated**: January 28, 2026  
**Architecture**: ADR-004, ADR-006, ADR-018, ADR-020 Compliant
