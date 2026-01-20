#!/bin/bash
################################################################################
# Bootstrap Script: Terraform State Storage Automation (ADR-013)
################################################################################
# Purpose: Automate Azure Resource Group and Storage Account creation for
#          Terraform remote state backend
# ADR Reference: ARCHITECTURE.md ADR-013 Section 13.2 (lines 283-298)
# Prerequisites:
#   - Azure CLI installed (az cli 2.50.0+)
#   - Active Azure login with Subscription Owner or Contributor rights
#   - Valid Azure subscription
################################################################################

set -euo pipefail  # Exit on error, undefined variables, and pipe failures

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Display banner
echo "=============================================================================="
echo "  AssetSim Pro - Terraform State Bootstrap Automation (ADR-013)"
echo "=============================================================================="
echo ""

################################################################################
# Step 1: Verify Prerequisites
################################################################################
log_info "Verifying prerequisites..."

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    log_error "Azure CLI is not installed. Please install Azure CLI 2.50.0 or higher."
    exit 1
fi

# Check Azure CLI version
AZ_VERSION=$(az version --query '."azure-cli"' -o tsv)
log_info "Azure CLI version: $AZ_VERSION"

# Check if user is logged in
log_info "Checking Azure login status..."
if ! az account show &> /dev/null; then
    log_error "Not logged into Azure. Please run 'az login' with Contributor rights."
    exit 1
fi

# Get current subscription details
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
SUBSCRIPTION_NAME=$(az account show --query name -o tsv)
CURRENT_USER=$(az account show --query user.name -o tsv)

log_success "Logged in as: $CURRENT_USER"
log_info "Subscription: $SUBSCRIPTION_NAME"
log_info "Subscription ID: $SUBSCRIPTION_ID"

################################################################################
# Step 2: Configure Bootstrap Parameters
################################################################################
echo ""
log_info "Bootstrap Configuration"

# Resource Group Name (default from ADR-013)
RG="${RG:-rg-tfstate}"
log_info "Resource Group: $RG"

# Azure Location (default from ADR-013)
LOC="${LOC:-eastus2}"
log_info "Location: $LOC"

# Storage Account Name - must be globally unique, lowercase, alphanumeric
# Default: sttfstate + timestamp for uniqueness
if [ -z "${STORAGE:-}" ]; then
    TIMESTAMP=$(date +%s)
    STORAGE="sttfstate${TIMESTAMP}"
fi
log_info "Storage Account: $STORAGE"

# Blob Container Name for Terraform state files
CONTAINER="${CONTAINER:-tfstate}"
log_info "Blob Container: $CONTAINER"

# Validate storage account name (3-24 chars, lowercase, alphanumeric)
if ! [[ "$STORAGE" =~ ^[a-z0-9]{3,24}$ ]]; then
    log_error "Storage account name must be 3-24 characters, lowercase letters and numbers only."
    log_error "Current value: $STORAGE"
    exit 1
fi

################################################################################
# Step 3: Create Resource Group using ARM API
################################################################################
echo ""
log_info "Step 1/4: Creating Resource Group '$RG'..."

# Check if resource group already exists
if az group show --name "$RG" &> /dev/null; then
    log_warning "Resource Group '$RG' already exists. Skipping creation."
else
    # Create Resource Group using ARM REST API
    log_info "Calling Azure Resource Manager API..."
    
    REQUEST_BODY=$(cat <<EOF
{
  "location": "$LOC"
}
EOF
)
    
    if az rest \
        --method PUT \
        --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourcegroups/${RG}?api-version=2021-04-01" \
        --body "$REQUEST_BODY" &> /dev/null; then
        
        log_success "Resource Group '$RG' created successfully in $LOC"
    else
        log_error "Failed to create Resource Group '$RG'"
        exit 1
    fi
fi

################################################################################
# Step 4: Create Storage Account using ARM API
################################################################################
echo ""
log_info "Step 2/4: Creating Storage Account '$STORAGE'..."

# Check if storage account already exists
if az storage account show --name "$STORAGE" --resource-group "$RG" &> /dev/null; then
    log_warning "Storage Account '$STORAGE' already exists. Skipping creation."
