# **Enterprise Architecture Definition: Professional Asset Management Simulator**

**Status:** Approved

**Version:** 7.1.0 (Final Release)

**Date:** January 17, 2026

**Architect:** Senior Architect

## **Executive Summary**

This document defines the architectural standards for **"AssetSim Pro"**, an enterprise-grade simulation platform designed specifically for **Asset Management Firms**, **Hedge Funds**, and **Proprietary Trading Desks**.

The platform serves as a high-fidelity **Simulation Sandbox** where Associates and Portfolio Managers can train on execution strategies, risk management, and portfolio construction in a controlled environment. Organizations run private **"Exchanges"** (Simulation Venues), allowing Risk Managers to configure specific market regimes (e.g., "High Volatility," "Liquidity Crisis") to test their team's performance under pressure.

# **Phase 1: Governance & Foundations**

## **ADR-001: Source Control Governance**

### **Context**

To maintain a clean history, automate versioning, and ensure code quality in a monorepo environment, strict governance over git workflows is required.

### **Decision**

Adopt **Conventional Commits** for commit messages and **Scaled Trunk-Based Development** for the branching strategy.

### **Specification**

* **Commit Message Format:** Must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.  
  * **Structure:** \<type\>(\<scope\>): \<description\>  
  * **Example:** feat(backend): implement multi-tenant ticker generator  
  * **Tooling:** Use commitlint in a husky pre-commit hook.  
* **Branching Strategy:** **Scaled Trunk-Based Development**.  
  * **main:** The protected, always-deployable branch.  
  * **Feature Branches:** Short-lived branches created from main (e.g., feat/add-crypto).  
  * **Merge Strategy:** **Squash and Merge**.

## **ADR-002: Security & Network Isolation**

### **Context**

Data privacy and simulation integrity are critical. This decision impacts all subsequent infrastructure and development workflows.

### **Decision**

**Zero Trust Network Architecture** with **Exchange-Scoped RBAC**.

### **Specification**

* **Network Topology:**  
  * **Public Access:** Must be **DISABLED** for SQL, Key Vault, Event Hubs, and Redis.  
  * **Private Endpoints:** Required for all Inbound traffic to data services.  
  * **VNet Integration:** Dedicated Function App (Premium) must have Outbound VNet integration enabled.  
* **Identity:**  
  * **Provider:** Microsoft Entra ID (Single Tenant).  
* **Provisioning Workflow:**  
  1. Firm creates a new Simulation Venue via POST /api/v1/exchanges.  
  2. Backend creates Exchange record.  
  3. Backend inserts a record into **ExchangeRoles** assigning the **RiskManager** (Admin) role to the creator.

## **ADR-003: Local Development Strategy**

### **Context**

The strict "Zero Trust" architecture (ADR-002) prevents developers from connecting their local machines (localhost) to Cloud resources.

### **Decision**

Use **Docker Compose** for local emulation.

### **Specification**

