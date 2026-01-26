# Trading Feature Library

This Angular library provides a comprehensive trading interface for AssetSim Pro, implementing key trading widgets and real-time market data integration.

## Overview

The Trading feature library is an Angular module that implements the core trading user interface for the AssetSim Pro platform. It provides essential trading functionality through modular, standalone components that work together to create a complete trading desk experience.

**Key capabilities:**
- Real-time order entry and execution
- Live position and order history tracking
- Interactive financial charts for price visualization
- SignalR-based real-time market data updates
- Responsive, enterprise-grade UI with Kendo components

This library was generated with [Nx](https://nx.dev).

## Architecture

### Trading Component (Main Container)

**Implements ADR-022: Trading UI Components**

The `Trading` component serves as the main container that orchestrates all trading widgets in a responsive, dynamic layout. It provides:

- **Responsive Grid Layout**: Automatically adapts to different screen sizes (mobile, tablet, desktop)
- **Real-time Data Connection**: Integrates with SignalR for live market data updates
- **Connection Status Indicator**: Visual feedback showing live data connection state
- **Widget Composition**: Houses Order Entry, Position Blotter, and Financial Chart components

#### Key Features

1. **Signal-based Reactive State**: Uses Angular Signals for efficient reactive updates
2. **Automatic SignalR Connection**: Connects to real-time market data on component initialization
3. **Error Handling**: Integrates with `LoggerService` for robust error management
4. **Configurable**: Uses dependency injection for exchangeId and portfolioId configuration

#### Usage

```typescript
import { Component } from '@angular/core';
import { Trading } from '@assetsim/client/features/trading';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [Trading],
  template: `
    <lib-trading />
  `
})
export class DashboardComponent {}
```

#### Key Files

- **`trading.ts`**: Core component logic implementing SignalR connection and state management
- **`trading.html`**: Template defining the responsive grid layout and widget composition
- **`trading.scss`**: Styling for the trading container, header, connection status indicator, and responsive grid
- **`trading.spec.ts`**: Unit tests covering component initialization, SignalR connection logic, and error handling

#### API Integration Points

The Trading component integrates with the following services:

| Service | Purpose | Usage |
|---------|---------|-------|
| `SignalRService` | Real-time market data | Establishes connection to receive live price updates for all widgets |
| `LoggerService` | Error management | Logs connection errors and exceptions with appropriate severity levels |
| `TRADING_STUB_CONFIG` | Configuration | Provides exchangeId and portfolioId for API calls and stub data |

#### Test Coverage

The `trading.spec.ts` file provides comprehensive test coverage including:

- Component initialization and creation
- Trading desk name display
- Connection status signal exposure
- SignalR automatic connection on initialization with correct exchangeId
- Error handling for connection failures (graceful degradation)
- Mock integration for all dependencies (SignalR, Logger, Configuration)

All tests use Jest with mocked dependencies to ensure isolated unit testing.

## Components

### OrderEntryComponent

Order entry form widget for placing trading orders. Supports BUY/SELL operations with all order types (MARKET/LIMIT/STOP/STOP_LIMIT).

#### Features
- Signal-based state with template-driven form validation
- Real-time price display from SignalR
- Integration with OrderApiService
- Kendo UI form controls
- Dynamic exchangeId and portfolioId configuration

#### Usage

##### Basic Usage with Default IDs
```typescript
import { OrderEntryComponent } from '@assetsim/client/features/trading';

@Component({
  template: `
    <app-order-entry />
  `
})
export class TradingDashboard {}
```

##### Usage with Custom Exchange and Portfolio IDs
```typescript
import { Component, signal } from '@angular/core';
import { OrderEntryComponent } from '@assetsim/client/features/trading';

@Component({
  template: `
    <app-order-entry 
      [exchangeId]="selectedExchangeId()" 
      [portfolioId]="userPortfolioId()" />
  `
})
export class TradingDashboard {
  // These would typically come from user context or state management
  selectedExchangeId = signal('550e8400-e29b-41d4-a716-446655440000');
  userPortfolioId = signal('6ba7b810-9dad-11d1-80b4-00c04fd430c8');
}
```

#### Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `exchangeId` | `string` | `'00000000-0000-0000-0000-000000000000'` | Exchange ID for the trading environment. In production, should be provided from user context or routing. |
| `portfolioId` | `string` | `'11111111-1111-1111-1111-111111111111'` | Portfolio ID for the user's trading portfolio. In production, should be provided from user context or state management. |

### PositionBlotterComponent

Position blotter widget displaying order history and positions using Kendo Grid. Shows FILLED, OPEN (PENDING/PARTIAL), and CANCELLED orders.

#### Features
- Kendo Grid for tabular data display
- Real-time order updates
- Filtering by status
- Order cancellation capability
- Configurable identifiers via dependency injection

#### Usage

##### Basic Usage with Default Configuration
```typescript
import { PositionBlotterComponent } from '@assetsim/client/features/trading';

@Component({
  template: `
    <app-position-blotter />
  `
})
export class TradingDashboard {}
```

##### Usage with Custom Configuration
```typescript
import { Component } from '@angular/core';
import { PositionBlotterComponent, TRADING_STUB_CONFIG, TradingStubConfig } from '@assetsim/client/features/trading';

// Custom configuration for production environment
const productionConfig: TradingStubConfig = {
  exchangeId: '550e8400-e29b-41d4-a716-446655440000',
  portfolioId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  orderIdPrefix: 'prod-order'
};

@Component({
  template: `
    <app-position-blotter />
  `,
  providers: [
    { provide: TRADING_STUB_CONFIG, useValue: productionConfig }
  ]
})
export class TradingDashboard {}
```

#### Configuration

The component uses the `TRADING_STUB_CONFIG` injection token for configuration:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `exchangeId` | `string` | `'00000000-0000-0000-0000-000000000000'` | Exchange ID used for API calls and stub data |
| `portfolioId` | `string` | `'00000000-0000-0000-0000-000000000001'` | Portfolio ID used for stub data |
| `orderIdPrefix` | `string` | `'demo-order'` | Prefix for generating stub order IDs |

## Configuration

### TradingStubConfig

The `TradingStubConfig` interface and `TRADING_STUB_CONFIG` injection token provide a way to configure identifiers used by trading components. This is particularly useful for:

- Testing with different configurations
- Supporting multiple trading environments
- Customizing demo/stub data identifiers

Default configuration is provided at the root level, but can be overridden at the component or module level.

## Running and Testing

### Building the Library

Build the trading library for production:

```bash
nx build trading
```

Build for development:

```bash
nx build trading --configuration=development
```

The built artifacts will be located in `dist/libs/client/features/trading/`.

### Running Unit Tests

Run all unit tests for the trading library:

```bash
nx test trading
```

Run tests in watch mode for development:

```bash
nx test trading --watch
```

Run tests with coverage report:

```bash
nx test trading --coverage
```

Coverage reports are generated in `coverage/libs/client/features/trading/`.

### Linting

Lint the trading library code:

```bash
nx lint trading
```

### Integration with Applications

To use the trading library in an application:

1. Import the `Trading` component or individual components (`OrderEntryComponent`, `PositionBlotterComponent`, `FinancialChartComponent`)
2. Ensure required services (`SignalRService`, `LoggerService`) are provided at the application level
3. Configure `TRADING_STUB_CONFIG` with appropriate exchangeId and portfolioId values

Example application-level setup:

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TRADING_STUB_CONFIG } from '@assetsim/client/features/trading';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    {
      provide: TRADING_STUB_CONFIG,
      useValue: {
        exchangeId: 'your-exchange-id',
        portfolioId: 'your-portfolio-id'
      }
    }
  ]
};
```

## Development

### Widget Composition

The Trading library follows a modular architecture where each widget is a standalone, reusable component:

- **OrderEntryComponent**: Independent order entry form with its own state and API integration
- **PositionBlotterComponent**: Self-contained grid displaying orders and positions
- **FinancialChartComponent**: Standalone chart component for price visualization
- **Trading (Container)**: Orchestrates the widgets and provides shared services

This design allows:
- Individual widgets to be used independently in different contexts
- Easier testing with isolated component tests
- Better code organization and maintainability
- Reusability across different trading interfaces

### Adding New Features

When extending the trading library:

1. Create new standalone components in their own directories
2. Add comprehensive unit tests following the existing patterns
3. Update the `Trading` component if the new feature should be part of the main trading desk
4. Export public APIs through `src/index.ts`
5. Update this README with usage documentation

## Dependencies

### External Dependencies

- **@progress/kendo-angular-\***: Kendo UI components for professional financial UI
- **@microsoft/signalr**: SignalR client for real-time communication
- **@angular/core**: Angular framework (v21+)

### Internal Dependencies

- **@assetsim/client/core**: Provides `SignalRService` and `LoggerService`
- **@assetsim/shared/models**: Shared data models and types

## Related Documentation

- [ADR-022: Trading UI Components](../../../../docs/adr/adr-022-trading-ui-components.md) - Architecture decision record
- [NX Workspace Guide](../../../../NX_WORKSPACE_GUIDE.md) - Nx workspace configuration and commands
- [TESTING.md](../../../../TESTING.md) - Testing strategies and best practices