else
    # Create Storage Account using ARM REST API
    log_info "Calling Azure Resource Manager API..."
    log_info "This may take 1-2 minutes..."
    
    REQUEST_BODY=$(cat <<EOF
{
  "sku": {
    "name": "Standard_LRS"
  },
  "kind": "StorageV2",
  "location": "$LOC",
  "properties": {
    "supportsHttpsTrafficOnly": true,
    "minimumTlsVersion": "TLS1_2",
    "allowBlobPublicAccess": false,
    "encryption": {
      "services": {
        "blob": {
          "enabled": true
        }
      },
      "keySource": "Microsoft.Storage"
    }
  }
}
EOF
)
    
    if az rest \
        --method PUT \
        --uri "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG}/providers/Microsoft.Storage/storageAccounts/${STORAGE}?api-version=2021-04-01" \
        --body "$REQUEST_BODY" > /dev/null; then
        
        log_success "Storage Account '$STORAGE' created successfully"
        
        # Wait for storage account to be fully provisioned
        log_info "Waiting for storage account provisioning to complete..."
        sleep 10
    else
        log_error "Failed to create Storage Account '$STORAGE'"
        exit 1
    fi
fi

################################################################################
# Step 5: Create Blob Container
################################################################################
echo ""
log_info "Step 3/4: Creating Blob Container '$CONTAINER'..."

# Get storage account key
log_info "Retrieving storage account access key..."
STORAGE_KEY=$(az storage account keys list \
    --resource-group "$RG" \
    --account-name "$STORAGE" \
    --query "[0].value" -o tsv)

if [ -z "$STORAGE_KEY" ]; then
    log_error "Failed to retrieve storage account key"
    exit 1
fi

# Create blob container for Terraform state
if az storage container exists \
    --account-name "$STORAGE" \
    --account-key "$STORAGE_KEY" \
    --name "$CONTAINER" \
    --query exists -o tsv | grep -q "true"; then
    
    log_warning "Blob Container '$CONTAINER' already exists. Skipping creation."
else
    log_info "Creating blob container..."
    
    if az storage container create \
        --account-name "$STORAGE" \
        --account-key "$STORAGE_KEY" \
        --name "$CONTAINER" \
        --public-access off &> /dev/null; then
        
        log_success "Blob Container '$CONTAINER' created successfully"
    else
        log_error "Failed to create Blob Container '$CONTAINER'"
        exit 1
    fi
fi

################################################################################
# Step 6: Generate Terraform Backend Configuration
################################################################################
echo ""
log_info "Step 4/4: Generating Terraform backend configuration..."

# Create output directory for configuration files
OUTPUT_DIR="./terraform-backend-config"
mkdir -p "$OUTPUT_DIR"

# Generate backend.tf configuration
BACKEND_CONFIG_FILE="${OUTPUT_DIR}/backend.tf"

cat > "$BACKEND_CONFIG_FILE" <<EOF
# Terraform Backend Configuration
# Auto-generated by bootstrap-terraform-state.sh on $(date -u +"%Y-%m-%d %H:%M:%S UTC")
# ADR Reference: ADR-013 (ARCHITECTURE.md)

terraform {
  backend "azurerm" {
    resource_group_name  = "$RG"
    storage_account_name = "$STORAGE"
    container_name       = "$CONTAINER"
    key                  = "terraform.tfstate"
  }
}
EOF

log_success "Backend configuration written to: $BACKEND_CONFIG_FILE"

# Generate environment variables file
ENV_FILE="${OUTPUT_DIR}/backend.env"

cat > "$ENV_FILE" <<EOF
# Terraform Backend Environment Variables
# Auto-generated by bootstrap-terraform-state.sh on $(date -u +"%Y-%m-%d %H:%M:%S UTC")
# Source this file before running Terraform: source ./terraform-backend-config/backend.env

export TF_BACKEND_RESOURCE_GROUP="$RG"
export TF_BACKEND_STORAGE_ACCOUNT="$STORAGE"
export TF_BACKEND_CONTAINER="$CONTAINER"
export TF_BACKEND_KEY="terraform.tfstate"

# Storage Account Access Key (for Terraform init)
export ARM_ACCESS_KEY="$STORAGE_KEY"
EOF

log_success "Environment variables written to: $ENV_FILE"

