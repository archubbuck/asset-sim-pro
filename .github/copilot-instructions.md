# GitHub Copilot Custom Instructions for AssetSim Pro

This document provides custom instructions for GitHub Copilot to ensure code suggestions align with AssetSim Pro's architectural standards and best practices, as defined in ADR-006.

## Project Overview

AssetSim Pro is an enterprise-grade simulation platform for Asset Management Firms, Hedge Funds, and Proprietary Trading Desks. The platform enables training on execution strategies, risk management, and portfolio construction in a controlled, high-fidelity simulation environment.

## Core Technology Stack

### Frontend
- **Framework:** Angular 21+ with Signals-first architecture (Zoneless-ready)
- **UI Library:** Kendo UI for Angular (Theme: "Institutional Slate")
- **Build System:** Nx monorepo
- **State Management:** Angular Signals
- **Styling:** TailwindCSS with custom financial UI components

### Backend
- **Runtime:** Azure Functions (Node.js 20, TypeScript)
- **Data Validation:** Zod schemas (mandatory for all API endpoints)
- **Real-time Communication:** Azure SignalR Service with MessagePack protocol

### Data & Infrastructure
- **Database:** Azure SQL Database with Row-Level Security (RLS)
- **Caching:** Azure Cache for Redis
- **Architecture:** Zero Trust Network with Private Endpoints

## Critical Development Guidelines (ADR-006)

### 1. Kendo Financial Charts (Mandatory)

When generating chart or visualization code:

- **Always use Kendo UI for Angular components**, specifically:
  - `@progress/kendo-angular-charts` for financial data visualization
  - `ChartComponent` for OHLC (Open-High-Low-Close) candles
  - `StockChartComponent` for time-series financial data
  - `SparklineComponent` for inline metrics

- **Chart Types for Financial Data:**
  - Use `candlestick` series for price movements
  - Use `column` series for volume data
  - Use `line` series for moving averages and trends
  - Combine multiple series for comprehensive market views

- **Example Pattern:**
  ```typescript
  import { ChartComponent } from '@progress/kendo-angular-charts';
  
  // OHLC Candlestick Chart
  <kendo-chart [seriesDefaults]="{ type: 'candlestick' }">
    <kendo-chart-series>
      <kendo-chart-series-item 
        [data]="ohlcData" 
        openField="open"
        highField="high"
        lowField="low"
        closeField="close"
        categoryField="date">
      </kendo-chart-series-item>
    </kendo-chart-series>
  </kendo-chart>
  ```

- **Never use:** Chart.js, D3.js, or other third-party charting libraries without explicit approval

### 2. Decimal.js for Financial Precision (Mandatory)

When handling monetary values or financial calculations:

- **Always use Decimal.js** (`decimal.js` package) for all financial calculations
- **Never use native JavaScript number arithmetic** for money, percentages, or precise calculations
- Import from `decimal.js`: `import { Decimal } from 'decimal.js';`

- **Critical Use Cases:**
  - Portfolio valuations
  - Order pricing and execution
  - Commission calculations
  - Profit/Loss computations
  - Percentage calculations
  - Interest rate calculations

- **Example Pattern:**
  ```typescript
  import { Decimal } from 'decimal.js';
  
  // Portfolio valuation
  const portfolioValue = new Decimal(cashBalance)
    .plus(positionValue)
    .minus(fees);
  
  // Commission calculation (basis points)
  const commission = new Decimal(orderValue)
    .times(commissionBps)
    .dividedBy(10000);
  
  // Never do this:
  // const total = price * quantity; // ❌ WRONG - precision loss
  
  // Always do this:
  const total = new Decimal(price).times(quantity); // ✅ CORRECT
  ```

- **Conversion Rules:**
  - Input validation: Convert strings to Decimal immediately
  - Database persistence: Use `toString()` or `toNumber()` only at boundaries
  - Display: Use `toFixed(2)` for currency, `toFixed(4)` for quantities

### 3. RxJS Throttling for Real-Time Data (Mandatory)

When handling real-time market data streams or user inputs:

- **Always apply RxJS throttling operators** to prevent UI flooding
- Use appropriate operators based on the use case:
  - `throttleTime()` for regular interval sampling (preferred for market ticks)
  - `debounceTime()` for user input (search, filters)
  - `auditTime()` for ensuring the latest value (price updates)
  - `sampleTime()` for fixed-interval sampling

- **Throttling Standards:**
  - Market data streams: 100-500ms throttle
  - User search inputs: 300ms debounce
  - Portfolio calculations: 250ms throttle
  - Chart updates: 500ms throttle (to reduce re-renders)

- **Example Pattern:**
  ```typescript
  import { throttleTime, debounceTime, distinctUntilChanged } from 'rxjs/operators';
  
  // Market data streaming from SignalR
  marketDataService.priceUpdates$
    .pipe(
      throttleTime(250, undefined, { leading: true, trailing: true }),
      distinctUntilChanged((a, b) => a.price === b.price)
    )
    .subscribe(tick => this.updateChart(tick));
  
  // User search input
  searchControl.valueChanges
    .pipe(
      debounceTime(300),
      distinctUntilChanged()
    )
    .subscribe(query => this.performSearch(query));
  ```

