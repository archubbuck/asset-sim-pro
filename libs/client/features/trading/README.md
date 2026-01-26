# trading

This library was generated with [Nx](https://nx.dev).

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

## Running unit tests

Run `nx test trading` to execute the unit tests.
