# AssetSim Pro - Backend API

Azure Functions backend implementing Zero Trust Architecture with Exchange-scoped RBAC.

## Architecture

This backend implements:

- **ADR-002**: Security & Network Isolation with Zero Trust
- **ADR-007**: Serverless Compute with Azure Functions (Premium Plan EP1) and Zod validation

Key features:
- **VNet Integration**: Function App connects to data services via private endpoints
- **Microsoft Entra ID**: Single-tenant authentication for identity management
- **Exchange-scoped RBAC**: Row-Level Security enforcement at the database level
- **Zero Trust**: All data services have public access disabled
- **Zod Validation**: All API endpoints validate requests using Zod schemas

## Project Structure

```
backend/
├── src/
│   ├── functions/               # Azure Functions (HTTP & Timer triggers)
│   │   ├── createExchange.ts   # HTTP: POST /api/v1/exchanges
│   │   ├── createOrder.ts      # HTTP: POST /api/v1/orders
│   │   └── marketEngineTick.ts # Timer: Market simulation engine
│   ├── lib/                     # Shared utilities
│   │   ├── auth.ts             # Entra ID authentication
│   │   └── database.ts         # SQL connection and RLS context
│   └── types/                   # TypeScript type definitions & Zod schemas
│       ├── exchange.ts
│       ├── transaction.ts      # Transaction API schemas
│       └── market-engine.ts    # Market Engine schemas
├── host.json                    # Azure Functions host configuration
├── package.json
└── tsconfig.json
```

## API Endpoints

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
  "price": 150.50
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
  "price": 150.50,
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

#### GET /api/v1/work-items/export

Exports all AssetSim Pro work items as a CSV file ready for import into Azure DevOps Boards.

**Authentication**: Not required

**Response Format**: `text/csv`

**Response Headers**:
- `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="assetsim-work-items.csv"`

**CSV Structure**:
The exported CSV contains:
- **1 Epic**: Portfolio Simulation Platform
- **6 Features**: Exchange Management, Order Execution, Market Simulation Engine, Portfolio Management, Trading UI, Analytics & Reporting
- **25 User Stories**: Distributed across the 6 features

**CSV Columns** (Azure DevOps compatible):
- `Work Item Type`: Epic | Feature | User Story
- `Title`: Work item title
- `State`: New | Active | Resolved | Closed
- `Priority`: 1-4 (1=highest)
- `Story Points`: Numeric estimate
- `Description`: Detailed description (markdown supported, newlines converted to spaces)
- `Acceptance Criteria`: Acceptance criteria (markdown supported, newlines converted to spaces)
- `ID`: Azure DevOps hierarchical import ID; set for parent items and left empty for child items to establish hierarchy

**Hierarchy**:
```
Portfolio Simulation Platform (Epic)
├── Exchange Management (Feature)
│   ├── Create Exchange API endpoint (User Story)
│   ├── Implement Exchange RLS policies (User Story)
│   └── ... (2 more User Stories)
├── Order Execution (Feature)
│   └── ... (4 User Stories)
└── ... (4 more Features with 19 User Stories)
```

**Usage Example**:
```bash
# Download CSV file
curl http://localhost:7071/api/v1/work-items/export -o assetsim-work-items.csv

# Import into Azure DevOps Boards
# 1. Navigate to Azure DevOps Boards
# 2. Click "Import Work Items"
# 3. Select the downloaded CSV file
# 4. Map columns (automatic for standard columns)
# 5. Complete import
```

**Note**: This endpoint is designed for project management and does not interact with the database. It exports a predefined set of work items representing the AssetSim Pro project structure.

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

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run locally (requires Azure Functions Core Tools)
npm start
```

## Deployment

This Function App is deployed via Terraform and Azure Pipelines:

1. **Infrastructure**: Terraform provisions Premium Function App with VNet integration
2. **Build**: TypeScript compiled to JavaScript
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
