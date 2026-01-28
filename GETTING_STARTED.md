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
- **Docker & Docker Compose** (for local services)
- **Git**
- **npm** package manager

### For Azure Deployment

All of the above, plus:

- **Azure Subscription** with Contributor or Owner role
- **Azure CLI 2.50.0+** installed and configured
- **Microsoft Entra ID Global Administrator** role (for API consent only)
- **Terraform 1.5.0+** (for infrastructure deployment)

---

## Local Development Setup

For local development without Azure, follow these steps:

### Step 1: Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/archubbuck/asset-sim-pro.git
cd asset-sim-pro

# Install dependencies
npm install
```

This automatically sets up Husky git hooks for commit message validation.

### Step 2: Start Local Services

```bash
# Start Docker services (SQL Server, Redis, Azurite, SignalR emulator)
docker compose up -d

# Verify services are running
docker compose ps
```

### Step 3: Initialize and Seed Database

```bash
# Create database schema
npm run db:init

# Seed with demo data (optional but recommended)
npm run seed:local
```

### Step 4: Configure Local Environment

```bash
# Copy environment template
cp .env.local.example .env.local

# Review and adjust connection strings if needed
# (Default values work with Docker Compose setup)
```

### Step 5: Start Development Servers

```bash
# Terminal 1: Start Angular dev server
npm start

# Terminal 2: Start Azure Functions backend (in a new terminal)
cd apps/backend
npm install
cp local.settings.json.example local.settings.json
npm start
```

### ✅ Verify Local Setup

- **Frontend:** http://localhost:4200
- **Backend API:** http://localhost:7071/api
- **API Documentation:** http://localhost:7071/api/docs

**📖 Next:** See [Local Development Guide](./README.md#local-development-environment) for detailed Docker service configuration.

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
docker compose logs

# Reset services
docker compose down -v
docker compose up -d
```

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
