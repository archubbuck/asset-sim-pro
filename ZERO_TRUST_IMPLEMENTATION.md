# Zero Trust Architecture Implementation

## Overview

This document describes the implementation of ADR-002 (Security & Network Isolation) for AssetSim Pro, establishing a Zero Trust Network Architecture with Exchange-scoped RBAC.

## Implementation Status

✅ **Complete** - All ADR-002 requirements have been implemented

## Components Implemented

### 1. Network Topology (Zero Trust)

#### Virtual Network
- **VNet CIDR**: 10.0.0.0/16
- **Integration Subnet**: 10.0.1.0/24 (for Function App outbound)
- **Endpoints Subnet**: 10.0.2.0/24 (for private endpoints inbound)

#### Private Endpoints
All data services are accessible ONLY via private endpoints:
- ✅ Azure SQL Database
- ✅ Azure Cache for Redis
- ✅ Azure Event Hubs
- ✅ Azure Key Vault

#### Public Access Disabled
Public network access is **explicitly disabled** for:
- `azurerm_mssql_server.public_network_access_enabled = false`
- `azurerm_redis_cache.public_network_access_enabled = false`
- `azurerm_eventhub_namespace.public_network_access_enabled = false`
- `azurerm_key_vault.public_network_access_enabled = false`

#### VNet Integration
- Function App (Premium Plan) has **Outbound VNet Integration** enabled
- `vnet_route_all_enabled = true` routes all outbound traffic through VNet
- Function App connects to data services via private endpoints only

### 2. Identity Management

#### Microsoft Entra ID (Single Tenant)
- **Provider**: Microsoft Entra ID
- **Tenant Mode**: Single Tenant
- **Authentication**: Handled by Azure Static Web Apps authentication
- **Token Flow**: Entra ID → Static Web Apps → Function App

#### User Principal Extraction
```typescript
// backend/src/lib/auth.ts
export function getUserFromRequest(req: HttpRequest): UserPrincipal | null {
  const principalHeader = req.headers.get('x-ms-client-principal');
  const principal = JSON.parse(Buffer.from(principalHeader, 'base64').toString('utf-8'));
  return {
    userId: principal.userId,
    userDetails: principal.userDetails,
    identityProvider: principal.identityProvider,
    userRoles: principal.userRoles,
  };
}
```

### 3. Exchange-Scoped RBAC

#### Database Schema
Implements multi-tenant architecture with Exchange-level isolation:

**Key Tables**:
- `Trade.Exchanges`: Simulation venues (tenants)
- `Trade.ExchangeRoles`: User role assignments per exchange
- `Trade.ExchangeConfigurations`: Exchange-specific settings
- `Trade.Portfolios`: Portfolio data (RLS enforced)
- `Trade.Orders`: Order history (RLS enforced)

**Roles**:
- `RiskManager`: Admin role with full exchange access
- `PortfolioManager`: Portfolio management access
- `Analyst`: Read-only access

#### Row-Level Security (RLS)
SQL Server Row-Level Security enforces access control:

```sql
-- Security predicate function
CREATE FUNCTION [Security].[fn_securitypredicate](@ExchangeId AS UNIQUEIDENTIFIER)
    RETURNS TABLE
WITH SCHEMABINDING
AS
    RETURN SELECT 1 AS [fn_securitypredicate_result]
    WHERE
        @ExchangeId = CAST(SESSION_CONTEXT(N'ExchangeId') AS UNIQUEIDENTIFIER)
        AND (
            CAST(SESSION_CONTEXT(N'IsSuperAdmin') AS BIT) = 1
            OR
            EXISTS (
                SELECT 1 FROM [Trade].[ExchangeRoles] r
                WHERE r.ExchangeId = @ExchangeId
                AND r.UserId = CAST(SESSION_CONTEXT(N'UserId') AS UNIQUEIDENTIFIER)
            )
        );
```

**Applied to**:
- `Trade.Portfolios`
- `Trade.Orders`
- `Trade.OHLC_1M`