* **Strategy:** Developers do NOT connect to Azure during coding. They run the stack locally.  
* **docker-compose.yml:**  
  version: '3.8'  
  services:  
    sql:  
      image: \[mcr.microsoft.com/mssql/server:2022-latest\](https://mcr.microsoft.com/mssql/server:2022-latest)  
      environment:  
        \- ACCEPT\_EULA=Y  
        \- SA\_PASSWORD=LocalDevPassword123\!  
      ports:  
        \- "1433:1433"  
    redis:  
      image: redis:alpine  
      ports:  
        \- "6379:6379"  
    azurite:  
      image: \[mcr.microsoft.com/azure-storage/azurite\](https://mcr.microsoft.com/azure-storage/azurite)  
      ports:  
        \- "10000:10000"  
        \- "10001:10001"  
        \- "10002:10002"  
    signalr-emulator:  
      image: \[mcr.microsoft.com/azure-signalr/emulator\](https://mcr.microsoft.com/azure-signalr/emulator)  
      ports:  
        \- "8888:8888"

* **Environment Config:** The repo contains a .env.local that points connection strings to localhost:1433, localhost:6379, etc.

## **ADR-004: Workspace & Frontend Architecture (Nx, Angular, Kendo UI)**

### **Context**

We require a high-performance trading interface managed within a scalable monorepo.

### **Decision**

We **must** utilize **Nx** as the build system, managing an **Angular (v21+)** application with **Kendo UI for Angular**.

### **Specification**

* **Build System:** **Nx** is mandatory.  
* **Reactivity Model:**  
  * **Signals-First:** Implementation of Angular Signals is mandatory.  
  * **Zoneless Readiness:** Components must be designed for eventual Zoneless execution.  
* **UI Component Library:** **Kendo UI for Angular** (Theme: "Institutional Slate").  
* **Nx Workspace Structure:**  
  * apps/client: The Institutional Trading Portal.  
  * apps/backend: The Dedicated Function App.  
  * libs/shared/finance-models: Shared types.  
  * libs/client/features/trading: Execution logic.

## **ADR-005: Testing Strategy & Quality Gates**

### **Context**

To maintain high velocity without regressions, we must enforce a strict testing pyramid.

### **Decision**

**Vitest for Unit, Playwright for E2E**.

### **Specification**

* **Unit Testing (Vitest):**  
  * **Scope:** All business logic in libs/client/features/\* and apps/backend/functions.  
  * **Gate:** 80% Code Coverage required for merge.  
* **E2E Testing (Playwright):**  
  * **Scope:** Critical user journeys (Login \-\> Place Order \-\> Verify Blotter).  
  * **Execution:** Must run against the **Dockerized Local Environment** (ADR-003) in CI before deployment.

## **ADR-006: AI-Assisted Development**

### **Context**

Accelerating the creation of complex financial algorithms.

### **Decision**

**GitHub Copilot Enterprise**.

### **Specification**

* **Custom Instructions:** Focus on "Kendo Financial Charts", "Decimal.js" (for precision), and "RxJS throttling".

# **Phase 2: Core Architecture**

## **ADR-007: Serverless Compute (SWA & Dedicated Functions)**

### **Context**

Reliability and VNet integration are paramount.

### **Decision**

Use **Azure Static Web Apps (SWA)** for the frontend and a dedicated **Azure Function App (Premium Plan)** for the Backend.

### **Specification**

* **Frontend:** Azure Static Web Apps (Standard).  
* **Backend:** Azure Function App (Premium Plan \- EP1) is **mandatory**.  
  * **Bring Your Own Backend (BYOB):** Must be linked to SWA.  
* **Unified Backend (apps/backend):**  
  * **Transaction API:** HTTP Triggers.  
  * **Market Engine:** Timer Triggers.  
* **Validation:** Zod schemas are required.

## **ADR-008: Data Persistence, Caching & Multi-Tenancy**

### **Context**

The system supports multiple **"Exchanges"** (Tenants) with high-speed data access.

### **Decision**

Use **Azure SQL Database** and **Azure Cache for Redis**.

### **Specification**

* **Isolation Strategy:** Shared Database (SQL), Logically Isolated by ExchangeId.  
* **Caching Strategy (Redis):**  
  * **Real-Time Quotes:** Key: QUOTE:{EXCHANGE\_ID}:{SYMBOL}.  
  * **Exchange Config:** Key: CONFIG:{EXCHANGE\_ID}.  
* **Feature Management:** ExchangeFeatureFlags Table.

## **ADR-009: Event-Driven Architecture (Targeted Broadcast)**

### **Context**

Sending every micro-tick via JSON is bandwidth-inefficient. Data streams must be isolated per Exchange.

### **Decision**

**Fan-Out Pattern with MessagePack & Deadband Filtering**.

### **Specification**

* **Protocol Efficiency:** SignalR **must** use **MessagePack**.  
* **Deadband Filtering:** Ignore price changes \< $0.01.  
* **Simultaneous Output:**  
  1. **To SignalR:** Group ticker:{ExchangeId}.  
  2. **To Event Hubs:** For downstream audit.

## **ADR-010: Data Retention & Lifecycle Management**

### **Context**

The platform generates millions of pricing events per day.

### **Decision**

Implement a **Hot/Cold Data Path**.

### **Specification**

* **Hot Path (SQL):** **Strictly Aggregated Data** (1-minute OHLC candles). Retention: 7 days.  
* **Cold Path (Blob Storage):** **Raw Data Archive** using Event Hubs Capture (AVRO/Parquet).

# **Phase 3: Infrastructure Implementation**

## **ADR-011: Terraform Engineering Specification**

### **Context**

Defining naming conventions and module structure.

### **Specification**

* **Format:** st-assetsim-prod-useast2.  
* **Tags:** Service \= "AssetSim".  
* **Modules:** network, data, cache, messaging, compute.  
* **Database:** An **Elastic Pool is mandatory**.

## **ADR-012: Manual Operations & Bootstrap Guide**

### **Context**

Steps required *before* Terraform can run (Chicken and Egg scenarios).

### **Specification**

* **Bootstrap Infrastructure:** Manually create Resource Group rg-tfstate and Storage Account.  
* **Entra ID Consent:** Global Admin must grant GroupMember.Read.All.  
* **Azure DevOps:** Create Self-Hosted Agent Pool Self-Hosted-VNet-Pool.

## **ADR-013: Reference Implementation \- Bootstrap Automation Scripts**

### **Context**

Scripts to automate ADR-012 using Azure CLI and REST APIs.

### **13.1 Entra ID Consent (Graph API)**

\#\!/bin/bash  
\# Pre-req: az login with Global Admin rights  
APP\_ID="\<YOUR\_APP\_CLIENT\_ID\>"  
GRAPH\_SP\_ID=$(az ad sp list \--filter "appId eq '00000003-0000-0000-c000-000000000000'" \--query "\[0\].id" \-o tsv)  
APP\_SP\_ID=$(az ad sp list \--filter "appId eq '$APP\_ID'" \--query "\[0\].id" \-o tsv)  
\# App Role ID for GroupMember.Read.All  
ROLE\_ID="98830695-27a2-44f7-8c18-0c3ebc9698f6"

\# Create App Role Assignment using Graph API  
az rest \--method POST \\  
  \--uri "\[https://graph.microsoft.com/v1.0/servicePrincipals/$APP\_SP\_ID/appRoleAssignedTo\](https://graph.microsoft.com/v1.0/servicePrincipals/$APP\_SP\_ID/appRoleAssignedTo)" \\  
  \--headers "Content-Type=application/json" \\  
  \--body "{\\"principalId\\": \\"$APP\_SP\_ID\\", \\"resourceId\\": \\"$GRAPH\_SP\_ID\\", \\"appRoleId\\": \\"$ROLE\_ID\\"}"

### **13.2 Terraform State Bootstrap (ARM API)**

\#\!/bin/bash  
RG="rg-tfstate"  
STORAGE="sttfstate$(date \+%s)" \# Unique Name  
LOC="eastus2"

\# 1\. Create Resource Group (ARM API)  
az rest \--method PUT \\  
  \--uri "\[https://management.azure.com/subscriptions/\](https://management.azure.com/subscriptions/){subscriptionId}/resourcegroups/$RG?api-version=2021-04-01" \\  
  \--body "{\\"location\\": \\"$LOC\\"}"

\# 2\. Create Storage Account (ARM API)  
az rest \--method PUT \\  
  \--uri "\[https://management.azure.com/subscriptions/\](https://management.azure.com/subscriptions/){subscriptionId}/resourceGroups/$RG/providers/Microsoft.Storage/storageAccounts/$STORAGE?api-version=2021-04-01" \\  
  \--body "{\\"sku\\":{\\"name\\":\\"Standard\_LRS\\"},\\"kind\\":\\"StorageV2\\",\\"location\\":\\"$LOC\\"}"

## **ADR-014: Reference Implementation \- Infrastructure as Code (Terraform)**

### **Context**

Complete Terraform HCL scripts enforcing Zero Trust.

### **14.1 Root Configuration (main.tf)**

terraform {  
  required\_providers {  
    azurerm \= {  
      source  \= "hashicorp/azurerm"  
      version \= "\~\> 3.0"  
    }  
  }  
  backend "azurerm" {  
    \# Populated via pipeline variables  
  }  
}

provider "azurerm" {  
  features {  
    key\_vault {  
      purge\_soft\_delete\_on\_destroy \= false  
    }  
  }  
}

resource "azurerm\_resource\_group" "rg" {  
  name     \= "rg-assetsim-prod-useast2"  
  location \= "East US 2"  
}

module "network" {  
  source              \= "./modules/network"  
  resource\_group\_name \= azurerm\_resource\_group.rg.name  
  location            \= azurerm\_resource\_group.rg.location  
  vnet\_cidr           \= "10.0.0.0/16"  
}

module "data" {  
  source              \= "./modules/data"  
  resource\_group\_name \= azurerm\_resource\_group.rg.name  
  location            \= azurerm\_resource\_group.rg.location  
  subnet\_id           \= module.network.subnet\_endpoints\_id  
  vnet\_id             \= module.network.vnet\_id  
}

module "cache" {  
  source              \= "./modules/cache"  
  resource\_group\_name \= azurerm\_resource\_group.rg.name  
  location            \= azurerm\_resource\_group.rg.location  
  subnet\_id           \= module.network.subnet\_endpoints\_id  
  vnet\_id             \= module.network.vnet\_id  
}

module "messaging" {  
  source              \= "./modules/messaging"  
  resource\_group\_name \= azurerm\_resource\_group.rg.name  
  location            \= azurerm\_resource\_group.rg.location  
  subnet\_id           \= module.network.subnet\_endpoints\_id  
  vnet\_id             \= module.network.vnet\_id  
}

module "compute" {  
  source              \= "./modules/compute"  
  resource\_group\_name \= azurerm\_resource\_group.rg.name  
  location            \= azurerm\_resource\_group.rg.location  
  subnet\_integration\_id \= module.network.subnet\_integration\_id  
}

### **14.2 Network Module (modules/network/main.tf)**

resource "azurerm\_virtual\_network" "vnet" {  
  name                \= "vnet-assetsim-prod"  
  location            \= var.location  
  resource\_group\_name \= var.resource\_group\_name  
  address\_space       \= \[var.vnet\_cidr\]  
}

\# Subnet for Compute Injection (Outbound)  
resource "azurerm\_subnet" "integration" {  
  name                 \= "snet-integration"  
  resource\_group\_name  \= var.resource\_group\_name  
  virtual\_network\_name \= azurerm\_virtual\_network.vnet.name  
  address\_prefixes     \= \["10.0.1.0/24"\]

  delegation {  
    name \= "delegation"  
    service\_delegation {  
      name    \= "Microsoft.Web/serverFarms"  
      actions \= \["Microsoft.Network/virtualNetworks/subnets/action"\]  
    }  
  }  
}

\# Subnet for Private Endpoints (Inbound)  
resource "azurerm\_subnet" "endpoints" {  
  name                 \= "snet-endpoints"  
  resource\_group\_name  \= var.resource\_group\_name  
  virtual\_network\_name \= azurerm\_virtual\_network.vnet.name  
  address\_prefixes     \= \["10.0.2.0/24"\]  
}

\# Private DNS Zones  
resource "azurerm\_private\_dns\_zone" "sql" {  
  name                \= "privatelink.database.windows.net"  
  resource\_group\_name \= var.resource\_group\_name  
}  
resource "azurerm\_private\_dns\_zone" "redis" {  
  name                \= "privatelink.redis.cache.windows.net"  
  resource\_group\_name \= var.resource\_group\_name  
}  
resource "azurerm\_private\_dns\_zone" "signalr" {  
  name                \= "privatelink.service.signalr.net"  
  resource\_group\_name \= var.resource\_group\_name  
}

\# Links  
resource "azurerm\_private\_dns\_zone\_virtual\_network\_link" "sql" {  
  name                  \= "link-sql"  
  resource\_group\_name   \= var.resource\_group\_name  
  private\_dns\_zone\_name \= azurerm\_private\_dns\_zone.sql.name  
  virtual\_network\_id    \= azurerm\_virtual\_network.vnet.id  
}  
\# Repeat links for redis and signalr using similar blocks  
resource "azurerm\_private\_dns\_zone\_virtual\_network\_link" "redis" {  
  name                  \= "link-redis"  
  resource\_group\_name   \= var.resource\_group\_name  
  private\_dns\_zone\_name \= azurerm\_private\_dns\_zone.redis.name  
  virtual\_network\_id    \= azurerm\_virtual\_network.vnet.id  
}  
resource "azurerm\_private\_dns\_zone\_virtual\_network\_link" "signalr" {  
  name                  \= "link-signalr"  
  resource\_group\_name   \= var.resource\_group\_name  
  private\_dns\_zone\_name \= azurerm\_private\_dns\_zone.signalr.name  
  virtual\_network\_id    \= azurerm\_virtual\_network.vnet.id  
}

output "subnet\_integration\_id" { value \= azurerm\_subnet.integration.id }  
output "subnet\_endpoints\_id" { value \= azurerm\_subnet.endpoints.id }  
output "vnet\_id" { value \= azurerm\_virtual\_network.vnet.id }

### **14.3 Data Module (modules/data/main.tf)**

resource "azurerm\_mssql\_server" "sql" {  
  name                          \= "sql-assetsim-prod"  
  resource\_group\_name           \= var.resource\_group\_name  
  location                      \= var.location  
  version                       \= "12.0"  
  administrator\_login           \= "sqladmin"  
  administrator\_login\_password  \= "ChangeMeInProd123\!"   
  public\_network\_access\_enabled \= false  
    
  identity {  
    type \= "SystemAssigned"  
  }  
}

resource "azurerm\_mssql\_elasticpool" "pool" {  
  name                \= "ep-assetsim-prod"  
  resource\_group\_name \= var.resource\_group\_name  
  location            \= var.location  
  server\_name         \= azurerm\_mssql\_server.sql.name  
  license\_type        \= "LicenseIncluded"  
  max\_size\_gb         \= 50

  sku {  
    name     \= "StandardPool"  
    tier     \= "Standard"  
    capacity \= 50  
  }

  per\_database\_settings {  
    min\_capacity \= 0  
    max\_capacity \= 50  
  }  
}

resource "azurerm\_mssql\_database" "db" {  
  name            \= "sqldb-assetsim"  
  server\_id       \= azurerm\_mssql\_server.sql.id  
  elastic\_pool\_id \= azurerm\_mssql\_elasticpool.pool.id  
}

resource "azurerm\_private\_endpoint" "sql\_pe" {  
  name                \= "pe-sql"  
  location            \= var.location  
  resource\_group\_name \= var.resource\_group\_name  
  subnet\_id           \= var.subnet\_id

  private\_service\_connection {  
    name                           \= "psc-sql"  
    private\_connection\_resource\_id \= azurerm\_mssql\_server.sql.id  
    subresource\_names              \= \["sqlServer"\]  
    is\_manual\_connection           \= false  
  }  
}

### **14.4 Cache Module (modules/cache/main.tf)**

resource "azurerm\_redis\_cache" "redis" {  
  name                          \= "redis-assetsim-prod"  
  location                      \= var.location  
  resource\_group\_name           \= var.resource\_group\_name  
  capacity                      \= 1  
  family                        \= "C"  
  sku\_name                      \= "Standard"  
  enable\_non\_ssl\_port           \= false  
  minimum\_tls\_version           \= "1.2"  
  public\_network\_access\_enabled \= false  
}

resource "azurerm\_private\_endpoint" "redis\_pe" {  
  name                \= "pe-redis"  
  location            \= var.location  
  resource\_group\_name \= var.resource\_group\_name  
  subnet\_id           \= var.subnet\_id

  private\_service\_connection {  
    name                           \= "psc-redis"  
    private\_connection\_resource\_id \= azurerm\_redis\_cache.redis.id  
    subresource\_names              \= \["redisCache"\]  
    is\_manual\_connection           \= false  
  }  
}

### **14.5 Messaging Module (modules/messaging/main.tf)**

resource "azurerm\_eventhub\_namespace" "eh\_ns" {  
  name                          \= "ehns-assetsim-prod"  
  location                      \= var.location  
  resource\_group\_name           \= var.resource\_group\_name  
  sku                           \= "Standard"  
  public\_network\_access\_enabled \= false  
}

resource "azurerm\_eventhub" "ticks" {  
  name                \= "market-ticks"  
  namespace\_name      \= azurerm\_eventhub\_namespace.eh\_ns.name  
  partition\_count     \= 2  
  message\_retention   \= 1  
}

resource "azurerm\_signalr\_service" "sig" {  
  name                          \= "sig-assetsim-prod"  
  location                      \= var.location  
  resource\_group\_name           \= var.resource\_group\_name  
  sku {  
    name     \= "Standard\_S1"  
    capacity \= 1  
  }  
  service\_mode                  \= "Serverless"  
  public\_network\_access\_enabled \= false  
}

### **14.6 Compute Module (modules/compute/main.tf)**

\# 1\. Premium Plan for Function App  
resource "azurerm\_service\_plan" "plan" {  
  name                \= "asp-assetsim-prod"  
  resource\_group\_name \= var.resource\_group\_name  
  location            \= var.location  
  os\_type             \= "Linux"  
  sku\_name            \= "EP1" \# Elastic Premium  
}

\# 2\. Dedicated Function App (Backend API & Engine)  
resource "azurerm\_linux\_function\_app" "backend" {  
  name                \= "func-assetsim-backend-prod"  
  resource\_group\_name \= var.resource\_group\_name  
  location            \= var.location  
  service\_plan\_id     \= azurerm\_service\_plan.plan.id  
    
  site\_config {  
    vnet\_route\_all\_enabled \= true  
    application\_stack {  
      node\_version \= "20"  
    }  
  }

  app\_settings \= {  
    "WEBSITE\_VNET\_ROUTE\_ALL" \= "1"  
    \# Key Vault references for SQL/Redis/SignalR strings go here  
  }  
}

\# 3\. VNet Integration Link  
resource "azurerm\_app\_service\_virtual\_network\_swift\_connection" "vnet\_integration" {  
  app\_service\_id \= azurerm\_linux\_function\_app.backend.id  
  subnet\_id      \= var.subnet\_integration\_id  
}

\# 4\. Static Web App (Frontend)  
resource "azurerm\_static\_web\_app" "frontend" {  
  name                \= "stapp-assetsim-prod"  
  resource\_group\_name \= var.resource\_group\_name  
  location            \= "East US 2"  
  sku\_tier            \= "Standard"  
}

\# 5\. BYOB Linking (SWA \-\> Function App)  
resource "azurerm\_static\_web\_app\_function\_app\_registration" "link" {  
  static\_web\_app\_id \= azurerm\_static\_web\_app.frontend.id  
  function\_app\_resource\_id \= azurerm\_linux\_function\_app.backend.id  
}

# **Phase 4: Backend Implementation**

## **ADR-015: Reference Implementation \- SQL Database Schema**

### **Context**

Source of Truth with Row-Level Security (RLS).

### **15.1 SQL Schema Script (schema.sql)**

\-- Schema Definition  
CREATE SCHEMA \[Trade\];  
GO

\-- 1\. Exchanges (Tenants)  
CREATE TABLE \[Trade\].\[Exchanges\] (  
    \[ExchangeId\] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),  
    \[Name\] NVARCHAR(100) NOT NULL,  
    \[CreatedAt\] DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()  
);

\-- 2\. Exchange RBAC (Multi-User, Multi-Role)  
CREATE TABLE \[Trade\].\[ExchangeRoles\] (  
    \[ExchangeId\] UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES \[Trade\].\[Exchanges\](\[ExchangeId\]),  
    \[UserId\] UNIQUEIDENTIFIER NOT NULL, \-- Entra Object ID  
    \[Role\] NVARCHAR(50) NOT NULL CHECK (\[Role\] IN ('RiskManager', 'PortfolioManager', 'Analyst')),  
    PRIMARY KEY (\[ExchangeId\], \[UserId\], \[Role\])  
);

\-- 3\. Configuration (1:1 with Exchange)  
CREATE TABLE \[Trade\].\[ExchangeConfigurations\] (  
    \[ExchangeId\] UNIQUEIDENTIFIER PRIMARY KEY FOREIGN KEY REFERENCES \[Trade\].\[Exchanges\](\[ExchangeId\]),  
    \[VolatilityIndex\] DECIMAL(5, 2\) DEFAULT 1.0, \-- 1.0 \= Normal, 2.0 \= High/Crisis  
    \[StartingCash\] MONEY DEFAULT 10000000.00, \-- Initial AUM  
    \[Commission\] MONEY DEFAULT 5.00, \-- Institutional Commission per Trade  
    \[AllowMargin\] BIT DEFAULT 1,  
    \[MaxPortfolioSize\] INT DEFAULT 50,  
    \[DashboardLayout\] NVARCHAR(MAX) CHECK (ISJSON(\[DashboardLayout\]) \= 1\) DEFAULT '\[\]' \-- JSON Array of Widget IDs  
);

\-- 4\. Global Instruments (Shared)  
CREATE TABLE \[Trade\].\[Instruments\] (  
    \[Symbol\] NVARCHAR(10) PRIMARY KEY,  
    \[CompanyName\] NVARCHAR(100) NOT NULL,  
    \[Sector\] NVARCHAR(50),  
    \[BasePrice\] DECIMAL(18, 2\) NOT NULL \-- Reference price for simulation start  
);

\-- 5\. Portfolios (RLS Target)  
CREATE TABLE \[Trade\].\[Portfolios\] (  
    \[PortfolioId\] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),  
    \[ExchangeId\] UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES \[Trade\].\[Exchanges\](\[ExchangeId\]),  
    \[UserId\] UNIQUEIDENTIFIER NOT NULL, \-- Entra Object ID (Portfolio Manager)  
    \[CashBalance\] MONEY NOT NULL,  
    \[CreatedAt\] DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),  
    INDEX \[IX\_Portfolios\_ExchangeId\] (\[ExchangeId\]),  
    INDEX \[IX\_Portfolios\_UserId\] (\[UserId\])  
);