# Generate README for configuration files
README_FILE="${OUTPUT_DIR}/README.md"

cat > "$README_FILE" <<EOF
# Terraform Backend Configuration

This directory contains auto-generated configuration files for Terraform remote state backend.

**Generated:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")  
**ADR Reference:** ADR-013 (ARCHITECTURE.md)

## Files

- **backend.tf** - Terraform backend configuration block
- **backend.env** - Environment variables for Terraform backend
- **README.md** - This file

## Usage

### Option 1: Copy backend.tf to Terraform directory

\`\`\`bash
cp terraform-backend-config/backend.tf ./terraform/
cd terraform
terraform init
\`\`\`

### Option 2: Use environment variables

\`\`\`bash
source ./terraform-backend-config/backend.env
cd terraform
terraform init \\
  -backend-config="resource_group_name=\$TF_BACKEND_RESOURCE_GROUP" \\
  -backend-config="storage_account_name=\$TF_BACKEND_STORAGE_ACCOUNT" \\
  -backend-config="container_name=\$TF_BACKEND_CONTAINER" \\
  -backend-config="key=\$TF_BACKEND_KEY"
\`\`\`

## Configuration Details

- **Resource Group:** $RG
- **Storage Account:** $STORAGE
- **Container:** $CONTAINER
- **Location:** $LOC
- **Subscription:** $SUBSCRIPTION_NAME ($SUBSCRIPTION_ID)

## Security Notes

- The \`backend.env\` file contains sensitive storage account keys
- **DO NOT** commit this file to version control
- Add \`terraform-backend-config/\` to your \`.gitignore\`
- Consider using Azure Key Vault for production deployments

## Next Steps

1. Copy or reference the backend configuration in your Terraform code
2. Run \`terraform init\` to initialize the backend
3. Verify state is stored remotely: \`terraform state list\`

For more information, see BOOTSTRAP_GUIDE.md
EOF

log_success "Documentation written to: $README_FILE"

################################################################################
# Step 7: Apply Resource Lock (Optional)
################################################################################
echo ""
read -p "Do you want to apply a resource lock to prevent accidental deletion? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Applying 'CanNotDelete' lock to Resource Group '$RG'..."
    
    LOCK_NAME="terraform-state-lock"
    
    if az lock create \
        --name "$LOCK_NAME" \
        --lock-type CanNotDelete \
        --resource-group "$RG" \
        --notes "Prevent accidental deletion of Terraform state storage" &> /dev/null; then
        
        log_success "Resource lock '$LOCK_NAME' applied successfully"
        log_warning "To remove this lock later, run:"
        log_warning "  az lock delete --name $LOCK_NAME --resource-group $RG"
    else
        log_warning "Failed to apply resource lock. You may need Owner permissions."
    fi
else
    log_info "Skipping resource lock. You can apply it later if needed:"
    log_info "  az lock create --name terraform-state-lock --lock-type CanNotDelete --resource-group $RG"
fi

################################################################################
# Completion Summary
################################################################################
echo ""
echo "=============================================================================="
log_success "Terraform State Bootstrap Completed Successfully!"
echo "=============================================================================="
echo ""
log_info "Resources Created:"
echo "  ✓ Resource Group: $RG"
echo "  ✓ Storage Account: $STORAGE"
echo "  ✓ Blob Container: $CONTAINER"
echo "  ✓ Configuration Files: $OUTPUT_DIR"
echo ""
log_info "Subscription Details:"
echo "  • Subscription: $SUBSCRIPTION_NAME"
echo "  • Subscription ID: $SUBSCRIPTION_ID"
echo "  • Location: $LOC"
echo ""
log_warning "IMPORTANT: Add the following to your .gitignore:"
echo "  terraform-backend-config/"
echo ""
log_info "Next Steps:"
echo "  1. Review generated configuration: cat $BACKEND_CONFIG_FILE"
echo "  2. Copy backend configuration to Terraform directory:"
echo "     cp $BACKEND_CONFIG_FILE ./terraform/"
echo "  3. Initialize Terraform with remote backend:"
echo "     cd terraform && terraform init"
echo "  4. Verify remote state is working:"
echo "     terraform state list"
echo ""
log_info "For more information, see BOOTSTRAP_GUIDE.md (Phase 1)"
echo ""