#### Session Context
Backend sets session context for RLS enforcement:

```typescript
// backend/src/lib/database.ts
export async function setSessionContext(
  request: sql.Request,
  userId: string,
  exchangeId: string,
  isSuperAdmin: boolean = false
): Promise<void> {
  // Using parameterized approach to prevent SQL injection
  await request
    .input('userId', sql.UniqueIdentifier, userId)
    .input('exchangeId', sql.UniqueIdentifier, exchangeId)
    .input('isSuperAdmin', sql.Bit, isSuperAdmin ? 1 : 0)
    .query(`
      EXEC sp_set_session_context @key = N'UserId', @value = @userId;
      EXEC sp_set_session_context @key = N'ExchangeId', @value = @exchangeId;
      EXEC sp_set_session_context @key = N'IsSuperAdmin', @value = @isSuperAdmin;
    `);
}
```

### 4. Provisioning Workflow

#### POST /api/v1/exchanges

Implements the ADR-002 provisioning workflow:

1. **Firm creates a new Simulation Venue** via POST /api/v1/exchanges
2. **Backend creates Exchange record** in `Trade.Exchanges`
3. **Backend inserts ExchangeRoles record** assigning RiskManager (Admin) role to creator

```typescript
// backend/src/functions/createExchange.ts
export async function createExchange(request: HttpRequest, context: InvocationContext) {
  const user = requireAuthentication(request);
  const { name } = validationResult.data;
  
  await transaction.begin();
  
  // Step 1: Create Exchange
  const exchange = await transaction.request()
    .input('name', name)
    .input('createdBy', user.userId)
    .query(`INSERT INTO [Trade].[Exchanges] ([Name], [CreatedBy]) ...`);
  
  // Step 2: Create default configuration
  await transaction.request()
    .input('exchangeId', exchange.ExchangeId)
    .query(`INSERT INTO [Trade].[ExchangeConfigurations] ([ExchangeId]) ...`);
  
  // Step 3: Assign RiskManager role to creator
  await transaction.request()
    .input('exchangeId', exchange.ExchangeId)
    .input('userId', user.userId)
    .input('role', 'RiskManager')
    .query(`INSERT INTO [Trade].[ExchangeRoles] ...`);
  
  await transaction.commit();
}
```

## Infrastructure as Code

### Terraform Modules

**Module Structure**:
```
terraform/
├── main.tf                    # Root configuration
├── variables.tf               # Input variables
└── modules/
    ├── network/               # VNet, subnets, private DNS zones
    ├── data/                  # SQL Server with private endpoint
    ├── cache/                 # Redis with private endpoint
    ├── messaging/             # Event Hubs, Key Vault with private endpoints
    └── compute/               # Function App with VNet integration, Static Web App
```

### Key Resources

**Network Module** (`modules/network/main.tf`):
- Virtual Network with 2 subnets
- Private DNS zones for all services
- VNet links for DNS resolution

**Data Module** (`modules/data/main.tf`):
- SQL Server with `public_network_access_enabled = false`
- Elastic Pool for multi-tenant databases
- Private endpoint for SQL Server
- System-assigned managed identity

**Cache Module** (`modules/cache/main.tf`):
- Redis Cache with `public_network_access_enabled = false`
- TLS 1.2 minimum
- Private endpoint for Redis

**Messaging Module** (`modules/messaging/main.tf`):
- Event Hubs with `public_network_access_enabled = false`
- Key Vault with `public_network_access_enabled = false`
- Private endpoints for both services
- Soft delete and purge protection enabled

**Compute Module** (`modules/compute/main.tf`):
- Premium Function App (EP1 SKU) for VNet support
- VNet integration via Swift connection
- Storage account for Function App runtime
- Static Web App linked to Function App (BYOB)
- System-assigned managed identity

## Security Validation