\-- 6\. Positions (Holdings)  
CREATE TABLE \[Trade\].\[Positions\] (  
    \[PositionId\] BIGINT IDENTITY(1,1) PRIMARY KEY,  
    \[PortfolioId\] UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES \[Trade\].\[Portfolios\](\[PortfolioId\]),  
    \[Symbol\] NVARCHAR(10) NOT NULL FOREIGN KEY REFERENCES \[Trade\].\[Instruments\](\[Symbol\]),  
    \[Quantity\] DECIMAL(18, 4\) NOT NULL,  
    \[AverageCost\] DECIMAL(18, 2\) NOT NULL,  
    INDEX \[IX\_Positions\_PortfolioId\] (\[PortfolioId\])  
);

\-- 7\. Order History (Matching Engine Target)  
CREATE TABLE \[Trade\].\[Orders\] (  
    \[OrderId\] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),  
    \[PortfolioId\] UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES \[Trade\].\[Portfolios\](\[PortfolioId\]),  
    \[ExchangeId\] UNIQUEIDENTIFIER NOT NULL, \-- Denormalized for RLS efficiency  
    \[Symbol\] NVARCHAR(10) NOT NULL,  
    \[Side\] NVARCHAR(10) NOT NULL CHECK (\[Side\] IN ('BUY', 'SELL', 'SHORT', 'COVER')),  
    \[Type\] NVARCHAR(10) NOT NULL CHECK (\[Type\] IN ('MARKET', 'LIMIT', 'STOP')),  
    \[Status\] NVARCHAR(20) NOT NULL DEFAULT 'PENDING',  
    \[Quantity\] DECIMAL(18, 4\) NOT NULL,  
    \[LimitPrice\] DECIMAL(18, 2\) NULL,  
    \[ExecutedPrice\] DECIMAL(18, 2\) NULL,  
    \[Timestamp\] DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),  
    INDEX \[IX\_Orders\_Exchange\_Status\] (\[ExchangeId\], \[Status\]) INCLUDE (\[Symbol\])   
);

