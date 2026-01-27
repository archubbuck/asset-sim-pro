# Bootstrap Guide - Manual Operations (ADR-012)

**Status:** Required Pre-Deployment Steps  
**Version:** 2.0.0  
**Date:** January 25, 2026  
**ADR Reference:** ARCHITECTURE.md ADR-012 (lines 249-259)

> 📢 **AUTOMATION AVAILABLE:** This guide documents manual procedures, but automation scripts exist for Phases 1 and 2.  
> **Quick Path:** See [scripts/README.md](../../scripts/README.md) for automated implementations (ADR-013).  
> **Getting Started:** New to the project? Start with [GETTING_STARTED.md](../../GETTING_STARTED.md).

## Overview

This guide documents the "chicken and egg" steps required **before** Terraform automation can run. These are one-time manual operations that establish the foundation for automated infrastructure deployment.

Per ADR-012, the following steps must be completed manually:

1. **Bootstrap Infrastructure**: Create Resource Group `rg-tfstate` and Storage Account for Terraform remote state
   - 🤖 **Can be automated:** Use `./scripts/bootstrap-terraform-state.sh`
2. **Entra ID Consent**: Global Admin must grant `GroupMember.Read.All` API permission
   - 🤖 **Can be automated:** Use `./scripts/bootstrap-entra-consent.sh`
3. **Azure DevOps Self-Hosted Agent Pool**: Create `Self-Hosted-VNet-Pool` for deployments to private resources
   - ⚠️ **Must be manual:** No automation available yet

## Document Purpose

This document serves as:

- **Reference**: Detailed manual procedures for each bootstrap step
- **Fallback**: When automation scripts fail or are not suitable
- **Understanding**: Explanation of what the scripts do under the hood

**For most users:** Use the automation scripts in [scripts/README.md](../../scripts/README.md).  
**For specific scenarios:** Follow the manual steps below when needed.

## Prerequisites

### Required Access & Permissions

- **Azure Subscription**: Owner or Contributor role
- **Microsoft Entra ID**: Global Administrator role (for API consent only)
- **Azure DevOps**: Organization Administrator or Project Collection Administrator
- **Tools**:
  - Azure CLI 2.50.0+
  - Azure DevOps CLI extension (optional, for automation)
  - Git
  - jq (optional, for JSON parsing)

### Why These Steps Are Manual

**Zero Trust Architecture Requirement (ADR-002)**: All production data services (SQL, Redis, Key Vault, Event Hubs) have **public access disabled** and use **private endpoints** within a VNet. This creates a circular dependency:

- Terraform needs to store state remotely (in Azure Storage)
- The Storage Account should ideally be in the VNet with private endpoints
- But Terraform can't create the VNet until it has a state backend
- Therefore, the initial state storage must be created manually

Similarly:

- Deployment agents need VNet access to deploy to private resources
- The VNet doesn't exist until Terraform runs
- Therefore, self-hosted agents must be provisioned after VNet creation but configured before deployment

## Phase 1: Terraform State Storage Bootstrap

> 🤖 **Automation Available:** Use `./scripts/bootstrap-terraform-state.sh` for automated setup.  
> **Manual Steps Below:** For reference or when automation is not suitable.

### Overview

Terraform requires a remote backend to store state files. This ensures:

- State persistence across team members and CI/CD pipelines
- State locking to prevent concurrent modifications
- State versioning and backup

### Step 1.1: Login to Azure

```bash
# Login with Azure CLI
az login

# Set the target subscription
SUBSCRIPTION_ID="<your-subscription-id>"
az account set --subscription $SUBSCRIPTION_ID

# Verify selected subscription
az account show --output table
```

**Verification:**

- Ensure you're logged in with an account that has **Owner** or **Contributor** role on the subscription
- Note the subscription ID for later use

### Step 1.2: Create Resource Group for Terraform State

```bash
# Define variables
LOCATION="eastus2"
RG_NAME="rg-tfstate"

# Create resource group
az group create \
  --name $RG_NAME \
  --location $LOCATION \
  --tags Service="AssetSim" Purpose="TerraformState"

# Verify creation
az group show --name $RG_NAME --output table
```

**Expected Output:**

```
Name         Location    Status
-----------  ----------  ---------
rg-tfstate   eastus2     Succeeded
```

### Step 1.3: Create Storage Account for Terraform State

