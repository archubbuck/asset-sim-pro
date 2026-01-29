#!/bin/bash
################################################################################
# Bootstrap Script: Entra ID Consent Automation (ADR-013)
################################################################################
# Purpose: Automate Entra ID API consent for GroupMember.Read.All permission
# ADR Reference: ARCHITECTURE.md ADR-013 Section 13.1 (lines 267-281)
# Prerequisites:
#   - Azure CLI installed (az cli 2.50.0+)
#   - Active Azure login with Global Administrator rights (az login)
#   - Application already registered in Entra ID
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
echo "  AssetSim Pro - Entra ID Consent Automation (ADR-013)"
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
    log_error "Not logged into Azure. Please run 'az login' with Global Administrator rights."
    exit 1
fi

# Get current user details
CURRENT_USER=$(az account show --query user.name -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)
log_success "Logged in as: $CURRENT_USER"
log_info "Tenant ID: $TENANT_ID"

################################################################################
# Step 2: Get Application Client ID
################################################################################
echo ""
log_info "Application Configuration"

# Check if APP_ID is provided as environment variable
if [ -z "${APP_ID:-}" ]; then
    echo ""
    log_warning "Application Client ID not found in environment variable APP_ID"
    echo ""
    echo "Please enter your Application (client) ID from Entra ID App Registration:"
    echo "(You can find this in Azure Portal > Entra ID > App registrations)"
    read -p "Application Client ID: " APP_ID
    
    if [ -z "$APP_ID" ]; then
        log_error "Application Client ID is required."
        exit 1
    fi
fi

log_info "Application Client ID: $APP_ID"

################################################################################
# Step 3: Retrieve Service Principal IDs
################################################################################
echo ""
log_info "Retrieving Service Principal IDs..."

# Get Microsoft Graph Service Principal ID
# The appId 00000003-0000-0000-c000-000000000000 is the well-known ID for Microsoft Graph
log_info "Querying Microsoft Graph Service Principal..."
GRAPH_SP_ID=$(az ad sp list --filter "appId eq '00000003-0000-0000-c000-000000000000'" --query "[0].id" -o tsv)

if [ -z "$GRAPH_SP_ID" ]; then
    log_error "Failed to retrieve Microsoft Graph Service Principal ID."
    exit 1
fi
log_success "Microsoft Graph Service Principal ID: $GRAPH_SP_ID"

# Get Application Service Principal ID
log_info "Querying Application Service Principal..."
APP_SP_ID=$(az ad sp list --filter "appId eq '$APP_ID'" --query "[0].id" -o tsv)

if [ -z "$APP_SP_ID" ]; then
    log_warning "No Application Service Principal found for client ID: $APP_ID"
    log_info "This is common on first-time setup if a service principal has not been created yet."
    echo ""
    read -p "Would you like to create the service principal now? [y/N]: " CREATE_APP_SP

    case "$CREATE_APP_SP" in
        [yY])
            log_info "Creating Application Service Principal with Azure CLI..."
            if az ad sp create --id "$APP_ID" > /dev/null; then
                log_success "Service principal created successfully."
                # Re-query for the newly created Service Principal ID
                APP_SP_ID=$(az ad sp list --filter "appId eq '$APP_ID'" --query "[0].id" -o tsv)
                if [ -z "$APP_SP_ID" ]; then
                    log_error "Service principal was created but its ID could not be retrieved. Please verify in the Azure Portal and re-run this script."
                    exit 1
                fi
            else
                log_error "Failed to create the Application Service Principal automatically."
                log_error "Please run the following command manually and then re-run this script:"
                log_info "  az ad sp create --id $APP_ID"
                exit 1
            fi
            ;;
        *)
            log_error "Application Service Principal is required to continue."
            log_info "You can create it manually with the following command and then re-run this script:"
            log_info "  az ad sp create --id $APP_ID"
            exit 1
            ;;
    esac
fi
log_success "Application Service Principal ID: $APP_SP_ID"

################################################################################
# Step 4: Grant API Permissions
################################################################################
echo ""
log_info "Granting API Permissions..."

