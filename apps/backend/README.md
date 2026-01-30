# AssetSim Pro - Backend API

Azure Functions backend implementing Zero Trust Architecture with Exchange-scoped RBAC.

## Architecture

This backend implements:

- **ADR-002**: Security & Network Isolation with Zero Trust
- **ADR-007**: Serverless Compute with Azure Functions (Premium Plan EP1) and Zod validation
- **ADR-017**: API Documentation & Standards with zod-to-openapi

Key features:

- **VNet Integration**: Function App connects to data services via private endpoints
- **Microsoft Entra ID**: Single-tenant authentication for identity management
- **Exchange-scoped RBAC**: Row-Level Security enforcement at the database level
- **Zero Trust**: All data services have public access disabled
- **Zod Validation**: All API endpoints validate requests using Zod schemas
- **OpenAPI Documentation**: Code-first API docs generated from Zod schemas

## Project Structure

```
backend/
├── src/
│   ├── functions/                  # Azure Functions (HTTP & Timer triggers)
│   │   ├── apiDocs.ts             # HTTP: GET /api/docs (OpenAPI spec)
│   │   ├── createExchange.ts      # HTTP: POST /api/v1/exchanges
│   │   ├── createOrder.ts         # HTTP: POST /api/v1/orders
│   │   ├── getExchangeRules.ts    # HTTP: GET /api/v1/exchanges/:id/rules
│   │   ├── hotPathCleanup.ts      # Timer: Hot path cache cleanup
│   │   ├── marketEngineTick.ts    # Timer: Market simulation engine
│   │   ├── ohlcAggregation.ts     # Timer: OHLC data aggregation
│   │   └── tickerGenerator.ts     # Timer: Ticker data generation
│   ├── lib/                        # Shared utilities
│   │   ├── auth.ts                # Entra ID authentication
│   │   ├── cache.ts               # Redis cache operations
│   │   ├── database.ts            # SQL connection and RLS context
│   │   ├── error-handler.ts       # Standardized error handling
│   │   ├── event-hub.ts           # Azure Event Hub integration
│   │   ├── openapi-registry.ts    # OpenAPI spec generation (ADR-017)
│   │   ├── signalr-broadcast.ts   # SignalR real-time broadcasting
│   │   └── telemetry.ts           # Application Insights telemetry
│   └── types/                      # TypeScript type definitions & Zod schemas
│       ├── exchange.ts            # Exchange creation schemas
│       ├── market-engine.ts       # Market Engine schemas
│       └── transaction.ts         # Transaction API schemas
├── host.json                       # Azure Functions host configuration
├── package.json
├── tsconfig.json
└── vitest.config.mts               # Vitest test configuration
```

## API Endpoints

### API Documentation (Development/Staging Only)

#### GET /api/docs

Returns the OpenAPI v3 specification for all API endpoints. This endpoint is available in development and staging environments only and should be disabled or restricted in production.

**Authentication**: Not required (public in dev/staging)

**Response** (200 OK):

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "AssetSim Pro API",
    "version": "1.0.0",
    "description": "Enterprise-grade simulation platform API..."
  },
  "servers": [...],
  "paths": {
    "/api/v1/orders": {...},
    "/api/v1/exchanges": {...}
  },
  "components": {
    "securitySchemes": {
      "bearerAuth": {...}
    }
  }
}
```

**Implementation**: ADR-017 (API Documentation & Standards)

- Code-first OpenAPI generation using `zod-to-openapi`
- Automatically generated from Zod validation schemas
- Includes all endpoints, request/response schemas, and security requirements

**Usage**:

```bash
# Access locally during development
curl http://localhost:7071/api/docs

# Or open in browser to view with JSON formatter
open http://localhost:7071/api/docs