```bash
# Generate unique storage account name (must be globally unique)
# Using a custom suffix is recommended for better readability and consistency
STORAGE_NAME="sttfstateassetsimdemo"  # Replace with your unique suffix

# Alternative: Generate with timestamp (works on Linux, requires gnu-coreutils on macOS)
# STORAGE_NAME="sttfstate$(date +%s)"

# Create storage account
az storage account create \
  --name $STORAGE_NAME \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2 \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false \
  --https-only true \
  --tags Service="AssetSim" Purpose="TerraformState"

# Verify creation
az storage account show \
  --name $STORAGE_NAME \
  --resource-group $RG_NAME \
  --query "{Name:name, Location:location, Sku:sku.name, PublicAccess:publicNetworkAccess}" \
  --output table
```

**Expected Output:**

```
Name                Location    Sku            PublicAccess
------------------  ----------  -------------  --------------
sttfstate1737356400 eastus2     Standard_LRS   Enabled
```

**Note:** Public access is initially enabled to allow Terraform initialization from local machines or hosted agents. In production, you may want to restrict this after initial setup.

### Step 1.4: Create Blob Container for State Files

```bash
# Create container
az storage container create \
  --name tfstate \
  --account-name $STORAGE_NAME \
  --auth-mode login

# Verify container creation
az storage container show \
  --name tfstate \
  --account-name $STORAGE_NAME \
  --auth-mode login \
  --query "{Name:name, PublicAccess:properties.publicAccess}" \
  --output table
```

**Expected Output:**

```
Name     PublicAccess
-------  --------------
tfstate  None
```

### Step 1.5: Save Configuration for Terraform

Save these values for Terraform backend configuration:

```bash
# Display configuration to save
echo "===== Terraform Backend Configuration ====="
echo "Resource Group:      $RG_NAME"
echo "Storage Account:     $STORAGE_NAME"
echo "Container:           tfstate"
echo "Subscription ID:     $SUBSCRIPTION_ID"
echo "==========================================="

# Save to file for later reference
cat > terraform-backend-config.txt <<EOF
# Terraform Backend Configuration
# Generated: $(date)

resource_group_name  = "$RG_NAME"
storage_account_name = "$STORAGE_NAME"
container_name       = "tfstate"
key                  = "assetsim-prod.terraform.tfstate"

# For CI/CD pipelines, set environment variables:
# ARM_SUBSCRIPTION_ID = "$SUBSCRIPTION_ID"
EOF

cat terraform-backend-config.txt
```

**Action Required:**

- Save the storage account name for Terraform initialization
- Store this information securely (e.g., in Azure Key Vault or your password manager)
- Do NOT commit this file to source control

### Optional: Lock State Storage Account

To prevent accidental deletion:

```bash
# Create delete lock
az lock create \
  --name PreventDeletion \
  --resource-group $RG_NAME \
  --resource $STORAGE_NAME \
  --resource-type Microsoft.Storage/storageAccounts \
  --lock-type CanNotDelete \
  --notes "Prevents deletion of Terraform state storage"

# Verify lock
az lock list \
  --resource-group $RG_NAME \
  --output table
```

## Phase 2: Entra ID API Consent

> 🤖 **Automation Available:** Use `./scripts/bootstrap-entra-consent.sh` for automated setup.  
> **Manual Steps Below:** For reference or when automation is not suitable.

### Overview

AssetSim Pro uses Microsoft Entra ID (formerly Azure Active Directory) for authentication and authorization. The application requires the `GroupMember.Read.All` Microsoft Graph API permission to:

- Read user group memberships
- Implement Exchange-scoped RBAC (Role-Based Access Control)
- Enforce multi-tenant isolation at the application level

**Required Role:** This step **MUST** be performed by a **Global Administrator** in your Microsoft Entra ID tenant.

### Step 2.1: Create Application Registration

**Option A: Using Azure Portal (Recommended for first-time setup)**

1. Navigate to **Azure Portal** → **Microsoft Entra ID** → **App registrations** → **New registration**

2. **Register Application:**
   - Name: `AssetSim Pro`
   - Supported account types: `Accounts in this organizational directory only (Single tenant)`
   - Redirect URI: Leave blank for now (will be configured after Static Web App deployment)
   - Click **Register**

3. **Save Application Details:**
   - Copy **Application (client) ID**
   - Copy **Directory (tenant) ID**
   - Save these values securely

**Option B: Using Azure CLI**

