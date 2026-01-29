# Backend-Frontend Integration Matrix

**Last Updated:** January 23, 2026  
**Purpose:** Document integration points between AssetSim Pro backend and frontend  
**Status:** Phase 5 Integration Work in Progress

---

## Integration Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                       Azure Static Web App                       │
│                      (Angular 21 Frontend)                       │
└────────────────┬───────────────────────────────┬─────────────────┘
                 │                               │
                 │ HTTPS/REST                    │ SignalR/WebSocket
                 │                               │
┌────────────────▼───────────────────────────────▼─────────────────┐
│                    Azure Function App (EP1)                       │
│                    (Node.js 20 Backend)                           │
└───────────────────────────────────────────────────────────────────┘
                 │                               │
                 │                               │
      ┌──────────▼──────────┐         ┌─────────▼──────────┐
      │   Azure SQL DB      │         │  Azure SignalR     │
      │   (Multi-tenant)    │         │  (MessagePack)     │
      └─────────────────────┘         └────────────────────┘
```

---

## Integration Point 1: Shared Type System ✅

**Status:** ✅ FULLY IMPLEMENTED

### Type Library: `@assetsim/shared/finance-models`

| Type                  | Backend Usage               | Frontend Usage                             | Alignment  |
| --------------------- | --------------------------- | ------------------------------------------ | ---------- |
| `ClientPrincipal`     | `auth.ts` - User validation | `azure-auth.service.ts` - State management | ✅ Perfect |
| `AuthResponse`        | N/A (API Gateway)           | `checkSession()` HTTP call                 | ✅ Perfect |
| `ExchangeRole` enum   | RLS policies, RBAC          | Role guards, UI permissions                | ✅ Perfect |
| `ExchangeConfig`      | Database model              | Feature service config                     | ✅ Perfect |
| `FeatureFlagResponse` | API response (planned)      | `feature.service.ts` state                 | ✅ Perfect |

**File Locations:**

```
libs/shared/finance-models/
├── src/
│   ├── lib/
│   │   ├── auth.models.ts        ← ClientPrincipal, AuthResponse, ExchangeRole
│   │   └── finance-models.ts     ← ExchangeConfig, FeatureFlagResponse
│   └── index.ts
```

**Usage Examples:**

```typescript
// Backend: apps/backend/src/lib/auth.ts
import { ClientPrincipal } from '@assetsim/shared/finance-models';

export function requireAuthentication(request: HttpRequest): ClientPrincipal {
  const principal = request.headers.get('x-ms-client-principal');
  // Returns typed ClientPrincipal
}

// Frontend: libs/client/core/src/lib/auth/azure-auth.service.ts
import { AuthResponse, ClientPrincipal } from '@assetsim/shared/finance-models';

#user = signal<ClientPrincipal | null>(null);

public async checkSession(): Promise<void> {
  const response = await firstValueFrom(this.http.get<AuthResponse>('/.auth/me'));
  this.#user.set(response.clientPrincipal);
}
```

---

## Integration Point 2: Error Handling (RFC 7807) ✅

**Status:** ✅ FULLY IMPLEMENTED

### Shared Error Library: `@assetsim/shared/error-models`

| Component                   | Location                                                          | Purpose                           |
| --------------------------- | ----------------------------------------------------------------- | --------------------------------- |
| `ProblemDetails` interface  | `libs/shared/error-models/src/lib/problem-details.ts`             | RFC 7807 base type                |
| Backend error handler       | `apps/backend/src/lib/error-handler.ts`                           | Creates Problem Details responses |
| Frontend error interceptor  | `libs/client/core/src/lib/services/error.interceptor.ts`          | Parses Problem Details            |
| Frontend error notification | `libs/client/core/src/lib/services/error-notification.service.ts` | Displays errors to user           |

**Data Flow:**

```
Backend Error                Frontend Handling
─────────────                ─────────────────
Database error               1. HTTP Interceptor catches error
      ↓                      2. Parses ProblemDetails from response
handleSqlError()             3. ErrorNotificationService displays toast
      ↓                      4. Logger sends exception to App Insights
createProblemDetailsResponse()
      ↓
{
  "type": "https://assetsim.com/errors/not-found",
  "title": "Not Found",
  "status": 404,
  "detail": "Exchange not found",
  "instance": "/api/v1/exchanges/123"
}
```

**Backend Error Types:**

- `VALIDATION_ERROR` (400)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `INSUFFICIENT_FUNDS` (400)
- `SERVICE_UNAVAILABLE` (503)
- `INTERNAL_ERROR` (500)

**Frontend Error Display:**

```typescript
// libs/client/core/src/lib/services/error.interceptor.ts
intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
  return next.handle(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.error && typeof error.error === 'object' && 'type' in error.error) {
        const problemDetails = error.error as ProblemDetails;
        this.errorNotification.showError(problemDetails);
      }
      return throwError(() => error);
    })
  );
}
```

---

## Integration Point 3: Authentication & Authorization ✅

**Status:** ✅ FULLY IMPLEMENTED (Azure Static Web Apps)

### Authentication Flow

```
1. User clicks "Login" button
   ↓
