# AssetSim Pro - Backend API

Azure Functions backend implementing Zero Trust Architecture with Exchange-scoped RBAC.

## Architecture

This backend implements ADR-002 (Security & Network Isolation) requirements:

- **VNet Integration**: Function App connects to data services via private endpoints
- **Microsoft Entra ID**: Single-tenant authentication for identity management
- **Exchange-scoped RBAC**: Row-Level Security enforcement at the database level
- **Zero Trust**: All data services have public access disabled

## Project Structure

```
backend/
├── src/
│   ├── functions/          # Azure Functions HTTP triggers
│   │   └── createExchange.ts
│   ├── lib/                # Shared utilities
│   │   ├── auth.ts         # Entra ID authentication
│   │   └── database.ts     # SQL connection and RLS context
│   └── types/              # TypeScript type definitions
│       └── exchange.ts
├── host.json               # Azure Functions host configuration
├── package.json
└── tsconfig.json
```

## API Endpoints

### POST /api/v1/exchanges

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

## Security

- **Network Isolation**: Function App integrated with VNet, data services accessible only via private endpoints
- **Authentication**: Microsoft Entra ID Single Tenant
- **Authorization**: Exchange-scoped RBAC via Row-Level Security
- **TLS**: Minimum TLS 1.2 enforced
- **Secrets**: Stored in Azure Key Vault, referenced via Function App settings