```bash
# Create app registration
APP_NAME="AssetSim Pro"
APP_ID=$(az ad app create \
  --display-name "$APP_NAME" \
  --sign-in-audience AzureADMyOrg \
  --query appId \
  --output tsv)

# Create service principal for the app
az ad sp create --id $APP_ID

# Display application details
echo "===== Application Registration ====="
echo "Application Name:    $APP_NAME"
echo "Application ID:      $APP_ID"
echo "Tenant ID:           $(az account show --query tenantId -o tsv)"
echo "====================================="

# Save for later use
echo "APP_ID=$APP_ID" > entra-app-config.txt
```

### Step 2.2: Grant Admin Consent for API Permissions

**Understanding `GroupMember.Read.All`:**

- **Type:** Application permission (not delegated)
- **Permission ID:** `98830695-27a2-44f7-8c18-0c3ebc9698f6`
- **Purpose:** Allows the app to read group memberships without a signed-in user
- **Risk Level:** Medium (read-only access to group data)

**Option A: Using Azure Portal (Recommended)**

1. Navigate to **Azure Portal** → **Microsoft Entra ID** → **App registrations**
2. Select **AssetSim Pro** application
3. Click **API permissions** → **Add a permission**
4. Select **Microsoft Graph** → **Application permissions**
5. Search for and select `GroupMember.Read.All`
6. Click **Add permissions**
7. Click **Grant admin consent for [Your Organization]** (requires Global Admin)
8. Confirm consent in the dialog

**Verification:**

- The permission should show **Status: Granted for [Your Organization]** with a green checkmark

**Option B: Using Azure CLI and Graph API**

```bash
# Prerequisites
APP_ID="<your-app-id-from-step-2.1>"

# Get the Microsoft Graph service principal ID
GRAPH_SP_ID=$(az ad sp list \
  --filter "appId eq '00000003-0000-0000-c000-000000000000'" \
  --query "[0].id" \
  --output tsv)

# Get the application service principal ID
APP_SP_ID=$(az ad sp list \
  --filter "appId eq '$APP_ID'" \
  --query "[0].id" \
  --output tsv)

# GroupMember.Read.All permission ID
ROLE_ID="98830695-27a2-44f7-8c18-0c3ebc9698f6"

# Grant admin consent using Graph API
az rest \
  --method POST \
  --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$APP_SP_ID/appRoleAssignments" \
  --headers "Content-Type=application/json" \
  --body "{
    \"principalId\": \"$APP_SP_ID\",
    \"resourceId\": \"$GRAPH_SP_ID\",
    \"appRoleId\": \"$ROLE_ID\"
  }"

# Verify permission
az ad app permission list \
  --id $APP_ID \
  --output table
```

**Expected Output:**

```
ResourceAppId                         ResourceAccess
------------------------------------  ----------------
00000003-0000-0000-c000-000000000000  [{"id": "98830695-27a2-44f7-8c18-0c3ebc9698f6", "type": "Role"}]
```

### Step 2.3: Create Client Secret

```bash
# Create client secret (valid for 1 year)
SECRET=$(az ad app credential reset \
  --id $APP_ID \
  --years 1 \
  --query password \
  --output tsv)

# Display secret (SAVE IMMEDIATELY - it won't be shown again)
echo "===== Client Secret (SAVE NOW) ====="
echo "Client Secret: $SECRET"
echo "Expires: 1 year from creation date"
echo "====================================="

# Store in Azure Key Vault (recommended)
# KV_NAME="kv-assetsim-prod"
# az keyvault secret set \
#   --vault-name $KV_NAME \
#   --name "EntraClientSecret" \
#   --value "$SECRET"
```

**Security Warning:**

- **SAVE THE SECRET IMMEDIATELY** - Azure will never show it again
- Store in Azure Key Vault or secure password manager
- Never commit secrets to source control
- Use separate credentials for development, staging, and production

### Step 2.4: Configure Redirect URIs (Post-Deployment)

This step must be completed **after** deploying the Static Web App (see DEPLOYMENT_GUIDE.md):

```bash
# Get Static Web App hostname after deployment
SWA_HOSTNAME="<your-swa-hostname>.azurestaticapps.net"

# Update redirect URIs
az ad app update \
  --id $APP_ID \
  --web-redirect-uris \
    "https://$SWA_HOSTNAME/.auth/login/aad/callback"
```

## Phase 3: Azure DevOps Self-Hosted Agent Pool

> ⚠️ **Manual Setup Required:** No automation available for this phase.

### Overview

Due to the Zero Trust architecture with private endpoints, deployment operations (Terraform apply, Function App deployment, database schema updates) require network access to resources within the VNet. Azure DevOps self-hosted agents provide this capability.