2. Frontend: window.location.href = '/.auth/login/aad'
   ↓
3. Azure Static Web Apps redirects to Entra ID
   ↓
4. User authenticates with corporate credentials
   ↓
5. Azure Static Web Apps sets authentication cookie
   ↓
6. Redirect to /dashboard
   ↓
7. Frontend: checkSession() calls /.auth/me
   ↓
8. Azure Static Web Apps returns ClientPrincipal
   ↓
9. Backend: Functions receive x-ms-client-principal header
   ↓
10. Backend: requireAuthentication() validates user
```

### Role-Based Access Control

| Backend                                             | Frontend                                | Status     |
| --------------------------------------------------- | --------------------------------------- | ---------- |
| `requireAuthentication()` extracts user             | `checkSession()` loads user into signal | ✅ Aligned |
| SQL RLS uses `SESSION_CONTEXT('UserId')`            | Auth service exposes `user` signal      | ✅ Aligned |
| ExchangeRoles table stores RBAC                     | `hasRole()` method checks roles         | ✅ Aligned |
| Three roles: RiskManager, PortfolioManager, Analyst | Same three roles used in UI logic       | ✅ Aligned |

**Frontend Role Guard (Planned):**

```typescript
// libs/client/core/src/lib/auth/role.guard.ts
export function roleGuard(requiredRole: string): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    return auth.hasRole(requiredRole) || inject(Router).parseUrl('/unauthorized');
  };
}

// Usage in routes
{
  path: 'admin',
  component: AdminComponent,
  canActivate: [roleGuard('RiskManager')]
}
```

---

## Integration Point 4: Logging & Observability ✅

**Status:** ✅ FULLY IMPLEMENTED (Application Insights)

### Distributed Tracing

| Component    | Telemetry                                 | Correlation                     |
| ------------ | ----------------------------------------- | ------------------------------- |
| **Frontend** | `LoggerService` → App Insights            | Operation ID in request headers |
| **Backend**  | Azure Functions built-in → App Insights   | Operation ID from headers       |
| **Result**   | End-to-end trace from browser to database | ✅ Full correlation             |

**Frontend Configuration:**

```typescript
// libs/client/core/src/lib/logger/logger.service.ts
this.appInsights = new ApplicationInsights({
  config: {
    connectionString: connectionString,
    enableAutoRouteTracking: true, // Tracks page views
    enableCorsCorrelation: true, // Links frontend to backend traces
    enableAjaxErrorLookup: true, // Tracks HTTP errors
  },
});
```

**Backend Configuration:**

```json
// apps/backend/host.json (Azure Functions)
{
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true
      }
    }
  }
}
```

**Trace Correlation Example:**

```
Frontend Request:
  Operation ID: 12345
  ↓
Backend Function:
  Operation ID: 12345 (inherited)
  Parent ID: frontend-request-span
  ↓
SQL Query:
  Operation ID: 12345 (inherited)
  Parent ID: function-execution-span