### Network Isolation ✅
- [x] SQL Server public access disabled
- [x] Redis public access disabled
- [x] Event Hubs public access disabled
- [x] Key Vault public access disabled
- [x] Private endpoints configured for all services
- [x] Function App integrated with VNet
- [x] All outbound traffic routed through VNet

### Identity & Authentication ✅
- [x] Microsoft Entra ID configured as identity provider
- [x] Single-tenant authentication enforced
- [x] User principal extracted from Entra ID tokens
- [x] Unauthorized requests rejected (401)

### Authorization & RBAC ✅
- [x] Exchange-scoped roles defined (RiskManager, PortfolioManager, Analyst)
- [x] Row-Level Security policies applied
- [x] Session context set for RLS enforcement
- [x] Creator automatically assigned RiskManager role
- [x] Users can only access their authorized exchanges

### Provisioning Workflow ✅
- [x] POST /api/v1/exchanges endpoint implemented
- [x] Exchange creation in transaction
- [x] Default configuration created
- [x] RiskManager role assigned to creator
- [x] Validation with Zod schemas
- [x] RFC 7807 error responses

## Deployment

### Prerequisites

1. **Azure Subscription** with appropriate permissions
2. **Terraform** installed (v1.5.0+)
3. **Azure CLI** authenticated
4. **Self-hosted agent pool** in VNet for deployment (ADR-012)

### Deployment Steps

1. **Bootstrap infrastructure** (ADR-012):
   ```bash
   # Create Terraform state storage
   az group create --name rg-tfstate --location eastus2
   az storage account create --name sttfstate --resource-group rg-tfstate
   az storage container create --name tfstate --account-name sttfstate
   ```

2. **Deploy infrastructure**:
   ```bash
   cd terraform
   terraform init
   terraform plan
   terraform apply
   ```

3. **Deploy database schema**:
   ```bash
   # Connect via private endpoint (from VNet-connected machine)
   sqlcmd -S sql-assetsim-prod.database.windows.net -d sqldb-assetsim -i database/schema.sql
   ```

4. **Deploy backend function**:
   ```bash
   cd backend
   npm install
   npm run build
   # Deploy via Azure Pipelines or Azure Functions Core Tools
   ```

## Compliance Matrix

| ADR-002 Requirement | Implementation | Status |
|---------------------|----------------|--------|
| Public Access DISABLED for SQL | `azurerm_mssql_server.public_network_access_enabled = false` | ✅ |
| Public Access DISABLED for Key Vault | `azurerm_key_vault.public_network_access_enabled = false` | ✅ |
| Public Access DISABLED for Event Hubs | `azurerm_eventhub_namespace.public_network_access_enabled = false` | ✅ |
| Public Access DISABLED for Redis | `azurerm_redis_cache.public_network_access_enabled = false` | ✅ |
| Private Endpoints for Inbound | All data services have private endpoints | ✅ |
| VNet Integration for Outbound | `azurerm_app_service_virtual_network_swift_connection` | ✅ |
| Premium Function App | `azurerm_service_plan.sku_name = "EP1"` | ✅ |
| Microsoft Entra ID (Single Tenant) | Static Web Apps authentication | ✅ |
| POST /api/v1/exchanges endpoint | `backend/src/functions/createExchange.ts` | ✅ |
| Exchange creation workflow | Transaction-based creation | ✅ |
| ExchangeRoles assignment | RiskManager role assigned to creator | ✅ |

## References

- [ADR-002: Security & Network Isolation](./ARCHITECTURE.md#adr-002-security--network-isolation)
- [ADR-011: Terraform Engineering Specification](./ARCHITECTURE.md#adr-011-terraform-engineering-specification)
- [ADR-012: Manual Operations & Bootstrap Guide](./ARCHITECTURE.md#adr-012-manual-operations--bootstrap-guide)
- [ADR-015: SQL Database Schema](./ARCHITECTURE.md#adr-015-reference-implementation--sql-database-schema)

---

**Implementation Date**: January 18, 2026  
**Status**: ✅ Complete  
**Compliance**: 100% with ADR-002 requirements