# App Role ID for GroupMember.Read.All
# This is a well-known ID for the GroupMember.Read.All permission in Microsoft Graph
ROLE_ID="98830695-27a2-44f7-8c18-0c3ebc9698f6"
log_info "API Permission: GroupMember.Read.All (Role ID: $ROLE_ID)"

# Construct the request body
REQUEST_BODY=$(cat <<EOF
{
  "principalId": "$APP_SP_ID",
  "resourceId": "$GRAPH_SP_ID",
  "appRoleId": "$ROLE_ID"
}
EOF
)

log_info "Creating App Role Assignment via Microsoft Graph API..."

# Execute the Graph API call to grant consent
ERROR_OUTPUT=$(mktemp)
if az rest \
    --method POST \
    --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$APP_SP_ID/appRoleAssignedTo" \
    --headers "Content-Type=application/json" \
    --body "$REQUEST_BODY" 2>"$ERROR_OUTPUT" > /dev/null; then
    
    log_success "API permission 'GroupMember.Read.All' granted successfully!"
    rm -f "$ERROR_OUTPUT"
else
    EXIT_CODE=$?
    
    # Check if permission already exists (common scenario)
    EXISTING_PERMISSIONS=$(az rest \
        --method GET \
        --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$APP_SP_ID/appRoleAssignments" \
        --query "value[?appRoleId=='$ROLE_ID']" -o tsv 2>/dev/null || true)
    
    if [ -n "$EXISTING_PERMISSIONS" ]; then
        log_warning "API permission 'GroupMember.Read.All' is already granted."
        log_info "No action needed."
        rm -f "$ERROR_OUTPUT"
    else
        log_error "Failed to grant API permission. Exit code: $EXIT_CODE"
        if [ -s "$ERROR_OUTPUT" ]; then
            log_error "Error details:"
            cat "$ERROR_OUTPUT" >&2
        fi
        rm -f "$ERROR_OUTPUT"
        log_error "Please verify you have Global Administrator rights."
        exit 1
    fi
fi

# Allow time for Entra ID / Azure AD replication before verification
log_info "Waiting a few seconds for permission propagation..."
sleep 5

################################################################################
# Step 5: Verify Permissions
################################################################################
echo ""
log_info "Verifying granted permissions..."

# Query the granted permissions
GRANTED_PERMISSIONS=$(az rest \
    --method GET \
    --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$APP_SP_ID/appRoleAssignments" \
    --query "value[?appRoleId=='$ROLE_ID'].{ResourceDisplayName:resourceDisplayName, AppRoleId:appRoleId}" \
    -o json 2>/dev/null || echo "[]")

if [ "$GRANTED_PERMISSIONS" != "[]" ] && [ -n "$GRANTED_PERMISSIONS" ]; then
    log_success "Verification successful! Permission is active."
    echo ""
    # Use jq if available for pretty-printing, otherwise display raw JSON
    if command -v jq &> /dev/null; then
        echo "$GRANTED_PERMISSIONS" | jq '.'
    else
        log_info "Note: Install 'jq' for formatted JSON output. Displaying raw JSON:"
        echo "$GRANTED_PERMISSIONS"
    fi
else
    log_warning "Permission granted but verification query returned no results."
    log_info "This may be due to replication delay. Please verify in Azure Portal:"
    log_info "  Azure Portal > Entra ID > App registrations > $APP_ID > API permissions"
fi

################################################################################
# Completion
################################################################################
echo ""
echo "=============================================================================="
log_success "Entra ID Consent Automation Completed Successfully!"
echo "=============================================================================="
echo ""
log_info "Next Steps:"
echo "  1. Verify the permission in Azure Portal:"
echo "     Azure Portal > Entra ID > App registrations > Your App > API permissions"
echo "  2. Ensure 'GroupMember.Read.All' shows status as 'Granted for [Your Tenant]'"
echo "  3. Proceed with Terraform state bootstrap: ./scripts/bootstrap-terraform-state.sh"
echo ""
log_info "For more information, see BOOTSTRAP_GUIDE.md (Phase 2)"
echo ""