\-- 8\. Aggregated Candles (Hot Path Storage)  
\-- REPLACES RAW QUOTES TABLE to support Efficiency Requirement  
CREATE TABLE \[Trade\].\[OHLC\_1M\] (  
    \[CandleId\] BIGINT IDENTITY(1,1) PRIMARY KEY,  
    \[ExchangeId\] UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES \[Trade\].\[Exchanges\](\[ExchangeId\]),  
    \[Symbol\] NVARCHAR(10) NOT NULL,  
    \[Timestamp\] DATETIMEOFFSET NOT NULL,  
    \[Open\] DECIMAL(18, 2\) NOT NULL,  
    \[High\] DECIMAL(18, 2\) NOT NULL,  
    \[Low\] DECIMAL(18, 2\) NOT NULL,  
    \[Close\] DECIMAL(18, 2\) NOT NULL,  
    \[Volume\] INT DEFAULT 0,  
    INDEX \[IX\_OHLC\_Exchange\_Symbol\_Time\] (\[ExchangeId\], \[Symbol\], \[Timestamp\])  
);

\-- Row Level Security (RLS) Implementation  
\-- 1\. Create Schema for Security  
CREATE SCHEMA \[Security\];  
GO

\-- 2\. Predicate Function  
\-- Returns 1 if the user accesses data for their current 'Session Context' Exchange  
CREATE FUNCTION \[Security\].\[fn\_securitypredicate\](@ExchangeId AS UNIQUEIDENTIFIER)  
    RETURNS TABLE  