- **Anti-pattern to Avoid:**
  ```typescript
  // ❌ NEVER subscribe directly without throttling for real-time data
  signalrHub.on('newPrices', (data) => {
    this.prices = data; // Will cause performance issues
  });
  ```

## Additional Coding Standards

### Angular Signals (Required)

- **Use Angular Signals** for all state management (Signals-first approach)
- Prefer `signal()`, `computed()`, and `effect()` over traditional RxJS Subject patterns
- Design components for Zoneless execution compatibility

```typescript
// Preferred pattern
private portfolioValue = signal(0);
public displayValue = computed(() => 
  this.portfolioValue().toLocaleString('en-US', { style: 'currency', currency: 'USD' })
);

// Instead of:
// private portfolioValue$ = new BehaviorSubject<number>(0); // ❌ Outdated
```

### Logging (Required)

- **Never use `console.log()`** directly in production code
- **Always use LoggerService** from `@assetsim/client/core`
- Use appropriate log levels:
  - `logEvent()` for user actions and business events
  - `logTrace()` for diagnostic information
  - `logException()` for errors

```typescript
import { LoggerService } from '@assetsim/client/core';

constructor(private logger = inject(LoggerService)) {}

this.logger.logEvent('OrderPlaced', { symbol, quantity, price });
this.logger.logException(error);
```

### Validation (Required)

- **All API inputs must use Zod schemas** for validation
- Define schemas in `libs/shared/finance-models`
- Validate at API boundaries

```typescript
import { z } from 'zod';

const OrderSchema = z.object({
  symbol: z.string().min(1).max(10),
  quantity: z.number().positive(),
  side: z.enum(['BUY', 'SELL', 'SHORT', 'COVER']),
  type: z.enum(['MARKET', 'LIMIT', 'STOP']),
  limitPrice: z.number().positive().optional()
});
```

### Commit Messages (Required)

- Follow Conventional Commits specification
- Format: `<type>(<scope>): <description>`
- Examples:
  - `feat(trading): implement limit order functionality`
  - `fix(portfolio): correct position calculation with Decimal.js`
  - `perf(charts): add RxJS throttling to price updates`

### Testing Standards

- Unit tests with Vitest (80% coverage minimum)
- E2E tests with Playwright for critical flows
- Test financial calculations with edge cases (precision, rounding)

### Security Requirements

- Never hard-code credentials or API keys
- Validate all external inputs with Zod
- Use Row-Level Security (RLS) for multi-tenant data access
- Follow Zero Trust principles (no public access to data services)

## Common Patterns

### Creating a Trading Component

```typescript
import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GridModule } from '@progress/kendo-angular-grid';
import { ChartModule } from '@progress/kendo-angular-charts';
import { Decimal } from 'decimal.js';
import { throttleTime } from 'rxjs/operators';
import { LoggerService } from '@assetsim/client/core';

@Component({
  selector: 'app-order-entry',
  standalone: true,
  imports: [CommonModule, GridModule, ChartModule],
  template: `...`
})
export class OrderEntryComponent {
  private logger = inject(LoggerService);
  
  // Signals for state
  public orderPrice = signal(new Decimal(0));
  public orderQuantity = signal(new Decimal(0));
  public totalValue = computed(() => 
    this.orderPrice().times(this.orderQuantity())
  );
  
  // Throttled price updates
  ngOnInit() {
    this.marketData.priceStream$
      .pipe(throttleTime(250))
      .subscribe(price => {
        this.orderPrice.set(new Decimal(price));
        this.logger.logEvent('PriceUpdated', { price });
      });
  }
}
```

### Market Data Processing

```typescript
// Timer-based ticker generator (backend)
export async function tickerGenerator(timer: Timer, context: InvocationContext) {
  const updates = [];
  
  for (const exchange of activeExchanges) {
    for (const asset of baseAssets) {
      // Apply volatility with Decimal.js
      const volatility = new Decimal(0.01).times(exchange.volatilityMultiplier);
      const change = new Decimal(asset.basePrice)
        .times(volatility)
        .times(Math.random() - 0.5);
      
      // Deadband filter
      if (change.abs().lessThan(0.01)) continue;
      
      const newPrice = new Decimal(asset.basePrice).plus(change);
      
      updates.push({
        exchangeId: exchange.exchangeId,
        symbol: asset.symbol,
        price: newPrice.toFixed(2),
        timestamp: new Date().toISOString()
      });
    }
  }
  
  return { signalROutput: updates };
}
```

## Architecture References

- **ARCHITECTURE.md**: Complete ADR specifications
- **ADR-002**: Zero Trust Network Architecture
- **ADR-003**: Docker Compose for Local Development
- **ADR-004**: Nx Workspace & Kendo UI
- **ADR-005**: Testing Strategy
- **ADR-006**: AI-Assisted Development (this document)

## Questions and Clarifications

When uncertain about implementation details:
1. Refer to ARCHITECTURE.md for authoritative architectural decisions
2. Check existing code patterns in the monorepo
3. Prioritize: Kendo UI > Decimal.js > RxJS throttling
4. Maintain Zero Trust security principles
5. Follow Conventional Commits for all changes

---

**Last Updated:** January 2026  
**Version:** 1.0.0  
**Authority:** ADR-006 from ARCHITECTURE.md
