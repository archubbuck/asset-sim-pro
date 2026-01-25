# Deployment Guide - Zero Trust Architecture

This guide covers deploying the AssetSim Pro Zero Trust Architecture to Azure.

## Before You Begin

⚠️ **IMPORTANT:** This guide assumes you have completed the bootstrap procedures.

### Option A: Quick Path with Automation (Recommended)

```bash
# 1. Bootstrap with automation scripts
./scripts/bootstrap-terraform-state.sh
./scripts/bootstrap-entra-consent.sh

# 2. Continue with this deployment guide
```

See **[GETTING_STARTED.md](./GETTING_STARTED.md)** for the complete quick start path.

### Option B: Manual Bootstrap Path

Complete the manual bootstrap steps documented in **[BOOTSTRAP_GUIDE.md](./BOOTSTRAP_GUIDE.md)** (ADR-012):

1. **Terraform State Storage**: Create `rg-tfstate` resource group and Storage Account
2. **Entra ID Consent**: Grant `GroupMember.Read.All` API permission (requires Global Admin)
3. **Azure DevOps Agent Pool**: Create `Self-Hosted-VNet-Pool` for VNet deployments

If you haven't completed bootstrap, see:
- **[scripts/README.md](./scripts/README.md)** for automated bootstrap
- **[BOOTSTRAP_GUIDE.md](./BOOTSTRAP_GUIDE.md)** for manual bootstrap procedures

## Prerequisites

### Required Tools
- Azure CLI (2.50.0+)
- Terraform (1.5.0+)
- Azure Functions Core Tools (4.x)
- Node.js (20.x)
- SQL Server Management Studio or sqlcmd (for schema deployment)

### Azure Permissions
- Owner or Contributor role on target subscription
- Completed bootstrap steps per [BOOTSTRAP_GUIDE.md](./BOOTSTRAP_GUIDE.md) (ADR-012)

### Network Access
- Self-hosted agent in VNet (for deployment to private resources) - configured per BOOTSTRAP_GUIDE.md
- Or jumpbox/bastion host in VNet for manual operations

### Bootstrap Verification

Before proceeding with Terraform deployment, verify you have:

- [ ] **Terraform state storage** (`rg-tfstate` + Storage Account)
  - Automated: `./scripts/bootstrap-terraform-state.sh` completed
  - Manual: [BOOTSTRAP_GUIDE.md Phase 1](./BOOTSTRAP_GUIDE.md#phase-1-terraform-state-storage-bootstrap)
- [ ] **Entra ID consent** (app registration with `GroupMember.Read.All`)
  - Automated: `./scripts/bootstrap-entra-consent.sh` completed
  - Manual: [BOOTSTRAP_GUIDE.md Phase 2](./BOOTSTRAP_GUIDE.md#phase-2-entra-id-api-consent)
- [ ] **Azure DevOps agent pool** (`Self-Hosted-VNet-Pool` created)
  - Manual only: [BOOTSTRAP_GUIDE.md Phase 3](./BOOTSTRAP_GUIDE.md#phase-3-azure-devops-self-hosted-agent-pool)
- [ ] Storage account name saved for backend configuration

## Phase 1: Terraform Backend Configuration

### 1.1 Retrieve Backend Configuration

If you used the automated script, the configuration is in `terraform-backend-config/`:

```bash
# From automated bootstrap
cat terraform-backend-config/backend.tf
```

If you performed manual bootstrap, retrieve from Azure:

```bash
# Retrieve storage account name from Azure
RG_NAME="rg-tfstate"
STORAGE_NAME=$(az storage account list \
  --resource-group $RG_NAME \
  --query "[0].name" \
  --output tsv)

echo "Storage Account: $STORAGE_NAME"
```

**Reference:** See [BOOTSTRAP_GUIDE.md Phase 1.5](./BOOTSTRAP_GUIDE.md#step-15-save-configuration-for-terraform) for saved configuration details.

### 1.2 Create Terraform Backend Configuration File

**If using automated bootstrap:** Copy the generated file:

```bash
cp terraform-backend-config/backend.tf terraform/
```

**If using manual bootstrap:** Create `terraform/backend.tfvars`:

```hcl
resource_group_name  = "rg-tfstate"
storage_account_name = "<YOUR_STORAGE_NAME>"  # From bootstrap
container_name       = "tfstate"
key                  = "assetsim-prod.terraform.tfstate"
```

Replace `<YOUR_STORAGE_NAME>` with the storage account name from bootstrap.

### 1.3 Create Service Principal for Terraform (Optional)

If using service principal authentication for Terraform (alternative to Azure CLI):

```bash
# Create service principal
SP_NAME="sp-terraform-assetsim"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

az ad sp create-for-rbac \
  --name $SP_NAME \
  --role Contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID

# Save output:
# - appId (ARM_CLIENT_ID)
# - password (ARM_CLIENT_SECRET)
# - tenant (ARM_TENANT_ID)
```

**Note:** This is separate from the Entra ID application for user authentication, which was configured during bootstrap. See [BOOTSTRAP_GUIDE.md Phase 2](./BOOTSTRAP_GUIDE.md#phase-2-entra-id-api-consent) for details.

## Phase 2: Deploy Infrastructure with Terraform

### 2.1 Create Terraform Variables

Create `terraform/terraform.tfvars`:

```hcl
environment = "prod"
location    = "East US 2"
vnet_cidr   = "10.0.0.0/16"
sql_admin_password = "<GENERATE_STRONG_PASSWORD>"
```

**Security Note**: Never commit `terraform.tfvars` to source control. Use Azure Key Vault or pipeline variables in production.

### 2.2 Initialize and Deploy

```bash
cd terraform

# Initialize Terraform with backend configuration
terraform init -backend-config=backend.tfvars

# Validate configuration
terraform validate

# Plan deployment
terraform plan -var-file=terraform.tfvars

# Apply (requires confirmation)
terraform apply -var-file=terraform.tfvars

# Save outputs
terraform output > ../outputs.txt
```

### 2.3 Verify Network Isolation

After deployment, verify Zero Trust architecture:

```bash
# Check SQL Server public access (should be disabled)
az sql server show \
  --name sql-assetsim-prod \
  --resource-group rg-assetsim-prod-useast2 \
  --query publicNetworkAccess

# Check Redis public access (should be Disabled)
az redis show \
  --name redis-assetsim-prod \
  --resource-group rg-assetsim-prod-useast2 \
  --query publicNetworkAccess

# Check Event Hub public access (should be Disabled)
az eventhubs namespace show \
  --name ehns-assetsim-prod \
  --resource-group rg-assetsim-prod-useast2 \
  --query publicNetworkAccess

# Check Key Vault public access (should be Disabled)
az keyvault show \
  --name kv-assetsim-prod \
  --resource-group rg-assetsim-prod-useast2 \
  --query properties.publicNetworkAccess
```

## Phase 3: Deploy Database Schema

### 3.1 Connect via Private Endpoint

Option A: Use Azure Bastion or Jumpbox in VNet:

```bash
# From VNet-connected machine
sqlcmd -S sql-assetsim-prod.database.windows.net \
  -d sqldb-assetsim \
  -U sqladmin \
  -P '<YOUR_PASSWORD>' \
  -i database/schema.sql
```

Option B: Use Azure Cloud Shell with VNet integration:

```bash
# Configure Cloud Shell to use VNet
az cloud-shell create \
  --vnet-resource-group rg-assetsim-prod-useast2 \
  --vnet-name vnet-assetsim-prod \
  --subnet-name snet-cloudshell

# Then run sqlcmd as above
```

### 3.2 Verify Schema Deployment

```sql
-- Check tables created
SELECT TABLE_SCHEMA, TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'Trade'
ORDER BY TABLE_NAME;

-- Check RLS policies
SELECT 
    p.name AS PolicyName,
    o.name AS TableName,
    t.predicate_definition
FROM sys.security_policies p
JOIN sys.security_predicates t ON p.object_id = t.object_id
JOIN sys.objects o ON t.target_object_id = o.object_id
WHERE o.schema_id = SCHEMA_ID('Trade');
```

## Phase 4: Deploy Backend Function App

### 4.1 Build Backend

```bash
cd backend

# Install dependencies
npm install

# Build TypeScript
npm run build

# Create deployment package
cd dist
zip -r ../backend.zip .
cd ..
```

### 4.2 Configure Application Settings

Store secrets in Key Vault:

```bash
# Store SQL connection string
az keyvault secret set \
  --vault-name kv-assetsim-prod \
  --name sql-connection-string \
  --value "Server=sql-assetsim-prod.database.windows.net;Database=sqldb-assetsim;User Id=sqladmin;Password=<YOUR_PASSWORD>;Encrypt=true;"

# Get Key Vault URI
KEYVAULT_URI=$(az keyvault show \
  --name kv-assetsim-prod \
  --query properties.vaultUri -o tsv)
```

Grant Function App access to Key Vault:

```bash
# Get Function App identity
FUNC_IDENTITY=$(az functionapp identity show \
  --name func-assetsim-backend-prod \
  --resource-group rg-assetsim-prod-useast2 \
  --query principalId -o tsv)

# Grant access policy
az keyvault set-policy \
  --name kv-assetsim-prod \
  --object-id $FUNC_IDENTITY \
  --secret-permissions get list
```

Configure Function App settings:

```bash
az functionapp config appsettings set \
  --name func-assetsim-backend-prod \
  --resource-group rg-assetsim-prod-useast2 \
  --settings \
    "SQL_CONNECTION_STRING=@Microsoft.KeyVault(SecretUri=${KEYVAULT_URI}secrets/sql-connection-string/)"
```

### 4.3 Deploy Function Code

```bash
az functionapp deployment source config-zip \
  --name func-assetsim-backend-prod \
  --resource-group rg-assetsim-prod-useast2 \
  --src backend.zip
```

### 4.4 Verify Backend Deployment

```bash
# Check function status
az functionapp function show \
  --name func-assetsim-backend-prod \
  --resource-group rg-assetsim-prod-useast2 \
  --function-name createExchange

# Test endpoint (requires authentication)
curl -X POST \
  https://func-assetsim-backend-prod.azurewebsites.net/api/v1/exchanges \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Exchange"}'
```

## Phase 5: Configure Static Web App

### 5.1 Link to Backend

The Terraform configuration already links SWA to Function App via BYOB.

### 5.2 Configure Entra ID Authentication

```bash
# Get Static Web App hostname
SWA_HOSTNAME=$(az staticwebapp show \
  --name stapp-assetsim-prod \
  --resource-group rg-assetsim-prod-useast2 \
  --query defaultHostname -o tsv)

# Update Entra ID app redirect URI
az ad app update \
  --id $APP_ID \
  --web-redirect-uris \
    "https://$SWA_HOSTNAME/.auth/login/aad/callback"
```

Create `staticwebapp.config.json` in frontend:

```json
{
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": {
        "registration": {
          "openIdIssuer": "https://login.microsoftonline.com/<TENANT_ID>/v2.0",
          "clientIdSettingName": "AAD_CLIENT_ID",
          "clientSecretSettingName": "AAD_CLIENT_SECRET"
        }
      }
    }
  },
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["authenticated"]
    }
  ],
  "navigationFallback": {
    "rewrite": "/index.html"
  }
}
```

## Phase 6: Production Checklist

### Security
- [ ] SQL admin password rotated and stored in Key Vault
- [ ] TLS 1.2 minimum enforced on all services
- [ ] Network Security Groups configured for subnets
- [ ] Azure Firewall or Application Gateway configured
- [ ] Managed identities enabled for all services
- [ ] Key Vault access policies configured
- [ ] Entra ID conditional access policies configured

### Monitoring
- [ ] Application Insights configured
- [ ] Log Analytics workspace linked
- [ ] Alerts configured for:
  - Function App failures
  - SQL Database DTU usage
  - Redis memory usage
  - Private endpoint connectivity
- [ ] Diagnostic logs enabled for all services

### Backup & DR
- [ ] SQL Database automated backups enabled
- [ ] Geo-redundant backup configured
- [ ] Disaster recovery plan documented
- [ ] RPO/RTO requirements defined

### Cost Optimization
- [ ] Right-size SQL Elastic Pool capacity
- [ ] Configure Function App scaling rules
- [ ] Review Redis cache tier
- [ ] Set up Azure Advisor recommendations

## Troubleshooting

### Cannot Connect to SQL Server
```bash
# Verify private endpoint DNS resolution
nslookup sql-assetsim-prod.database.windows.net

# Should resolve to private IP (10.0.2.x)
```

### Function App Cannot Access Data Services
```bash
# Check VNet integration status
az functionapp vnet-integration list \
  --name func-assetsim-backend-prod \
  --resource-group rg-assetsim-prod-useast2

# Verify route all enabled
az functionapp config show \
  --name func-assetsim-backend-prod \
  --resource-group rg-assetsim-prod-useast2 \
  --query vnetRouteAllEnabled
```

### Authentication Issues
```bash
# Check Static Web App auth configuration
az staticwebapp show \
  --name stapp-assetsim-prod \
  --resource-group rg-assetsim-prod-useast2 \
  --query "{hostname:defaultHostname,customDomains:customDomains}"

# Verify Entra ID app registration redirect URIs
az ad app show --id $APP_ID --query web.redirectUris
```

## CI/CD Pipeline (ADR-023)

AssetSim Pro uses Azure DevOps with a split pipeline architecture for secure, automated deployments.

### Pipeline Architecture

The pipeline is divided into three stages:

1. **Build Stage** (Cloud - `ubuntu-latest`)
   - Compiles Angular client and Azure Functions backend
   - Publishes build artifacts
   - Runs on cloud-hosted agents for efficiency

2. **Infrastructure Stage** (VNet - `Self-Hosted-VNet-Pool`)
   - Provisions Azure resources via Terraform
   - Runs from VNet for secure access to private resources
   - Manages infrastructure as code

3. **Deploy Stage** (VNet - `Self-Hosted-VNet-Pool`)
   - Deploys Function App and Static Web App
   - Runs database migrations
   - Executes from VNet for security

### Pipeline Configuration

The pipeline is defined in `azure-pipelines.yml` at the repository root.

#### Required Variables

Create an Azure DevOps Variable Group named `assetsim-prod-vars` linked to Azure Key Vault:

```yaml
# Variables from Azure Key Vault
- SWA_DEPLOYMENT_TOKEN: Static Web App deployment token
- SQL_CONNECTION_STRING: Database connection string for migrations
```

#### Required Service Connections

1. **Azure-Service-Connection**
   - Type: Azure Resource Manager
   - Permissions: Contributor on target subscription
   - Used for Terraform and deployment tasks

### Running the Pipeline

The pipeline triggers automatically on commits to the `main` branch:

```bash
# Commit and push to trigger pipeline
git add .
git commit -m "feat: new feature"
git push origin main
```

Manual trigger via Azure DevOps:
1. Navigate to Pipelines → asset-sim-pro
2. Click "Run pipeline"
3. Select branch and click "Run"

### Pipeline Stages in Detail

#### Stage 1: Build Application

```yaml
# Builds Angular client with Nx
npx nx run client:build:production → dist/apps/client

# Builds Azure Functions backend
cd apps/backend && npm ci && npm run build → apps/backend/dist

# Publishes artifacts
- client-artifact: dist/apps/client
- backend-artifact: backend.zip (contains package.json, host.json, dist/)
```

#### Stage 2: Provision Infrastructure

```yaml
# Install Terraform 1.7.0
# Initialize with remote backend
terraform init \
  -backend-config="resource_group_name=rg-tfstate" \
  -backend-config="storage_account_name=sttfstate" \
  -backend-config="container_name=tfstate" \
  -backend-config="key=prod.terraform.tfstate"

# Apply infrastructure changes
terraform apply -auto-approve
```

**Prerequisites:**
- Terraform state storage (see BOOTSTRAP_GUIDE.md Phase 1)
- `Self-Hosted-VNet-Pool` configured (see BOOTSTRAP_GUIDE.md Phase 3)
- Service connection with appropriate permissions

#### Stage 3: Deploy Code

```yaml
# Download build artifacts
# Deploy Function App
az functionapp deployment source config-zip \
  --name func-assetsim-backend-prod \
  --src backend.zip

# Deploy Static Web App
# Publishes client artifact to Azure Static Web Apps

# Run database migrations
export DATABASE_URL="<from KeyVault>"
npx prisma migrate deploy
```

**Security Note:** All deployment tasks run on `Self-Hosted-VNet-Pool` to ensure secure access to private endpoints.

### Monitoring Pipeline Runs

#### Via Azure DevOps UI
1. Navigate to Pipelines → asset-sim-pro
2. View recent runs and their status
3. Click a run to see stage details and logs

#### Via Azure CLI
```bash
# List recent pipeline runs
az pipelines runs list \
  --organization https://dev.azure.com/YourOrg \
  --project AssetSimPro \
  --pipeline-ids <pipeline-id>

# Show specific run details
az pipelines runs show \
  --id <run-id> \
  --organization https://dev.azure.com/YourOrg \
  --project AssetSimPro
```

### Troubleshooting Pipeline Issues

#### Build Stage Failures

**Problem:** Client build fails
```bash
# Check Nx cache and dependencies
npx nx reset
npm ci
npx nx run client:build:production
```

**Problem:** Backend build fails
```bash
cd apps/backend
npm ci
npm run build
npm test
```

#### Infrastructure Stage Failures

**Problem:** Terraform init fails
- Verify `Self-Hosted-VNet-Pool` is online
- Check service connection permissions
- Ensure Terraform state storage exists (BOOTSTRAP_GUIDE.md Phase 1)

**Problem:** Terraform apply fails
- Review Terraform plan output in pipeline logs
- Verify service principal has Contributor role
- Check for resource name conflicts or quota limits

#### Deploy Stage Failures

**Problem:** Function App deployment fails
```bash
# Verify Function App exists
az functionapp show \
  --name func-assetsim-backend-prod \
  --resource-group rg-assetsim-prod-useast2

# Check deployment status
az functionapp deployment list-publishing-credentials \
  --name func-assetsim-backend-prod \
  --resource-group rg-assetsim-prod-useast2
```

**Problem:** Static Web App deployment fails
- Verify SWA_DEPLOYMENT_TOKEN is set correctly in variable group
- Check Static Web App exists and is accessible

**Problem:** Database migration fails
```bash
# Test connection from VNet agent
sqlcmd -S tcp:sql-assetsim-prod.database.windows.net,1433 \
  -d sqldb-assetsim-prod \
  -U sqladmin \
  -P <password>

# Manually run migration
export DATABASE_URL="<connection-string>"
npx prisma migrate deploy
```

### Manual Deployment (Bypass Pipeline)

For emergency deployments or testing:

```bash
# 1. Build locally
npm ci
npx nx run client:build:production
cd apps/backend && npm ci && npm run build && cd ../..

# 2. Deploy Function App
cd apps/backend
func azure functionapp publish func-assetsim-backend-prod

# 3. Deploy Static Web App
# Use Azure CLI or portal to deploy dist/apps/client

# 4. Run migrations (from VNet-connected machine)
export DATABASE_URL="<connection-string>"
npx prisma migrate deploy
```

**Warning:** Manual deployments bypass audit trails and may cause inconsistencies. Use only in emergencies.

### Best Practices

1. **Always use the pipeline** for production deployments
2. **Test changes in dev/staging** before merging to main
3. **Review pipeline logs** for warnings even on successful runs
4. **Monitor deployments** via Azure Application Insights
5. **Keep variable groups updated** with Key Vault references
6. **Rotate deployment tokens** quarterly
7. **Maintain agent pool health** (Self-Hosted-VNet-Pool)

### Related Documentation

- Pipeline definition: `azure-pipelines.yml`
- Architecture decisions: [ARCHITECTURE.md](./ARCHITECTURE.md) (ADR-023, lines 1151-1293)
- Bootstrap guide: [BOOTSTRAP_GUIDE.md](./BOOTSTRAP_GUIDE.md)
- Zero Trust setup: [ZERO_TRUST_IMPLEMENTATION.md](./ZERO_TRUST_IMPLEMENTATION.md)

## Rollback Procedure

If deployment fails:

```bash
# Terraform destroy (WARNING: Deletes all resources)
cd terraform
terraform destroy -var-file=terraform.tfvars

# Or restore previous Terraform state
terraform state pull > backup.tfstate
terraform state push backup.tfstate
```

## Support

For issues or questions:
- Review [ARCHITECTURE.md](./ARCHITECTURE.md) for design decisions
- Check [ZERO_TRUST_IMPLEMENTATION.md](./ZERO_TRUST_IMPLEMENTATION.md) for architecture details
- See [backend/README.md](./backend/README.md) for API documentation

---

**Document Version**: 1.0  
**Last Updated**: January 18, 2026  
**Maintained By**: AssetSim Pro Infrastructure Team