# Use with OpenAPI tools like Swagger UI or Postman
```

### Transaction API (HTTP Triggers)

#### POST /api/v1/exchanges

Creates a new Simulation Venue (Exchange) and assigns the creator as RiskManager.

**Authentication**: Required (Microsoft Entra ID)

**Request Body**:

```json
{
  "name": "Alpha Strategy Fund"
}
```

**Response** (201 Created):

```json
{
  "exchangeId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Alpha Strategy Fund",
  "createdAt": "2026-01-15T10:30:00.000Z",
  "createdBy": "user-entra-id"
}
```

**Workflow**:

1. User authenticated via Microsoft Entra ID
2. Exchange record created in `Trade.Exchanges`
3. Default configuration created in `Trade.ExchangeConfigurations`
4. Creator assigned RiskManager role in `Trade.ExchangeRoles`

#### POST /api/v1/orders

Creates a new order in the exchange.

**Authentication**: Required (Microsoft Entra ID)

**Request Body** (Zod Validated):

```json
{
  "exchangeId": "550e8400-e29b-41d4-a716-446655440000",
  "portfolioId": "550e8400-e29b-41d4-a716-446655440001",
  "symbol": "AAPL",
  "side": "BUY",
  "orderType": "LIMIT",
  "quantity": 100,
  "price": 150.5
}
```

**Order Types**: `MARKET`, `LIMIT`, `STOP`, `STOP_LIMIT`
**Sides**: `BUY`, `SELL`

**Response** (201 Created):

```json
{
  "orderId": "650e8400-e29b-41d4-a716-446655440002",
  "exchangeId": "550e8400-e29b-41d4-a716-446655440000",
  "portfolioId": "550e8400-e29b-41d4-a716-446655440001",
  "symbol": "AAPL",
  "side": "BUY",
  "orderType": "LIMIT",
  "quantity": 100,
  "price": 150.5,
  "status": "PENDING",
  "filledQuantity": 0,
  "createdAt": "2026-01-19T10:30:00.000Z",
  "updatedAt": "2026-01-19T10:30:00.000Z"
}
```

**Validation Rules** (Zod):

- LIMIT and STOP_LIMIT orders require `price`
- STOP and STOP_LIMIT orders require `stopPrice`
- User must have access to the specified portfolio
- All UUIDs must be valid

### Market Engine (Timer Trigger)

#### marketEngineTick

Runs every 5 seconds to simulate market activity.

**Functions**:

1. Generates price updates for all active symbols in each exchange
2. Matches pending orders against current market prices
3. Updates order statuses and portfolio positions
4. Uses random walk with configurable volatility

**Configuration** (per Exchange):

- `TickIntervalMs`: Market tick interval (100-60000ms)
- `Volatility`: Price change volatility (0.001-1.0)
- `MarketEngineEnabled`: Enable/disable market simulation

**Zod Validation**:

- All market ticks validated against `MarketTickSchema`
- Price update events validated against `PriceUpdateEventSchema`

## Environment Variables

Required environment variables for Azure deployment:

- `SQL_CONNECTION_STRING`: Full Azure SQL Database connection string (typically stored in Key Vault and referenced via Function App settings)

## Row-Level Security (RLS)

The backend sets SESSION_CONTEXT for each request to enable RLS:

```typescript
EXEC sp_set_session_context @key = N'UserId', @value = '<user-id>';
EXEC sp_set_session_context @key = N'ExchangeId', @value = '<exchange-id>';
EXEC sp_set_session_context @key = N'IsSuperAdmin', @value = 0;
```

This ensures users can only access data for Exchanges where they have assigned roles.

## Development

### Local SignalR Emulator

The backend uses Azure SignalR Service for real-time communication. For local development, a SignalR emulator runs via Docker.

**Setup:**

```bash
# The SignalR emulator is built locally from Microsoft's official tool
# Start it with other Docker services:
docker compose up -d signalr-emulator

# Verify it's running
docker compose ps signalr-emulator

# Check emulator logs if needed
docker compose logs signalr-emulator
```

**Connection:** The backend connects to the emulator at `localhost:8888` using the connection string in `local.settings.json`:

```
Endpoint=http://localhost;Port=8999;AccessKey=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGH;Version=1.0;
```

**Note:** The connection string specifies `Port=8999` (emulator's internal format), but actual connections use port `8888`. This is standard emulator behavior.

**See:** [docker/README.md](../../docker/README.md) for emulator build details, troubleshooting, and version updates.

### Building the Backend

The backend uses **esbuild** to bundle Azure Functions with proper path mapping resolution and correct output structure. This is integrated with Nx for monorepo-aware builds.

```bash
# Build using Nx (recommended - handles dependencies)
npx nx build backend

