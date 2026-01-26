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
- `createExchange(request: CreateExchangeRequest): Observable<ExchangeResponse>` - Create a new exchange ✅ **Implemented**
- `getExchange(exchangeId: string): Observable<ExchangeResponse>` - Get exchange by ID ⚠️ **Backend pending**
- `listExchanges(): Observable<ExchangeResponse[]>` - List all exchanges for the current user ⚠️ **Backend pending**
- `updateExchange(exchangeId: string, request: Partial<CreateExchangeRequest>): Observable<ExchangeResponse>` - Update exchange ⚠️ **Backend pending**
- `deleteExchange(exchangeId: string): Observable<void>` - Delete exchange ⚠️ **Backend pending**

**Backend Status:**
- ✅ `POST /api/v1/exchanges` - Fully implemented in `apps/backend/src/functions/createExchange.ts`
- ⚠️ Other endpoints planned but not yet implemented in backend

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
- `createOrder(request: CreateOrderRequest): Observable<OrderResponse>` - Create a new order ✅ **Implemented**
- `getOrder(orderId: string): Observable<OrderResponse>` - Get order by ID ⚠️ **Backend pending**
- `listOrders(query: ListOrdersQuery): Observable<OrderResponse[]>` - List orders with filters ⚠️ **Backend pending**
- `cancelOrder(orderId: string, exchangeId: string): Observable<OrderResponse>` - Cancel an order ⚠️ **Backend pending**

**Backend Status:**
- ✅ `POST /api/v1/orders` - Fully implemented in `apps/backend/src/functions/createOrder.ts`
- ⚠️ Other endpoints planned but not yet implemented in backend

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
- `getExchangeRules(exchangeId: string): Observable<FeatureFlagResponse>` - Get exchange rules ✅ **Implemented**
- `updateExchangeRules(exchangeId: string, configuration: Partial<FeatureFlagResponse>): Observable<FeatureFlagResponse>` - Update exchange rules ⚠️ **Backend pending**

**Backend Status:**
- ✅ `GET /api/v1/exchange/rules?exchangeId={uuid}` - Fully implemented in `apps/backend/src/functions/getExchangeRules.ts`
- ⚠️ `PUT /api/v1/exchange/rules` - Planned but not yet implemented in backend

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
- **Feature Flag Models**: `FeatureFlagResponse` (imported from `@assetsim/shared/finance-models`), `ExchangeConfig`, `ExchangeFeatureFlags`

These models align with:
- Backend types in `apps/backend/src/types/`
- Shared finance models in `@assetsim/shared/finance-models`
- OpenAPI specifications (available at `GET /api/docs` in dev/staging)

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

All API calls automatically use the error interceptor configured in `libs/client/core/src/lib/services/error.interceptor.ts`. Errors are:
1. Intercepted by the error interceptor
2. Parsed as RFC 7807 Problem Details if available (see ADR-018)
3. Displayed to users via the error notification service (`libs/client/core/src/lib/services/error-notification.service.ts`)
4. Logged to Application Insights

No additional error handling is required in components unless specific behavior is needed.

**RFC 7807 Problem Details Format:**
```json
{
  "type": "https://assetsim.com/errors/insufficient-funds",
  "title": "Insufficient Funds",
  "status": 400,
  "detail": "Order value $50,000 exceeds buying power $10,000.",
  "instance": "/orders/123"
}
```

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
- [apps/backend/README.md](../../../apps/backend/README.md) - Backend API endpoints documentation
- [ADR-006](../../../ARCHITECTURE.md#adr-006-ai-assisted-development) - AI-Assisted Development
- [ADR-007](../../../ARCHITECTURE.md#adr-007-serverless-compute-swa--dedicated-functions) - Serverless Compute (SWA & Dedicated Functions)
- [ADR-017](../../../ARCHITECTURE.md#adr-017-api-documentation--standards) - API Documentation & Standards (OpenAPI/Zod)
- [ADR-018](../../../ARCHITECTURE.md#adr-018-standardized-error-handling) - Standardized Error Handling (RFC 7807)
- [ADR-020](../../../ARCHITECTURE.md#adr-020-reference-implementation---azure-authentication) - Azure Authentication
- [ADR-021](../../../ARCHITECTURE.md#adr-021-reference-implementation---feature-flag-engine) - Feature Flag Engine

## API Endpoint Summary

### Currently Implemented (Backend + Frontend)

| Method | Endpoint | Service Method | Backend Function | Status |
|--------|----------|---------------|------------------|--------|
| POST | `/api/v1/exchanges` | `createExchange()` | `createExchange.ts` | ✅ Production Ready |
| POST | `/api/v1/orders` | `createOrder()` | `createOrder.ts` | ✅ Production Ready |
| GET | `/api/v1/exchange/rules` | `getExchangeRules()` | `getExchangeRules.ts` | ✅ Production Ready |
| GET | `/api/docs` | N/A | `apiDocs.ts` | ✅ Dev/Staging Only |

### Planned (Frontend Ready, Backend Pending)

| Method | Endpoint | Service Method | Status |
|--------|----------|---------------|--------|
| GET | `/api/v1/exchanges/:id` | `getExchange()` | ⚠️ Backend pending |
| GET | `/api/v1/exchanges` | `listExchanges()` | ⚠️ Backend pending |
| PUT | `/api/v1/exchanges/:id` | `updateExchange()` | ⚠️ Backend pending |
| DELETE | `/api/v1/exchanges/:id` | `deleteExchange()` | ⚠️ Backend pending |
| GET | `/api/v1/orders/:id` | `getOrder()` | ⚠️ Backend pending |
| GET | `/api/v1/orders` | `listOrders()` | ⚠️ Backend pending |
| DELETE | `/api/v1/orders/:id` | `cancelOrder()` | ⚠️ Backend pending |
| PUT | `/api/v1/exchange/rules` | `updateExchangeRules()` | ⚠️ Backend pending |

**Note:** The frontend API client services are designed to work with all endpoints. Calling methods for pending endpoints will result in 404 errors until the backend implementations are added.

