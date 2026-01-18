# Deployment Guide - Zero Trust Architecture

This guide covers deploying the AssetSim Pro Zero Trust Architecture to Azure.

## Prerequisites

### Required Tools
- Azure CLI (2.50.0+)
- Terraform (1.5.0+)
- Azure Functions Core Tools (4.x)
- Node.js (20.x)
- SQL Server Management Studio or sqlcmd (for schema deployment)

### Azure Permissions
- Owner or Contributor role on target subscription
- Permission to create service principals
- Global Administrator for Entra ID app registration (first time only)

### Network Access
- Self-hosted agent in VNet (for deployment to private resources)
- Or jumpbox/bastion host in VNet for manual operations

## Phase 1: Bootstrap Infrastructure (One-Time Setup)

### 1.1 Create Terraform State Storage

```bash
# Set variables
LOCATION="eastus2"
RG_NAME="rg-tfstate"
STORAGE_NAME="sttfstate$(date +%s)"

# Create resource group
az group create \
  --name $RG_NAME \
  --location $LOCATION

# Create storage account
az storage account create \
  --name $STORAGE_NAME \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2 \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false

# Create container
az storage container create \
  --name tfstate \
  --account-name $STORAGE_NAME \
  --auth-mode login

# Save storage account name for later
echo "Terraform State Storage: $STORAGE_NAME"
```

### 1.2 Create Service Principal for Terraform

```bash
# Create service principal
SP_NAME="sp-terraform-assetsim"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

az ad sp create-for-rbac \
  --name $SP_NAME \
  --role Contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID

# Save output:
# - appId (client_id)
# - password (client_secret)
# - tenant (tenant_id)
```

### 1.3 Configure Entra ID Application (Optional)

For production Microsoft Entra ID authentication:

```bash
# Create app registration
APP_NAME="AssetSim Pro"
APP_ID=$(az ad app create \
  --display-name "$APP_NAME" \
  --sign-in-audience AzureADMyOrg \
  --query appId -o tsv)

# Create service principal
az ad sp create --id $APP_ID

# Configure redirect URIs (update after Static Web App deployment)
az ad app update \
  --id $APP_ID \
  --web-redirect-uris \
    "https://<your-swa-hostname>/.auth/login/aad/callback"

echo "Application (client) ID: $APP_ID"
```

## Phase 2: Deploy Infrastructure with Terraform

### 2.1 Initialize Terraform Backend

Create `terraform/backend.tfvars`:

```hcl
resource_group_name  = "rg-tfstate"
storage_account_name = "<YOUR_STORAGE_NAME>"
container_name       = "tfstate"
key                  = "assetsim-prod.terraform.tfstate"
```

### 2.2 Create Terraform Variables

Create `terraform/terraform.tfvars`:

```hcl
environment = "prod"
location    = "East US 2"
vnet_cidr   = "10.0.0.0/16"
sql_admin_password = "<GENERATE_STRONG_PASSWORD>"
```

**Security Note**: Never commit `terraform.tfvars` to source control. Use Azure Key Vault or pipeline variables in production.

### 2.3 Initialize and Deploy

```bash
cd terraform

# Initialize Terraform
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

### 2.4 Verify Network Isolation

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