# Or from root package.json
npm run backend:build

# The build process:
# 1. Resolves shared library dependencies (error-models, finance-models) via TypeScript path mappings
# 2. Bundles backend functions with esbuild, including shared library source inline
# 3. Copies Azure Functions config files (host.json, package.json) to output
# 4. Outputs to dist/ (Azure Functions v4 structure)
```

**Build Configuration**: See `build.mjs` for esbuild configuration.

### Known Limitations (RESOLVED)

Previously, the TypeScript compiler had two limitations:

1. ✅ **Output Structure** - FIXED: esbuild now outputs function files directly to `dist/` matching Azure Functions v4 structure
2. ✅ **Runtime Module Resolution** - FIXED: esbuild resolves `@assetsim/*` path mappings at build time

The bundler approach eliminates the need for runtime path resolution or workspace linking.

### Running Locally

```bash
# Install dependencies
npm install

# Build (required before starting)
npx nx build backend

# Run locally (requires Azure Functions Core Tools)
npm start

# Or using Nx
npx nx serve backend
```

### Testing

```bash
# Run tests using Nx
npx nx test backend

# Or from root
npm run backend:test

# With coverage
npm run backend:test:coverage
```

## Deployment

This Function App is deployed via Terraform and Azure Pipelines:

1. **Infrastructure**: Terraform provisions Premium Function App with VNet integration
2. **Build**: Backend bundled with esbuild (resolves path mappings and creates correct structure)
3. **Deploy**: Deployed via Azure Pipelines using self-hosted agent in VNet

See `/terraform` and ADR-023 for full deployment specifications.

## ADR-007 Implementation

This backend implements **ADR-007: Serverless Compute (SWA & Dedicated Functions)**:

### Azure Function App (Premium Plan - EP1)

- ✅ **Premium Plan**: Configured in `terraform/modules/compute/main.tf` with `sku_name = "EP1"`
- ✅ **VNet Integration**: Function App connected to VNet for secure access to data services
- ✅ **BYOB (Bring Your Own Backend)**: Linked to Azure Static Web Apps via `azurerm_static_web_app_function_app_registration`

### Unified Backend (apps/backend)

#### Transaction API - HTTP Triggers

- ✅ `createExchange.ts`: Creates simulation venues with RLS-based multi-tenancy
- ✅ `createOrder.ts`: Creates trading orders with portfolio validation
- All endpoints use **Zod schemas** for request validation

#### Market Engine - Timer Triggers

- ✅ `marketEngineTick.ts`: Runs every 5 seconds to:
  - Generate realistic price movements using random walk
  - Match pending orders against market prices
  - Update portfolio positions and cash balances
- All market data validated with **Zod schemas**

### Zod Validation (Required by ADR-007)

All API endpoints and market engine functions use Zod for data validation:

- `types/exchange.ts`: Exchange creation schemas
- `types/transaction.ts`: Order and transaction schemas
- `types/market-engine.ts`: Market tick and price update schemas

## Security

- **Network Isolation**: Function App integrated with VNet, data services accessible only via private endpoints
- **Authentication**: Microsoft Entra ID Single Tenant
- **Authorization**: Exchange-scoped RBAC via Row-Level Security
- **TLS**: Minimum TLS 1.2 enforced
- **Secrets**: Stored in Azure Key Vault, referenced via Function App settings

## Related Documentation

For complete documentation, see:

- **[Documentation Hub](../../docs/README.md)** - Complete documentation index
- **[GETTING_STARTED.md](../../GETTING_STARTED.md)** - Quick setup guide
- **[ARCHITECTURE.md](../../ARCHITECTURE.md)** - See ADR-002, ADR-007, ADR-017 for architectural decisions
- **[ZERO_TRUST_IMPLEMENTATION.md](../../docs/architecture/ZERO_TRUST_IMPLEMENTATION.md)** - Security architecture details
- **[DEPLOYMENT_GUIDE.md](../../docs/deployment/DEPLOYMENT_GUIDE.md)** - Backend deployment instructions

**API Documentation:** Available at `/api/docs` when running the backend (see GET /api/docs endpoint above)