```

---

## Integration Point 5: API Contracts ⚠️

**Status:** ⚠️ PARTIALLY IMPLEMENTED (Backend ready, frontend client missing)

### Existing Backend APIs

| Method | Endpoint            | Function            | Zod Schema | OpenAPI         | Frontend Client |
| ------ | ------------------- | ------------------- | ---------- | --------------- | --------------- |
| POST   | `/api/v1/exchanges` | `createExchange.ts` | ✅ Yes     | ✅ Yes          | ❌ Missing      |
| POST   | `/api/v1/orders`    | `createOrder.ts`    | ✅ Yes     | ✅ Yes          | ❌ Missing      |
| GET    | `/api/docs`         | `apiDocs.ts`        | N/A        | ✅ Returns spec | ⚠️ Not consumed |

### Missing Endpoints

| Expected By          | Endpoint                     | Purpose                        | Status             |
| -------------------- | ---------------------------- | ------------------------------ | ------------------ |
| `feature.service.ts` | `GET /api/v1/exchange/rules` | Fetch feature flags and config | ❌ Not implemented |

### Proposed API Client Library

**Structure:**

```
libs/shared/api-client/
├── src/
│   ├── lib/
│   │   ├── base-api.service.ts          ← Base HTTP client
│   │   ├── exchange-api.service.ts      ← Exchange operations
│   │   ├── order-api.service.ts         ← Order operations
│   │   ├── feature-flag-api.service.ts  ← Feature flag fetching
│   │   └── models/                      ← API request/response types
│   │       ├── exchange.models.ts
│   │       └── order.models.ts
│   └── index.ts
```

**Example Implementation:**

```typescript
// libs/shared/api-client/src/lib/exchange-api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ExchangeApiService {
  private readonly baseUrl = '/api/v1';

  constructor(private http: HttpClient) {}

  createExchange(name: string): Observable<ExchangeResponse> {
    return this.http.post<ExchangeResponse>(`${this.baseUrl}/exchanges`, {
      name,
    });
  }

  getExchangeRules(exchangeId: string): Observable<FeatureFlagResponse> {
    return this.http.get<FeatureFlagResponse>(
      `${this.baseUrl}/exchange/rules?exchangeId=${exchangeId}`,
    );
  }
}
```

**Benefits:**

1. ✅ Type-safe API calls using shared models
2. ✅ Centralized error handling via interceptor
3. ✅ Consistent HTTP configuration (base URL, headers)
4. ✅ Easy to mock for testing
5. ✅ Single source of truth for API contracts

---

## Integration Point 6: Real-Time Data (SignalR) ❌

**Status:** ❌ NOT IMPLEMENTED (Backend ready, frontend missing)

### Backend SignalR Implementation ✅

| Component                 | Location                                    | Status          |
| ------------------------- | ------------------------------------------- | --------------- |
| SignalR broadcast utility | `apps/backend/src/lib/signalr-broadcast.ts` | ✅ Complete     |
| Connection management     | Azure SignalR Service                       | ✅ Provisioned  |
| Message protocol          | MessagePack                                 | ✅ Enabled      |
| Group targeting           | `ticker:{ExchangeId}`                       | ✅ Implemented  |
| Data source               | `tickerGenerator.ts` (every 1 second)       | ✅ Broadcasting |

**Backend Broadcasting:**

```typescript
// apps/backend/src/lib/signalr-broadcast.ts
export async function broadcastPriceUpdate(
  priceUpdate: PriceUpdateData,
  basePrice: number,
  context: InvocationContext,
): Promise<void> {
  const signalRMessage = {
    target: 'PriceUpdate',
    arguments: [priceUpdate],
  };

  // Broadcast to exchange-specific group
  context.extraOutputs.set(signalROutput, {
    groupName: `ticker:${priceUpdate.exchangeId}`,
    ...signalRMessage,
  });
}
```

### Frontend SignalR Integration ❌ MISSING

**Proposed Implementation:**

```typescript
// libs/client/core/src/lib/signalr/signalr.service.ts
import { Injectable, signal, DestroyRef } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { MessagePackHubProtocol } from '@microsoft/signalr-protocol-msgpack';

interface PriceUpdateData {
  symbol: string;
  price: number;
  exchangeId: string;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class SignalRService {
  #connection: signalR.HubConnection | null = null;
  #isConnected = signal<boolean>(false);
  #latestPrices = signal<Map<string, PriceUpdateData>>(new Map());

  public readonly isConnected = this.#isConnected.asReadonly();
  public readonly latestPrices = this.#latestPrices.asReadonly();

  constructor(
    private logger: LoggerService,
    private destroyRef: DestroyRef,
  ) {}

  async connect(exchangeId: string): Promise<void> {
    this.#connection = new signalR.HubConnectionBuilder()
      .withUrl('/api')
      .withHubProtocol(new MessagePackHubProtocol())
      .withAutomaticReconnect()
      .build();

    this.#connection.on('PriceUpdate', (data: PriceUpdateData) => {
      const prices = new Map(this.#latestPrices());
      prices.set(data.symbol, data);
      this.#latestPrices.set(prices);
      this.logger.logTrace('Price update received', {
        symbol: data.symbol,
        price: data.price,
      });
    });

    await this.#connection.start();
    await this.#connection.invoke('JoinGroup', `ticker:${exchangeId}`);
    this.#isConnected.set(true);

    this.logger.logEvent('SignalRConnected', { exchangeId });

    // Auto-cleanup on component destruction
    this.destroyRef.onDestroy(() => this.disconnect());
  }