WITH SCHEMABINDING  
AS  
    RETURN SELECT 1 AS \[fn\_securitypredicate\_result\]  
    WHERE   
        \-- App sends ExchangeId in SESSION\_CONTEXT  
        @ExchangeId \= CAST(SESSION\_CONTEXT(N'ExchangeId') AS UNIQUEIDENTIFIER)   
        AND (  
            \-- User is a Super Admin  
            CAST(SESSION\_CONTEXT(N'IsSuperAdmin') AS BIT) \= 1  
            OR  
            \-- User has a role in this exchange (Admin or Trader)  
            EXISTS (  
                SELECT 1 FROM \[Trade\].\[ExchangeRoles\] r  
                WHERE r.ExchangeId \= @ExchangeId  
                AND r.UserId \= CAST(SESSION\_CONTEXT(N'UserId') AS UNIQUEIDENTIFIER)  
            )  
        );  
GO

\-- 3\. Apply Policy to Portfolios  
CREATE SECURITY POLICY \[Security\].\[PortfolioPolicy\]  
    ADD FILTER PREDICATE \[Security\].\[fn\_securitypredicate\](\[ExchangeId\]) ON \[Trade\].\[Portfolios\],  
    ADD BLOCK PREDICATE \[Security\].\[fn\_securitypredicate\](\[ExchangeId\]) ON \[Trade\].\[Portfolios\]  
    WITH (STATE \= ON);  
GO

\-- 4\. Apply Policy to Orders  
CREATE SECURITY POLICY \[Security\].\[OrderPolicy\]  
    ADD FILTER PREDICATE \[Security\].\[fn\_securitypredicate\](\[ExchangeId\]) ON \[Trade\].\[Orders\],  
    ADD BLOCK PREDICATE \[Security\].\[fn\_securitypredicate\](\[ExchangeId\]) ON \[Trade\].\[Orders\]  
    WITH (STATE \= ON);  
GO

## **ADR-016: Reference Implementation \- Market Simulation Engine**

### **Context**

The background service generating price ticks based on Volatility settings.

### **16.1 Multi-Exchange Ticker Generator**

// apps/backend/src/functions/tickerGenerator.ts  
import { app, InvocationContext, Timer, output } from '@azure/functions';

// 1\. Output Bindings  
const eventHubOutput \= output.eventHub({  
    connection: 'EVENT\_HUB\_CONNECTION\_STRING',  
    eventHubName: 'market-ticks'  
});

