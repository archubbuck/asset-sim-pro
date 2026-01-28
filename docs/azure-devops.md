# Azure DevOps Pipeline Documentation

This document contains documentation for the AssetSim Pro CI/CD pipeline.

## Quick Links

- **Pipeline File:** [`/azure-pipelines.yml`](../azure-pipelines.yml)
- **Architecture Decision:** [ARCHITECTURE.md](../ARCHITECTURE.md) (ADR-023)
- **Deployment Guide:** [DEPLOYMENT_GUIDE.md](./deployment/DEPLOYMENT_GUIDE.md#cicd-pipeline-adr-023)

## Pipeline Overview

The AssetSim Pro pipeline implements a **split architecture** for security:

- **Build Stage:** Cloud-hosted (fast, cost-effective)
- **Infrastructure & Deploy Stages:** VNet-hosted (secure, private access)

## Pipeline Stages

### 1️⃣ Build Application (Cloud)

**Agent Pool:** `ubuntu-latest`

**Tasks:**
- Install Node.js 20.x
- Install dependencies (`npm ci`)
- Build Angular client: `npx nx run client:build:production`
- Build Azure Functions backend: `cd apps/backend && npm ci && npm run build`
- Publish artifacts: `client-artifact`, `backend-artifact`

**Outputs:**
- `dist/apps/client` → Published as client-artifact
- `apps/backend` (including `dist/`, `host.json`, `package.json`, etc.) → Archived and published as backend-artifact

### 2️⃣ Provision Infrastructure (VNet)

**Agent Pool:** `Self-Hosted-VNet-Pool` (required for private endpoints)

**Tasks:**
- Install Terraform 1.7.0
- Initialize Terraform backend (rg-tfstate/sttfstate/tfstate)
- Apply Terraform configuration (`terraform apply -auto-approve`)

**Prerequisites:**
- Terraform state storage (see [BOOTSTRAP_GUIDE.md](./deployment/BOOTSTRAP_GUIDE.md))
- Self-hosted agent in VNet
- Azure service connection with Contributor role

### 3️⃣ Deploy Code (VNet)

**Agent Pool:** `Self-Hosted-VNet-Pool`

**Tasks:**
- Download build artifacts
- Deploy Function App: `func-assetsim-backend-prod`
- Deploy Static Web App: Uses `SWA_DEPLOYMENT_TOKEN`
- Run database migrations: `npx prisma migrate deploy`

**Security:**
- All deployments from VNet for private endpoint access
- Credentials from Azure Key Vault via variable group

## Configuration Requirements

### Variable Group: `assetsim-prod-vars`

Link to Azure Key Vault and include:

| Variable | Source | Purpose |
|----------|--------|---------|
| `SWA_DEPLOYMENT_TOKEN` | Static Web App | Frontend deployment |
| `SQL_CONNECTION_STRING` | Azure SQL Database | Database migrations |

### Service Connection: `Azure-Service-Connection`

- **Type:** Azure Resource Manager
- **Scope:** Subscription
- **Permissions:** Contributor
- **Used By:** Terraform tasks, Function App deployment, Static Web App deployment

## Running the Pipeline

### Automatic Trigger

The pipeline runs automatically on commits to `main`:

```bash
git push origin main
```

### Manual Trigger

1. Go to Azure DevOps → Pipelines
2. Select "asset-sim-pro" pipeline
3. Click "Run pipeline"
4. Choose branch (default: `main`)
5. Click "Run"

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Build fails - dependencies | Run `npm ci` locally to verify |
| Terraform init fails | Check VNet agent status and service connection |
| Terraform apply fails | Review plan output, check quotas |
| Function deploy fails | Verify Function App exists in target resource group |
| SWA deploy fails | Check `SWA_DEPLOYMENT_TOKEN` in variable group |
| Migration fails | Verify `SQL_CONNECTION_STRING` and VNet connectivity |

### Agent Pool Health

Check Self-Hosted-VNet-Pool status:

```bash
# Via Azure DevOps UI
Organization Settings → Agent pools → Self-Hosted-VNet-Pool

# Look for:
- Agent status: Online
- Recent jobs: Successful
- Agent version: Up to date
```

### Pipeline Logs

View detailed logs in Azure DevOps:

1. Pipelines → Runs → Select run
2. Click stage to expand
3. Click job to expand
4. Click task to view logs

## Security Best Practices

1. ✅ **Never commit secrets** to source control
2. ✅ **Use Key Vault** for all sensitive variables
3. ✅ **Rotate tokens** quarterly (SWA deployment token)
4. ✅ **Monitor pipeline runs** for anomalies
5. ✅ **Restrict pipeline permissions** to specific environments
6. ✅ **Use VNet agents** for infrastructure and deployment
7. ✅ **Enable audit logging** in Azure DevOps

## Architecture Decisions

This pipeline implements **ADR-023: CI/CD Pipelines** as documented in [ARCHITECTURE.md](../ARCHITECTURE.md#L1170-L1296).

### Key Decisions

- **Split Architecture:** Separate build (cloud) from deploy (VNet) for cost and security balance
- **Nx Build System:** Monorepo support with efficient caching
- **Terraform IaC:** Declarative infrastructure with version control
- **Run From Package:** Function App deployment method for reliability
- **Private Endpoints:** VNet-based deployment for Zero Trust security

## Related Documentation

- [DEPLOYMENT_GUIDE.md](./deployment/DEPLOYMENT_GUIDE.md) - Full deployment procedures
- [BOOTSTRAP_GUIDE.md](./deployment/BOOTSTRAP_GUIDE.md) - Initial setup steps
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Architecture decisions (ADR-023)
- [ZERO_TRUST_IMPLEMENTATION.md](./architecture/ZERO_TRUST_IMPLEMENTATION.md) - Security architecture

## Support

For pipeline issues:

1. Check this document for common solutions
2. Review pipeline logs in Azure DevOps
3. Consult [DEPLOYMENT_GUIDE.md](./deployment/DEPLOYMENT_GUIDE.md) troubleshooting section
4. Contact the AssetSim Pro Infrastructure Team

---

**Document Version:** 1.0  
**Last Updated:** January 25, 2026  
**Maintained By:** AssetSim Pro Infrastructure Team
