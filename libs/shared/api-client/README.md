# @assetsim/shared/api-client

Shared API client library for typed backend communication in AssetSim Pro.

## Overview

This library provides type-safe Angular services for communicating with the AssetSim Pro backend API. It centralizes API calls, provides consistent error handling, and ensures type safety across the application.

## Features

- **Type-safe API calls**: All services use typed `Observable<T>` returns based on shared models
- **Centralized error handling**: Integrates with existing error interceptor for consistent error handling
- **Base URL configuration**: Single point of configuration for API base URL
- **Easy to test**: Services can be easily mocked in unit tests
- **Contract traceability**: All types align with backend OpenAPI schemas and shared models

## Services

### BaseApiService

Base service that provides common HTTP operations. All other services extend this class.

**Methods:**
- `protected get<T>(url: string): Observable<T>`
- `protected post<T>(url: string, body: unknown): Observable<T>`
- `protected put<T>(url: string, body: unknown): Observable<T>`
- `protected delete<T>(url: string): Observable<T>`

### ExchangeApiService

Service for exchange-related operations.

**Methods:**
- `createExchange(request: CreateExchangeRequest): Observable<ExchangeResponse>` - Create a new exchange
- `getExchange(exchangeId: string): Observable<ExchangeResponse>` - Get exchange by ID
- `listExchanges(): Observable<ExchangeResponse[]>` - List all exchanges for the current user
- `updateExchange(exchangeId: string, request: Partial<CreateExchangeRequest>): Observable<ExchangeResponse>` - Update exchange
- `deleteExchange(exchangeId: string): Observable<void>` - Delete exchange

**Example:**
```typescript
import { ExchangeApiService } from '@assetsim/shared/api-client';

@Component({...})
export class ExchangeComponent {
  private exchangeApi = inject(ExchangeApiService);

  async createExchange(name: string) {
    const exchange = await firstValueFrom(
      this.exchangeApi.createExchange({ name })
    );
    console.log('Created exchange:', exchange.exchangeId);
  }
}
```

### OrderApiService

Service for order-related operations.

**Methods:**
- `createOrder(request: CreateOrderRequest): Observable<OrderResponse>` - Create a new order
- `getOrder(orderId: string): Observable<OrderResponse>` - Get order by ID
- `listOrders(query: ListOrdersQuery): Observable<OrderResponse[]>` - List orders with filters
- `cancelOrder(orderId: string, exchangeId: string): Observable<OrderResponse>` - Cancel an order

**Example:**
```typescript
import { OrderApiService } from '@assetsim/shared/api-client';

@Component({...})
export class TradingComponent {
  private orderApi = inject(OrderApiService);

  async placeOrder() {
    const order = await firstValueFrom(
      this.orderApi.createOrder({
        exchangeId: this.exchangeId,
        portfolioId: this.portfolioId,
        symbol: 'AAPL',
        side: 'BUY',
        orderType: 'LIMIT',
        quantity: 100,
        price: 150.50
      })
    );
    console.log('Order placed:', order.orderId);
  }
}
```

### FeatureFlagApiService

Service for fetching exchange rules and feature flags.

**Methods:**
- `getExchangeRules(exchangeId: string): Observable<FeatureFlagResponse>` - Get exchange rules
- `updateExchangeRules(exchangeId: string, configuration: Partial<FeatureFlagResponse>): Observable<FeatureFlagResponse>` - Update exchange rules

**Example:**
```typescript
import { FeatureFlagApiService } from '@assetsim/shared/api-client';

@Component({...})
export class ConfigComponent {
  private featureFlagApi = inject(FeatureFlagApiService);

  async loadRules() {
    const rules = await firstValueFrom(
      this.featureFlagApi.getExchangeRules(this.exchangeId)
    );
    console.log('Volatility:', rules.configuration.volatilityIndex);
    console.log('Advanced charts enabled:', rules.flags['enableAdvancedCharts']);
  }
}
```

## Models

All request and response models are exported from the library:

- **Exchange Models**: `CreateExchangeRequest`, `ExchangeResponse`
- **Order Models**: `CreateOrderRequest`, `OrderResponse`, `ListOrdersQuery`, `OrderSide`, `OrderType`, `OrderStatus`

These models align with:
- Backend types in `apps/backend/src/types/`
- Shared finance models in `@assetsim/shared/finance-models`
- OpenAPI specifications

## Installation

This library is already included in the Nx monorepo. To use it in a project:

```typescript
import { 
  ExchangeApiService, 
  OrderApiService, 
  FeatureFlagApiService 
} from '@assetsim/shared/api-client';
```

## Error Handling

All API calls automatically use the error interceptor configured in `libs/client/core`. Errors are:
1. Intercepted by the error interceptor
2. Parsed as RFC 7807 Problem Details if available
3. Displayed to users via the error notification service
4. Logged to Application Insights

No additional error handling is required in components unless specific behavior is needed.

## Testing

All services can be easily tested using Angular's `HttpClientTestingModule`:

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ExchangeApiService } from '@assetsim/shared/api-client';

describe('MyComponent', () => {
  let service: ExchangeApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ExchangeApiService]
    });
    service = TestBed.inject(ExchangeApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should create exchange', () => {
    service.createExchange({ name: 'Test' }).subscribe(response => {
      expect(response.name).toBe('Test');
    });

    const req = httpMock.expectOne('/api/v1/exchanges');
    req.flush({ exchangeId: '123', name: 'Test', createdAt: '2026-01-24', createdBy: '456' });
  });
});
```

## Architecture

The library follows these architectural patterns:

1. **Single Responsibility**: Each service handles one domain (exchanges, orders, feature flags)
2. **DRY Principle**: Common HTTP operations are centralized in BaseApiService
3. **Type Safety**: All operations are fully typed using TypeScript interfaces
4. **Observables**: All operations return RxJS Observables for reactive programming
5. **Dependency Injection**: All services use Angular's DI system with `providedIn: 'root'`

## References

- [BACKEND_FRONTEND_INTEGRATION.md](../../../BACKEND_FRONTEND_INTEGRATION.md) - Integration architecture
- [ADR-006](../../../ARCHITECTURE.md#adr-006-ai-assisted-development) - AI-Assisted Development
- [ADR-007](../../../ARCHITECTURE.md#adr-007-serverless-compute-swa--dedicated-functions) - Serverless Compute (SWA & Dedicated Functions)
- [ADR-020](../../../ARCHITECTURE.md#adr-020-reference-implementation---azure-authentication) - Azure Authentication
- [ADR-021](../../../ARCHITECTURE.md#adr-021-reference-implementation---feature-flag-engine) - Feature Flag Engine