const signalROutput \= output.signalR({  
    hubName: 'ticker',  
    connectionStringSetting: 'SIGNALR\_CONNECTION\_STRING'  
});

// Mock Data (In Prod: Load from Redis)  
const activeExchanges \= \[  
    { exchangeId: 'exch-alpha', volatilityMultiplier: 1.0 }, // Normal Regime  
    { exchangeId: 'exch-crisis', volatilityMultiplier: 4.5 }  // Liquidity Crisis Regime  
\];

const baseAssets \= \[  
    { symbol: 'SPY', basePrice: 450 },  
    { symbol: 'BTC', basePrice: 65000 }  
\];

export async function tickerGenerator(myTimer: Timer, context: InvocationContext): Promise\<unknown\> {  
    const allUpdates \= \[\];  
    const signalRMessages \= \[\];

    // 2\. Loop through Exchanges to generate Isolated Markets  
    for (const ex of activeExchanges) {  
        const exchangeUpdates \= \[\];  
          
        baseAssets.forEach(asset \=\> {  
            // Apply Regime Physics  
            const volatility \= 0.01 \* ex.volatilityMultiplier;  
            const change \= asset.basePrice \* volatility \* (Math.random() \- 0.5);  
              
            // DEADBAND FILTER: Ignore noise to save bandwidth/storage  
            if (Math.abs(change) \< 0.01) return;

            const newPrice \= asset.basePrice \+ change;

            const update \= {  
                exchangeId: ex.exchangeId,  
                symbol: asset.symbol,  
                price: parseFloat(newPrice.toFixed(2)),  
                timestamp: new Date().toISOString()  
            };  
              
            exchangeUpdates.push(update);  
            allUpdates.push(update);  
        });

        // Target Specific Group: ticker:{ExchangeId}  
        if (exchangeUpdates.length \> 0\) {  
            signalRMessages.push({  
                groupName: \`ticker:${ex.exchangeId}\`,  
                target: 'newPrices',  
                arguments: \[exchangeUpdates\]  
            });  
        }  
    }

    // 3\. Fan-Out Return  
    return {  
        eventHubOutput: allUpdates,   
        signalROutput: signalRMessages  
    };  
}

app.timer('tickerGenerator', {  
    schedule: '0 \*/1 \* \* \* \*',   
    extraOutputs: \[eventHubOutput, signalROutput\],  
    handler: tickerGenerator  
});

## **ADR-017: API Documentation & Standards**

### **Context**

Shared contract between frontend and backend.

### **Decision**

**Code-First OpenAPI Generation**.

### **Specification**

* **Tooling:** Use zod-to-openapi.  
* **Exposure:** /api/docs endpoint (Dev/Staging only).

## **ADR-018: Standardized Error Handling**

### **Context**

Consistent error parsing for the UI.

### **Decision**

**RFC 7807 (Problem Details)**.

### **Specification**

* **Format:**  
  {  
    "type": "\[https://assetsim.com/errors/insufficient-funds\](https://assetsim.com/errors/insufficient-funds)",  
    "title": "Insufficient Funds",  
    "status": 400,  
    "detail": "Order value $50,000 exceeds buying power $10,000.",  
    "instance": "/orders/123"  
  }

# **Phase 5: Frontend Implementation**

## **ADR-019: Reference Implementation \- Enterprise Logging**

### **Context**

To maintain strict observability without polluting the browser console, we must use a centralized LoggerService. Direct usage of console.log is prohibited. This service wraps the Azure Application Insights SDK.

### **19.1 Logger Service Code (logger.service.ts)**

// libs/client/core/src/lib/logger/logger.service.ts  
import { Injectable } from '@angular/core';  
import { ApplicationInsights } from '@microsoft/applicationinsights-web';

@Injectable({ providedIn: 'root' })  
export class LoggerService {  
  private appInsights: ApplicationInsights;  
  private isEnabled \= false;

  constructor() {  
    // APP\_INSIGHTS\_CONNECTION\_STRING is injected via build-time env replacement  
    // In strict environments, this is retrieved from a runtime config.json fetch  
    const connectionString \= process.env\['APP\_INSIGHTS\_CONNECTION\_STRING'\] || '';

    this.appInsights \= new ApplicationInsights({  
      config: {  
        connectionString: connectionString,  
        enableAutoRouteTracking: true, // Tracks PageViews  
        disableInstrumentationKeyValidation: true, // Required for Private Link endpoints  
        enableCorsCorrelation: true, // Links Frontend traces to Backend functions  
        enableAjaxErrorLookup: true  
      }  
    });

    if (connectionString) {  
        try {  
            this.appInsights.loadAppInsights();  
            this.isEnabled \= true;  
        } catch (e) {  
            console.error('Failed to initialize App Insights', e);  
        }  
    }  
  }

  public logEvent(name: string, properties?: Record\<string, any\>): void {  
    if (this.isEnabled) {  
      this.appInsights.trackEvent({ name }, properties);  
    }  
  }

  public logTrace(message: string, properties?: Record\<string, any\>): void {  
    if (this.isEnabled) {  
      this.appInsights.trackTrace({ message }, properties);  
    }  
  }

  public logException(exception: Error, severityLevel?: number): void {  
    if (this.isEnabled) {  
      this.appInsights.trackException({ exception, severityLevel });  
    } else {  
        // Local Fallback  
        console.error(exception);  
    }  
  }  
}

## **ADR-020: Reference Implementation \- Azure Authentication**

### **Context**

Professional users login via Firm's Entra ID.

### **20.1 Authentication Service**

// libs/client/core/src/lib/auth/auth.service.ts  
import { Injectable, inject, signal, computed } from '@angular/core';  
import { HttpClient } from '@angular/common/http';  
import { firstValueFrom, tap } from 'rxjs';  
import { AuthResponse, ClientPrincipal } from '@assetsim/shared/finance-models';  
import { LoggerService } from '../logger/logger.service';

@Injectable({ providedIn: 'root' })  
export class AuthService {  
  private http \= inject(HttpClient);  
  private logger \= inject(LoggerService);

  // State  
  \#user \= signal\<ClientPrincipal | null\>(null);

  // Selectors  
  public readonly user \= this.\#user.asReadonly();  
  public readonly isAuthenticated \= computed(() \=\> \!\!this.\#user());  
  public readonly roles \= computed(() \=\> this.\#user()?.userRoles ?? \[\]);

  public async checkSession(): Promise\<void\> {  
    try {  
      const response \= await firstValueFrom(this.http.get\<AuthResponse\>('/.auth/me'));  
      this.\#user.set(response.clientPrincipal);  
        
      if (response.clientPrincipal) {  
         this.logger.logEvent('SessionRestored', { userId: response.clientPrincipal.userId });  
      }  
    } catch (e) {  
      this.logger.logTrace('User not logged in \- Anonymous session');  
      this.\#user.set(null);  
    }  
  }

  public login(): void {  
    window.location.href \= '/.auth/login/aad?post\_login\_redirect\_uri=/dashboard';  
  }

  public logout(): void {  
    window.location.href \= '/.auth/logout?post\_logout\_redirect\_uri=/';  
  }

  public hasRole(role: string): boolean {  
    return this.roles().includes(role);  
  }  
}

## **ADR-021: Reference Implementation \- Feature Flag Engine**

### **Context**

Risk Managers configure simulation rules via ExchangeConfig.

### **21.1 The Feature Service**

// libs/client/core/src/lib/feature/feature.service.ts  
import { Injectable, inject, signal, computed } from '@angular/core';  
import { HttpClient } from '@angular/common/http';  
import { firstValueFrom, tap } from 'rxjs';  
import { FeatureFlagResponse } from '@assetsim/shared/finance-models';  
import { LoggerService } from '../logger/logger.service';

@Injectable({ providedIn: 'root' })  
export class FeatureService {  
  private http \= inject(HttpClient);  
  private logger \= inject(LoggerService);  
    
  \#state \= signal\<FeatureFlagResponse\>({   
    flags: {},   
    configuration: {   
        initialAum: 10000000,   
        commissionBps: 5,   
        allowMargin: true,   
        volatilityIndex: 1.0,   
        dashboardLayout: \['market-status', 'holdings-blotter'\]   
    }   
  });

  public readonly flags \= computed(() \=\> this.\#state().flags);  
  public readonly config \= computed(() \=\> this.\#state().configuration);

  public loadFeatures(): Promise\<FeatureFlagResponse\> {  
    return firstValueFrom(  
      this.http.get\<FeatureFlagResponse\>('/api/v1/exchange/rules').pipe(  
        tap(data \=\> {  
            this.\#state.set(data);  
            this.logger.logEvent('ExchangeRulesLoaded', {   
                volatility: data.configuration.volatilityIndex  
            });  
        })  
      )  
    );  
  }

  public isEnabled(key: string): boolean {  
    return this.flags()\[key\] ?? false;  
  }  
}

## **ADR-022: Reference Implementation \- Trading UI Components**

### **Context**

The Institutional Terminal.

### **22.1 App Shell Component**

// libs/client/core/src/lib/layout/app-shell.component.ts  
import { Component, computed, inject } from '@angular/core';  
import { CommonModule } from '@angular/common';  
import { RouterModule, Router } from '@angular/router';  
import { AuthService } from '../auth/auth.service';  
import { LoggerService } from '../logger/logger.service';  
import { LayoutModule, DrawerItem, DrawerSelectEvent } from '@progress/kendo-angular-layout';  
import { menuIcon } from '@progress/kendo-svg-icons';

@Component({  
  selector: 'app-shell',  
  standalone: true,  
  imports: \[CommonModule, RouterModule, LayoutModule\],  
  template: \`  
    \<kendo-appbar position="top" class="bg-slate-900 text-white border-b border-slate-700"\>  
      \<kendo-appbar-section\>  
        \<button kendoButton fillMode="flat" \[svgIcon\]="icons.menu" (click)="drawer.toggle()"\>\</button\>  
        \<span class="text-xl font-bold ml-4 text-blue-400"\>AssetSim Pro\</span\>  
      \</kendo-appbar-section\>  
      \<kendo-appbar-spacer\>\</kendo-appbar-spacer\>  
      \<kendo-appbar-section\>  
        \<span class="mx-3 text-xs uppercase text-gray-400"\>Buying Power\</span\>  
        \<span class="mx-3 text-sm font-mono text-green-400"\>{{ buyingPower() | currency:'USD':'symbol':'1.0-0' }}\</span\>  
        \<kendo-avatar \[initials\]="userInitials()" shape="circle" themeColor="primary"\>\</kendo-avatar\>  
      \</kendo-appbar-section\>  
    \</kendo-appbar\>

    \<kendo-drawer-container\>  
      \<kendo-drawer \#drawer mode="push" \[items\]="navItems" \[expanded\]="true" \[mini\]="true" (select)="onSelect($event)"\>  
      \</kendo-drawer\>  
      \<kendo-drawer-content\>  
        \<div class="p-6 bg-slate-800 h-full text-white"\>\<router-outlet\>\</router-outlet\>\</div\>  
      \</kendo-drawer-content\>  
    \</kendo-drawer-container\>  
  \`  
})  
export class AppShellComponent {  
  public auth \= inject(AuthService);  
  private router \= inject(Router);  
  private logger \= inject(LoggerService);  
  public icons \= { menu: menuIcon };  
    
  public buyingPower \= signal(10000000);   
  public userInitials \= computed(() \=\> this.auth.user()?.userDetails.substring(0, 2).toUpperCase());

  public navItems: DrawerItem\[\] \= \[  
    { text: 'Terminal', icon: 'k-i-grid', path: '/dashboard', selected: true },  
    { text: 'Fund Performance', icon: 'k-i-dollar', path: '/portfolio' },  
    { text: 'Execution', icon: 'k-i-chart-line-markers', path: '/trade' }  
  \];

  public onSelect(ev: DrawerSelectEvent): void {  
    if (ev.item.path) {  
      this.logger.logEvent('Navigation', { target: ev.item.path });  
      this.router.navigate(\[ev.item.path\]);  
    }  
  }  
}

### **22.2 Dynamic Dashboard Component**

// libs/client/features/dashboard/src/lib/dashboard.component.ts  
import { Component, inject } from '@angular/core';  
import { CommonModule } from '@angular/common';  
import { FeatureService } from '@assetsim/client/core';  
import { TileLayoutModule } from '@progress/kendo-angular-layout';

// Widgets (Mocked for brevity)  
@Component({selector: 'app-market-depth', standalone: true, template: '\<div class="p-4 bg-slate-700 rounded shadow"\>L2 Market Depth\</div\>'})  
class MarketDepthComponent {}  
@Component({selector: 'app-risk-matrix', standalone: true, template: '\<div class="p-4 bg-slate-700 rounded shadow"\>Portfolio VaR: 1.2%\</div\>'})  
class RiskMatrixComponent {}  
@Component({selector: 'app-news-terminal', standalone: true, template: '\<div class="p-4 bg-slate-700 rounded shadow"\>Bloomberg Feed: Fed Rate Decision\</div\>'})  
class NewsTerminalComponent {}

@Component({  
  selector: 'app-dashboard',  
  standalone: true,  
  imports: \[CommonModule, TileLayoutModule, MarketDepthComponent, RiskMatrixComponent, NewsTerminalComponent\],  
  template: \`  
    \<h2 class="text-xl mb-4 font-bold text-slate-300"\>Trading Desk: {{ deskName() }}\</h2\>  
      
    \<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"\>  
      @for (widgetId of layout(); track widgetId) {  
        @switch (widgetId) {  
          @case ('market-depth') { \<app-market-depth class="col-span-1" /\> }  
          @case ('risk-matrix') { \<app-risk-matrix class="col-span-1 md:col-span-2" /\> }  
          @case ('news-terminal') { \<app-news-terminal class="col-span-1" /\> }  
          @default { \<div class="p-4 border border-dashed border-slate-600"\>Widget: {{widgetId}}\</div\> }  
        }  
      }  
    \</div\>  
  \`  
})  
export class DashboardComponent {  
  private featureService \= inject(FeatureService);  
  public deskName \= signal("Alpha Strategy Fund I");  
  public layout \= computed(() \=\> this.featureService.config().dashboardLayout);  
}

# **Phase 6: Operations & Lifecycle**

## **ADR-023: Reference Implementation \- CI/CD Pipelines**

### **Context**

Split pipeline: Cloud Build vs. VNet Deploy.

### **23.1 Azure Pipelines Configuration (azure-pipelines.yml)**

trigger:  
  \- main

pool:  
  vmImage: 'ubuntu-latest'

variables:  
  \- group: 'assetsim-prod-vars' \# Links to Key Vault  
  \- name: terraform\_version  
    value: '1.5.0'

stages:  
  \- stage: Build  
    displayName: 'Build Application'  
    jobs:  
      \- job: Build  
        steps:  
          \- task: NodeTool@0  
            inputs:  
              versionSpec: '20.x'  
            
          \- script: npm ci  
            displayName: 'Install Dependencies'

          \# Build Angular Client (dist/apps/client)  
          \- script: npx nx run client:build:production  
            displayName: 'Build Institutional Client'

          \# Build Backend Function App (dist/apps/backend)  
          \- script: npx nx run backend:build:production  
            displayName: 'Build Function App'

          \- task: PublishPipelineArtifact@1  
            inputs:  
              targetPath: 'dist/apps/client'  
              artifact: 'client-artifact'

          \- task: ArchiveFiles@2  
            inputs:  
              rootFolderOrFile: 'dist/apps/backend'  
              includeRootFolder: false  
              archiveType: 'zip'  
              archiveFile: '$(Build.ArtifactStagingDirectory)/backend.zip'

          \- task: PublishPipelineArtifact@1  
            inputs:  
              targetPath: '$(Build.ArtifactStagingDirectory)/backend.zip'  
              artifact: 'backend-artifact'

  \- stage: Infrastructure  
    displayName: 'Provision Infrastructure'  
    jobs:  
      \- job: Terraform  
        pool:   
          name: 'Self-Hosted-VNet-Pool' \# MUST be inside VNet to reach Storage/KeyVault  
        steps:  
          \- task: TerraformInstaller@0  
            inputs:  
              terraformVersion: $(terraform\_version)

          \- task: TerraformTaskV4@4  
            inputs:  
              provider: 'azurerm'  
              command: 'init'  
              backendServiceArm: 'Azure-Service-Connection'  
              backendAzureRmResourceGroupName: 'rg-tfstate'  
              backendAzureRmStorageAccountName: 'sttfstate'  
              backendAzureRmContainerName: 'tfstate'  
              backendAzureRmKey: 'prod.terraform.tfstate'

          \- task: TerraformTaskV4@4  
            inputs:  
              provider: 'azurerm'  
              command: 'apply'  
              environmentServiceNameAzureRM: 'Azure-Service-Connection'  
              commandOptions: '-auto-approve'

  \- stage: Deploy  
    displayName: 'Deploy Code'  
    dependsOn: Infrastructure  
    jobs:  
      \- job: DeployAssets  
        pool:   
          name: 'Self-Hosted-VNet-Pool'  
        steps:  
          \- task: DownloadPipelineArtifact@2  
            inputs:  
              artifact: 'client-artifact'  
              path: '$(Pipeline.Workspace)/client'

          \- task: DownloadPipelineArtifact@2  
            inputs:  
              artifact: 'backend-artifact'  
              path: '$(Pipeline.Workspace)/backend'

          \# 1\. Deploy Function App (Backend API & Market Engine)  
          \- task: AzureFunctionApp@2  
            inputs:  
              azureSubscription: 'Azure-Service-Connection'  
              appType: 'functionAppLinux'  
              appName: 'func-assetsim-backend-prod' \# Must match Terraform Output  
              package: '$(Pipeline.Workspace)/backend/backend.zip'  
              deploymentMethod: 'runFromPackage'

          \# 2\. Deploy Static Content (Frontend)  
          \- task: AzureStaticWebApp@0  
            inputs:  
              app\_location: '/'   
              api\_location: ''   
              output\_location: '$(Pipeline.Workspace)/client'  
              skip\_app\_build: true  
              azure\_static\_web\_apps\_api\_token: $(SWA\_DEPLOYMENT\_TOKEN)

          \# 3\. Database Migrations (Run from VNet)  
          \- script: |  
              export DATABASE\_URL="$(SQL\_CONNECTION\_STRING)" \# From KeyVault  
              npx prisma migrate deploy  
            displayName: 'Run Prisma Migrations'

## **ADR-024: Local Data Seeding Strategy**

### **Context**

Populating the local Docker environment (ADR-003).

### **Decision**

**Automated Seed Scripts**.

### **Specification**

* **Script:** npm run seed:local  
* **Action:** Injects Demo Exchange, Market Config, and Fake History into local SQL/Redis.

## **ADR-025: Observability & Health Checks**

### **Context**

Monitoring the silent ticker background process.

### **Decision**

Use **Application Insights Custom Metrics**.

### **Specification**

* **Heartbeat Alert:** Trigger Sev1 if CustomMetrics/UpdatesBroadcasted \< 100 in 5 mins.