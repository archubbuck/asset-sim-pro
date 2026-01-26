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

## Running unit tests

Run `nx test trading` to execute the unit tests.