**Timing:**

1. **Before VNet exists**: Configure the agent pool in Azure DevOps (this section)
2. **After VNet deployment**: Provision a VM inside the VNet and register it with the pool (see post-deployment steps)

### Step 3.1: Create Agent Pool in Azure DevOps

**Option A: Using Azure DevOps Portal (Recommended)**

1. **Navigate to Organization Settings:**
   - Go to `https://dev.azure.com/{your-organization}`
   - Click **Organization settings** (bottom-left)

2. **Create Agent Pool:**
   - Click **Pipelines** → **Agent pools**
   - Click **Add pool**
   - Select **Self-hosted**
   - **Name:** `Self-Hosted-VNet-Pool`
   - Check **Grant access permission to all pipelines** (or configure per-project)
   - Click **Create**

3. **Configure Security (Optional):**
   - Click on the new pool → **Security**
   - Add project build service accounts or specific users
   - Grant **Administrator** role to pipeline service accounts

**Option B: Using Azure DevOps CLI**

```bash
# Install Azure DevOps CLI extension (if not already installed)
az extension add --name azure-devops

# Login to Azure DevOps
az devops login

# Set default organization
az devops configure --defaults organization=https://dev.azure.com/{your-organization}

# Create agent pool
az pipelines pool create \
  --name "Self-Hosted-VNet-Pool" \
  --pool-type Self-hosted \
  --description "Self-hosted agents with VNet access for Zero Trust deployments"

# Verify pool creation
az pipelines pool list --output table
```

**Expected Output:**

```
ID    Name                      IsHosted    PoolType
----  ------------------------  ----------  ----------
10    Self-Hosted-VNet-Pool     False       selfHosted
```

### Step 3.2: Generate Agent Registration Token

**Using Azure DevOps Portal:**

1. Navigate to **Agent pools** → **Self-Hosted-VNet-Pool**
2. Click **New agent**
3. Select **Linux** or **Windows** based on your VM choice
4. Copy the **Agent registration token** (Personal Access Token)
5. Save this token securely - you'll need it during agent setup

**Using Personal Access Token (PAT):**

1. Navigate to `https://dev.azure.com/{your-organization}/_usersSettings/tokens`
2. Click **New Token**
3. **Name:** `Agent Pool Management`
4. **Scopes:** Select **Agent Pools (Read & manage)**
5. Click **Create**
6. **Copy and save the token immediately**

```bash
# Save PAT for later use
echo "ADO_PAT=<your-pat-token>" > ado-agent-config.txt
chmod 600 ado-agent-config.txt
```

### Step 3.3: Document Post-Deployment Agent Setup

The actual agent VM provisioning happens **after** Terraform deploys the VNet. Document the following for later:

**Agent VM Requirements:**

- **OS:** Ubuntu 22.04 LTS or Windows Server 2022
- **VM Size:** Standard_B2s (2 vCPU, 4 GB RAM) minimum
- **Network:** Must be in the VNet `snet-agents` subnet (create during Terraform deployment)
- **Outbound Access:**
  - Azure DevOps: `*.dev.azure.com`, `*.visualstudio.com`
  - Package managers: `packages.microsoft.com`, `archive.ubuntu.com`
- **Installed Software:**
  - Azure CLI 2.50.0+
  - Terraform 1.5.0+
  - .NET SDK 8.0+ (for Azure Functions)
  - Node.js 20.x
  - Git

**Agent Installation Steps (to be executed post-VNet deployment):**

```bash
# On the agent VM (after VNet exists)

# 1. Download agent package
# IMPORTANT: Check for the latest version at:
# https://github.com/Microsoft/azure-pipelines-agent/releases
# Replace the version below with the latest stable release
cd /opt
AGENT_VERSION="3.232.0"  # Update to latest version from releases page
wget https://vstsagentpackage.azureedge.net/agent/${AGENT_VERSION}/vsts-agent-linux-x64-${AGENT_VERSION}.tar.gz
mkdir azagent && cd azagent
tar zxvf ../vsts-agent-linux-x64-${AGENT_VERSION}.tar.gz

# 2. Configure agent
./config.sh \
  --unattended \
  --url https://dev.azure.com/{your-organization} \
  --auth pat \
  --token $ADO_PAT \
  --pool "Self-Hosted-VNet-Pool" \
  --agent $(hostname) \
  --acceptTeeEula

# 3. Install as service
sudo ./svc.sh install
sudo ./svc.sh start

# 4. Verify agent is online
# Check in Azure DevOps: Agent pools → Self-Hosted-VNet-Pool → Agents
```

