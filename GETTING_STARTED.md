# Getting Started with AssetSim Pro

**Quick Start Guide for New Developers**

This guide provides the essential steps to get AssetSim Pro running locally or deploying to Azure. Follow this path to avoid reading hundreds of pages of documentation upfront.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Azure Deployment Path](#azure-deployment-path)
4. [Next Steps](#next-steps)
5. [Common Issues](#common-issues)

---

## Prerequisites

Before starting, ensure you have:

### For Local Development

- **Node.js 20.x** or higher
- **Git**
- **npm** package manager
- **Azure Functions Core Tools** (for running the backend)

**Note:** Docker is NO LONGER required for local development! All business logic services (database, cache, SignalR, Event Hub) are mocked in-memory. 

**Storage Requirement:** The Azure Functions runtime requires storage for internal state management. You can use either:
- **Azurite** (lightweight local emulator): Set `AzureWebJobsStorage: UseDevelopmentStorage=true` in `local.settings.json` - [Install Azurite](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azurite)
- **Real Azure Storage**: Provide an Azure Storage connection string

### For Azure Deployment

All of the above, plus:

- **Azure Subscription** with Contributor or Owner role
- **Azure CLI 2.50.0+** installed and configured
- **Microsoft Entra ID Global Administrator** role (for API consent only)
- **Terraform 1.5.0+** (for infrastructure deployment)

---

## Local Development Setup

For local development, all services are mocked in-memory. No Docker, no external dependencies!

### Step 1: Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/archubbuck/asset-sim-pro.git
cd asset-sim-pro

# Install dependencies
npm install
```

### Step 2: Configure Environment (Optional)

For local development with mocked services, no configuration is needed! The application automatically uses:
- **SqliteDatabase** (in-memory) instead of SQL Server
- **MemoryCache** (in-memory) instead of Redis
- **MockSignalR** (in-memory) instead of Azure SignalR
- **MockEventHub** (in-memory) instead of Azure Event Hubs

If you need to connect to real Azure services (advanced), create `.env.local`:

```bash
cp .env.local.example .env.local
# Edit .env.local and add your Azure connection strings
```

### Step 3: Start the Application

```bash
# Start both backend and client together
npm run start:dev
```

This will start:
- **Backend API** at `http://localhost:7071`
- **Angular Client** at `http://localhost:4200`

Alternatively, run them separately:

```bash
# Terminal 1: Start backend
npm run backend:start

# Terminal 2: Start client
npm start
```

### Step 4: Verify Everything Works

1. Open browser to `http://localhost:4200`
2. Backend API docs available at `http://localhost:7071/api/docs`
3. Health check at `http://localhost:7071/api/health`

**What's Running:**
- ✅ Backend with mocked database, cache, SignalR, and Event Hub
- ✅ Real-time price updates logged to console
- ✅ Sample data auto-seeded on startup
- ✅ No external services required!

### ✅ Verify Local Setup

- **Frontend:** http://localhost:4200 (Angular with hot reload)
- **Backend API:** http://localhost:7071/api (Azure Functions with watch mode)
- **Backend Health:** http://localhost:7071/api/health
- **Frontend Health:** http://localhost/health

**📖 Next:** See [NX_WORKSPACE_GUIDE.md](./docs/development/NX_WORKSPACE_GUIDE.md#containerized-development) for development workflow.

### 🔄 Development Workflow

**Code Changes:**
- Edit files in `apps/client/` or `apps/backend/` - changes are reflected immediately
- No need to restart containers for code changes
- Frontend uses Angular dev server with live reload
- Backend uses Azure Functions watch mode

**When to Rebuild:**
```bash
# Only rebuild if you change Dockerfile or package.json dependencies
npm run docker:dev:build
```

**Stop and Clean Up:**
```bash
# Stop all containers
npm run docker:dev:down

# Stop and remove volumes (fresh start)
npm run docker:dev:clean
```

---

## Azure Deployment Path

To deploy AssetSim Pro to Azure, follow this **sequential path**:

### Path Overview

```
1. Bootstrap (One-Time Setup)
   ↓
2. Infrastructure Deployment
   ↓
3. Backend Configuration
   ↓
4. Frontend Deployment
   ↓
5. Verification
```

### Step 1: Bootstrap Azure Resources

**⚠️ REQUIRED BEFORE DEPLOYMENT:** Complete bootstrap operations to set up foundational infrastructure.

#### Configure Secrets

Before deploying, configure the following secrets:

**For GitHub Actions CI/CD:**
1. Go to your GitHub repository → Settings → Secrets and variables → Actions
2. Add a new repository secret:
   - Name: `KENDO_UI_LICENSE`
   - Value: Your Kendo UI license key from https://www.telerik.com/account/

**For Azure DevOps:**
1. In your Azure DevOps project, go to Pipelines → Library
2. Add `KENDO_UI_LICENSE` to the `assetsim-prod-vars` variable group
3. Mark it as secret to protect the value

These secrets are used during the build process to embed the Kendo UI license key without exposing it in source control.

#### Option A: Automated Bootstrap (Recommended)

```bash
# 1. Create Terraform state storage
./scripts/bootstrap-terraform-state.sh

# 2. Grant Entra ID API permissions (requires Global Admin)
export APP_ID="your-application-client-id"
./scripts/bootstrap-entra-consent.sh
```

**📖 See:** [scripts/README.md](./scripts/README.md) for detailed automation documentation.

#### Option B: Manual Bootstrap

Follow the comprehensive manual steps in [BOOTSTRAP_GUIDE.md](./docs/deployment/BOOTSTRAP_GUIDE.md), which covers:

- Phase 1: Terraform State Storage
- Phase 2: Entra ID API Consent
- Phase 3: Azure DevOps Self-Hosted Agent Pool

**📖 See:** [BOOTSTRAP_GUIDE.md](./docs/deployment/BOOTSTRAP_GUIDE.md) for step-by-step manual instructions.

### Step 2: Deploy Infrastructure with Terraform

After bootstrap is complete:

```bash
# Navigate to Terraform directory
cd terraform

# Initialize Terraform with remote state
terraform init \
  -backend-config="resource_group_name=rg-tfstate" \
  -backend-config="storage_account_name=<your-storage-account>" \
  -backend-config="container_name=tfstate"

# Review deployment plan
terraform plan

# Deploy infrastructure
terraform apply
```

**📖 See:** [DEPLOYMENT_GUIDE.md](./docs/deployment/DEPLOYMENT_GUIDE.md) for complete deployment instructions.

### Step 3: Configure Backend

```bash
# Deploy Azure Functions
cd apps/backend
func azure functionapp publish <your-function-app-name>

# Configure application settings (Entra ID, connection strings)
az functionapp config appsettings set \
  --name <your-function-app-name> \
  --resource-group <your-resource-group> \
  --settings @appsettings.json
```

**📖 See:** [DEPLOYMENT_GUIDE.md - Phase 4](./docs/deployment/DEPLOYMENT_GUIDE.md#phase-4-deploy-backend-function-app) for detailed backend configuration.

### Step 4: Deploy Frontend

```bash
# Build and deploy Static Web App
npm run build:prod
swa deploy ./dist/apps/client \
  --deployment-token $DEPLOYMENT_TOKEN
```

**📖 See:** [DEPLOYMENT_GUIDE.md - Phase 5](./docs/deployment/DEPLOYMENT_GUIDE.md#phase-5-configure-static-web-app) for Static Web App setup.

### Step 5: Verify Deployment

Run the verification checklist:

```bash
# Verify infrastructure
terraform output

# Test backend health
curl https://<your-function-app>.azurewebsites.net/api/health

# Test frontend
curl https://<your-static-web-app>.azurestaticapps.net
```

**📖 See:** [VERIFICATION.md](./docs/architecture/VERIFICATION.md) for complete verification steps.

---

## Next Steps

### After Local Setup

- **Explore the codebase:** [NX_WORKSPACE_GUIDE.md](./docs/development/NX_WORKSPACE_GUIDE.md)
- **Understand architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Review testing strategy:** [TESTING.md](./docs/development/TESTING.md)
- **Contribution guidelines:** [CONTRIBUTING.md](./CONTRIBUTING.md)

### After Azure Deployment

- **Configure monitoring:** Set up Application Insights
- **Review security:** [ZERO_TRUST_IMPLEMENTATION.md](./docs/architecture/ZERO_TRUST_IMPLEMENTATION.md)
- **Set up CI/CD:** Review [azure-pipelines.yml](./azure-pipelines.yml)

### Understanding the Project

- **Architecture decisions:** [ARCHITECTURE.md](./ARCHITECTURE.md) contains all ADRs
- **Backend-frontend integration:** [BACKEND_FRONTEND_INTEGRATION.md](./docs/architecture/BACKEND_FRONTEND_INTEGRATION.md)

---

## Common Issues

### Issue: "Docker services not starting"

**Solution:**

```bash
# Check Docker is running
docker ps

# View logs for troubleshooting
npm run docker:logs

# Reset services (clean restart)
npm run docker:dev:clean
npm run docker:dev:build
```

**On Windows (Docker Desktop):**

If Docker daemon crashes or is unresponsive:

1. Right-click Docker Desktop tray icon
2. Select "Restart"
3. Wait for "Docker Desktop is running" status
4. Run `npm run docker:dev:build`

**Note:** Docker runs on Windows, not inside WSL2. Do not use `service docker restart` in WSL.

### Issue: "Commit message rejected"

**Cause:** This project uses [Conventional Commits](https://www.conventionalcommits.org/)

**Solution:**

```bash
# Valid format: type(scope): description
git commit -m "feat(backend): add new feature"
git commit -m "fix(frontend): resolve bug"
```

**📖 See:** [CONTRIBUTING.md](./CONTRIBUTING.md) for commit message guidelines.

### Issue: "Azure authentication failed"

**Solution:**

```bash
# Login to Azure
az login

# Set correct subscription
az account set --subscription "<your-subscription-id>"

# Verify login
az account show
```

### Issue: "Terraform backend not found"

**Cause:** Bootstrap not completed

**Solution:** Complete [Step 1: Bootstrap Azure Resources](#step-1-bootstrap-azure-resources) first.

### Issue: "npm install fails"

**Solution:**

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and lockfile
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

---

## Document Navigation

This is your **starting point**. Here's how the documentation is organized:

### 📚 Complete Documentation Index

For comprehensive documentation navigation, visit the **[Documentation Hub (`docs/README.md`)](./docs/README.md)**

### Quick Navigation

```
GETTING_STARTED.md (you are here) ← Start here for quick setup
├── docs/README.md ← Complete documentation hub and index
├── README.md ← Project overview and workspace structure
├── Local Development Path
│   ├── docs/development/NX_WORKSPACE_GUIDE.md ← Nx monorepo development
│   ├── docs/development/TESTING.md ← Testing strategy
│   └── CONTRIBUTING.md ← Git workflow and standards
└── Azure Deployment Path
    ├── docs/deployment/BOOTSTRAP_GUIDE.md ← Manual bootstrap procedures (one-time)
    ├── scripts/README.md ← Automated bootstrap scripts
    ├── docs/deployment/DEPLOYMENT_GUIDE.md ← Terraform and app deployment
    ├── docs/architecture/VERIFICATION.md ← Post-deployment verification
    └── docs/architecture/ZERO_TRUST_IMPLEMENTATION.md ← Security architecture details
```

### Architecture Documents

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - All architectural decision records (ADRs)
- **[docs/architecture/BACKEND_FRONTEND_INTEGRATION.md](./docs/architecture/BACKEND_FRONTEND_INTEGRATION.md)** - Integration architecture

---

## Support

- **Documentation Hub:** See [docs/README.md](./docs/README.md) for complete documentation index
- **Documentation Issues:** Create an issue on GitHub
- **Architecture Questions:** See [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Development Questions:** See [CONTRIBUTING.md](./CONTRIBUTING.md)

---

**Last Updated:** January 28, 2026  
**Maintained By:** AssetSim Pro Engineering Team