  async disconnect(): Promise<void> {
    if (this.#connection) {
      await this.#connection.stop();
      this.#connection = null;
      this.#isConnected.set(false);
      this.logger.logEvent('SignalRDisconnected');
    }
  }
}
```

**Usage in Components:**

```typescript
// Example trading terminal component
@Component({
  selector: 'app-trading-terminal',
  template: `
    <div class="price-ticker">
      @for (price of signalR.latestPrices() | keyvalue; track price.key) {
        <div class="price-item">
          <span class="symbol">{{ price.value.symbol }}</span>
          <span class="price">{{ price.value.price | currency }}</span>
        </div>
      }
    </div>
  `,
})
export class TradingTerminalComponent {
  protected signalR = inject(SignalRService);
  private auth = inject(AuthService);

  async ngOnInit() {
    const exchangeId = this.auth.user()?.exchangeId;
    if (exchangeId) {
      await this.signalR.connect(exchangeId);
    }
  }
}
```

---

## Integration Checklist

### ✅ Completed Integrations

- [x] Shared type models (`@assetsim/shared/finance-models`)
- [x] Error handling (RFC 7807 Problem Details)
- [x] Authentication flow (Azure Static Web Apps + Entra ID)
- [x] Logging and distributed tracing (Application Insights)
- [x] Backend API implementations (createExchange, createOrder)
- [x] OpenAPI specification generation

### ⚠️ Partially Completed Integrations

- [ ] API client library (backend ready, frontend wrapper missing)
- [ ] Frontend route guards (auth service ready, guards not implemented)
- [ ] Component testing (tests written, animation provider issue)

### ❌ Missing Integrations

- [ ] SignalR real-time data subscription (backend broadcasting, frontend not listening)
- [ ] Backend endpoint: `GET /api/v1/exchange/rules`
- [ ] Trading UI components (order entry, position blotter, charts)
- [ ] E2E integration tests
- [ ] OpenAPI client code generation

---

## Recommended Integration Work Order

### Sprint 1: Fix Foundation Issues

1. **Fix Component Tests** (1 day)
   - Add `provideAnimations()` to test configurations
   - Verify all 80 tests pass

2. **Create API Client Library** (2-3 days)
   - Create `libs/shared/api-client` library
   - Implement `ExchangeApiService`, `OrderApiService`, `FeatureFlagApiService`
   - Add comprehensive tests

3. **Implement Missing Endpoint** (1 day)
   - Create `getExchangeRules.ts` backend function
   - Register route in `main.ts`
   - Add tests

### Sprint 2: Real-Time Integration

4. **Implement SignalR Client Service** (3 days)
   - Create `SignalRService` in `libs/client/core`
   - Add MessagePack protocol support
   - Implement automatic reconnection
   - Add comprehensive tests

5. **Integrate SignalR in Components** (2 days)
   - Create market ticker component
   - Display real-time price updates
   - Add connection status indicator

6. **Implement Route Guards** (1 day)
   - Create `RoleGuard` for RBAC
   - Protect admin routes
   - Add unauthorized page

### Sprint 3: Testing & Polish

7. **Add E2E Tests** (3 days)
   - Implement Playwright tests for critical paths
   - Test login flow, exchange creation, order placement
   - Add CI/CD integration

8. **Generate TypeScript Client from OpenAPI** (1 day)
   - Use `openapi-typescript` to generate types
   - Integrate generated types with API client library

9. **Documentation** (1 day)
   - Update `BOOTSTRAP_GUIDE.md` with frontend setup
   - Document environment variables
   - Create integration troubleshooting guide

---

## Success Metrics

| Metric                       | Current     | Target             | Status           |
| ---------------------------- | ----------- | ------------------ | ---------------- |
| Backend-Frontend Type Safety | 60%         | 100%               | 🔄 In Progress   |
| API Integration Completeness | 40%         | 100%               | 🔄 In Progress   |
| Real-Time Data Flow          | 0%          | 100%               | ❌ Not Started   |
| Test Coverage (Frontend)     | 88% passing | 100% passing       | ⚠️ Test failures |
| E2E Test Coverage            | 0%          | 80% critical paths | ❌ Not Started   |
| Documentation Completeness   | 70%         | 100%               | 🔄 In Progress   |

---

**Document Version:** 1.0  
**Last Updated:** January 28, 2026  
**Maintained By:** AssetSim Pro Engineering Team

## Related Documentation

For complete documentation, see:

- **[Documentation Hub](../README.md)** - Complete documentation index
- **[ARCHITECTURE.md](../../ARCHITECTURE.md)** - Architectural decisions
- **[GETTING_STARTED.md](../../GETTING_STARTED.md)** - Quick setup guide
- **[ZERO_TRUST_IMPLEMENTATION.md](./ZERO_TRUST_IMPLEMENTATION.md)** - Security architecture