**Security Recommendations:**

- Use **Azure Managed Identity** for agent authentication to Azure (no service principal credentials needed)
- Implement **Azure Bastion** for secure remote access to agent VM
- Configure **NSG rules** to restrict agent VM outbound access to only required services
- Enable **Azure Monitor** for agent VM logging and diagnostics
- Use **Azure Update Management** to keep agent VM patched

### Step 3.4: Update Pipeline Configuration

After agent setup, update your Azure Pipelines YAML to use the pool:

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main

pool:
  name: 'Self-Hosted-VNet-Pool' # Use VNet-connected agent

stages:
  - stage: TerraformDeploy
    jobs:
      - job: DeployInfrastructure
        steps:
          - task: TerraformInstaller@0
            inputs:
              terraformVersion: '1.5.0'

          - task: TerraformTaskV4@4
            inputs:
              command: 'init'
              backendServiceArm: 'Azure-Connection'
              backendAzureRmResourceGroupName: 'rg-tfstate'
              backendAzureRmStorageAccountName: 'sttfstate<uniqueid>'
              backendAzureRmContainerName: 'tfstate'
              backendAzureRmKey: 'prod.terraform.tfstate'

          - task: TerraformTaskV4@4
            inputs:
              command: 'apply'
              environmentServiceNameAzureRM: 'Azure-Connection'
```

## Phase 4: Verification Checklist

Before proceeding to Terraform deployment (see DEPLOYMENT_GUIDE.md), verify all bootstrap steps:

### Infrastructure Bootstrap ✓

- [ ] Azure CLI authenticated to target subscription
- [ ] Resource group `rg-tfstate` created in target region
- [ ] Storage account created with unique name (e.g., `sttfstate1737356400`)
- [ ] Blob container `tfstate` created
- [ ] Storage account details saved for Terraform backend configuration
- [ ] Optional: Delete lock applied to prevent accidental deletion

**Verification Command:**

```bash
az storage account show \
  --name $STORAGE_NAME \
  --resource-group rg-tfstate \
  --query "{Name:name, PublicAccess:publicNetworkAccess}" \
  --output table
```

### Entra ID Consent ✓

- [ ] Application registration created (`AssetSim Pro`)
- [ ] Application (client) ID saved
- [ ] Service principal created for the application
- [ ] `GroupMember.Read.All` permission added
- [ ] Admin consent granted (green checkmark in portal)
- [ ] Client secret created and saved securely
- [ ] Secret stored in Azure Key Vault or password manager

**Verification Command:**

```bash
az ad app permission list --id $APP_ID --output table
```

**Expected:** Should show `GroupMember.Read.All` with type `Role`

### Azure DevOps Agent Pool ✓

- [ ] Agent pool `Self-Hosted-VNet-Pool` created in Azure DevOps
- [ ] Pool configured as self-hosted
- [ ] PAT token created with Agent Pools (Read & manage) scope
- [ ] Token saved securely for agent registration
- [ ] Agent installation steps documented for post-VNet deployment
- [ ] Pipeline YAML updated to use the pool

**Verification:**

- Navigate to Azure DevOps → Organization settings → Agent pools
- Verify `Self-Hosted-VNet-Pool` exists and is listed as self-hosted
- Note: Agents will show as "Offline" until VNet deployment and agent provisioning

## Next Steps

After completing all bootstrap steps:

1. **Proceed to Infrastructure Deployment:**
   - See **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** for Terraform deployment instructions
   - Or follow the streamlined path in **[GETTING_STARTED.md](../../GETTING_STARTED.md)**

2. **Deploy VNet and Agent VM:**
   - After Terraform creates the VNet, provision an agent VM in the `snet-agents` subnet
   - Configure and register the agent with the `Self-Hosted-VNet-Pool`

3. **Configure Application:**
   - Update Entra ID redirect URIs after Static Web App deployment
   - Store secrets in Azure Key Vault
   - Configure Function App application settings

## Related Documentation

### Primary Documents

- **[GETTING_STARTED.md](../../GETTING_STARTED.md)**: Quick setup guide (recommended starting point)
- **[scripts/README.md](../../scripts/README.md)**: Automation scripts for Phases 1-2
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)**: Infrastructure deployment with Terraform

### Reference Documents

- **[ARCHITECTURE.md](../../ARCHITECTURE.md)**: ADR-012 specification (lines 249-259), ADR-013 automation (lines 261-299)
- **[IMPLEMENTATION_ADR_012.md](../implementation/IMPLEMENTATION_ADR_012.md)**: Detailed ADR-012 implementation documentation
- **[IMPLEMENTATION_ADR_013.md](../implementation/IMPLEMENTATION_ADR_013.md)**: Automation script implementation details
- **[ZERO_TRUST_IMPLEMENTATION.md](../architecture/ZERO_TRUST_IMPLEMENTATION.md)**: Zero Trust architecture details

## Troubleshooting

### Issue: Storage account name already exists

**Error:** `The storage account named 'sttfstate123' is already taken.`

**Solution:** Storage account names must be globally unique. Use a different suffix:

```bash
STORAGE_NAME="sttfstateassetsim$(date +%s)"
```

### Issue: Insufficient permissions for admin consent

**Error:** `Insufficient privileges to complete the operation.`

**Solution:**

- Admin consent requires **Global Administrator** role
- Alternative: Request consent from your organization's Global Admin
- Provide them with the Application ID and permission name (`GroupMember.Read.All`)

### Issue: Cannot create agent pool

**Error:** `You do not have permissions to manage this agent pool.`

**Solution:**

- Requires **Project Collection Administrator** or **Organization Administrator** role in Azure DevOps
- Request permission from your Azure DevOps organization admin
- Alternative: Have admin create the pool and grant you access

### Issue: Terraform backend authentication fails

**Error:** `Error: Failed to get existing workspaces: storage: service returned error: StatusCode=403`

**Solution:**

- Verify Azure CLI is authenticated: `az account show`
- Grant your user account **Storage Blob Data Contributor** role on the storage account:
  ```bash
  USER_OBJECT_ID=$(az ad signed-in-user show --query id -o tsv)
  az role assignment create \
    --role "Storage Blob Data Contributor" \
    --assignee $USER_OBJECT_ID \
    --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-tfstate/providers/Microsoft.Storage/storageAccounts/$STORAGE_NAME"
  ```

## Security Best Practices

### Secrets Management

- **Never commit secrets to source control**
- Store all secrets in Azure Key Vault
- Use Managed Identity where possible to avoid credential management
- Rotate client secrets and PAT tokens regularly (recommend 90-day rotation)
- Use separate credentials for dev, staging, and production environments

### Network Security

- After initial setup, consider restricting Storage Account access to specific IP ranges or VNet
- Use Azure Bastion for secure access to agent VMs
- Implement NSG rules to limit agent VM outbound access
- Enable Azure Defender for Storage and VMs

### Access Control

- Follow principle of least privilege for all service accounts
- Use Azure AD Groups for role assignments rather than individual users
- Implement break-glass procedures for emergency access
- Document all role assignments and permissions

### Audit and Monitoring

- Enable diagnostic logging on Storage Account
- Configure Azure Monitor alerts for unauthorized access attempts
- Review Entra ID sign-in logs regularly
- Monitor agent pool capacity and job queue times

## References

- **ARCHITECTURE.md**: ADR-012 specification (lines 249-259)
- **ARCHITECTURE.md**: ADR-013 bootstrap automation scripts (lines 261-299)
- **DEPLOYMENT_GUIDE.md**: Infrastructure deployment with Terraform
- **ZERO_TRUST_IMPLEMENTATION.md**: Zero Trust architecture details
- **IMPLEMENTATION_ADR_011.md**: Terraform engineering specification

### External Resources

- [Terraform Azure Backend Configuration](https://developer.hashicorp.com/terraform/language/settings/backends/azurerm)
- [Microsoft Graph API Permissions](https://docs.microsoft.com/en-us/graph/permissions-reference)
- [Azure DevOps Self-Hosted Agents](https://docs.microsoft.com/en-us/azure/devops/pipelines/agents/agents)
- [Azure Zero Trust Architecture](https://docs.microsoft.com/en-us/azure/security/fundamentals/zero-trust)

## Contributors

- **Architecture:** Senior Architect (ADR-012, ADR-013)
- **Documentation:** GitHub Copilot Agent
- **Repository:** archubbuck/asset-sim-pro

---

**Document Status:** ✅ Complete  
**Last Updated:** January 25, 2026  
**Version:** 2.0.0  
**Maintained By:** AssetSim Pro DevOps Team

**Related Documents:**

- [GETTING_STARTED.md](../../GETTING_STARTED.md) - Quick setup guide
- [scripts/README.md](../../scripts/README.md) - Automation scripts
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Next steps after bootstrap
