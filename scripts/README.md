# Bootstrap Automation Scripts (ADR-013)

This directory contains automation scripts that implement ADR-013 for bootstrapping AssetSim Pro infrastructure.

**ADR Reference:** ARCHITECTURE.md ADR-013 (lines 261-298)  
**Implementation Date:** January 2026  
**Status:** Production Ready

## Quick Links

- **New to the project?** Start with [GETTING_STARTED.md](../GETTING_STARTED.md)
- **Need manual steps?** See [BOOTSTRAP_GUIDE.md](../docs/deployment/BOOTSTRAP_GUIDE.md)
- **Ready to deploy?** Proceed to [DEPLOYMENT_GUIDE.md](../docs/deployment/DEPLOYMENT_GUIDE.md)

## Overview

These scripts automate the manual "chicken and egg" operations documented in ADR-012 and BOOTSTRAP_GUIDE.md. They use Azure CLI and Azure REST APIs (Graph API and ARM API) to provision foundational infrastructure required before Terraform automation can run.

**Why use these scripts?**
- ⚡ **Faster:** Automate 30+ manual steps into 2 commands
- ✅ **Consistent:** Eliminate human error from manual configuration
- 🔁 **Repeatable:** Idempotent operations safe to run multiple times
- 📝 **Documented:** Color-coded output with clear progress indicators

## Scripts

### 1. `bootstrap-entra-consent.sh`

**Purpose:** Automate Entra ID API consent for GroupMember.Read.All permission  
**ADR Section:** ARCHITECTURE.md ADR-013 §13.1 (lines 267-281)  
**Manual Alternative:** [BOOTSTRAP_GUIDE.md Phase 2](../docs/deployment/BOOTSTRAP_GUIDE.md#phase-2-entra-id-api-consent)

**Prerequisites:**
- Azure CLI 2.50.0 or higher installed
- Active Azure login with **Global Administrator** rights
- Application already registered in Entra ID

**What It Does:**
1. Verifies Azure CLI installation and login status
2. Retrieves Microsoft Graph Service Principal ID
3. Retrieves Application Service Principal ID
4. Grants GroupMember.Read.All API permission using Graph API
5. Verifies the permission was granted successfully

**Usage:**

```bash
# Option 1: Provide APP_ID as environment variable
export APP_ID="your-application-client-id"
./scripts/bootstrap-entra-consent.sh

# Option 2: Script will prompt for APP_ID interactively
./scripts/bootstrap-entra-consent.sh
```

**API Permissions Granted:**
- `GroupMember.Read.All` (Role ID: 98830695-27a2-44f7-8c18-0c3ebc9698f6)

**For detailed manual steps:** See [BOOTSTRAP_GUIDE.md Phase 2](../docs/deployment/BOOTSTRAP_GUIDE.md#phase-2-entra-id-api-consent)

### 2. `bootstrap-terraform-state.sh`

**Purpose:** Automate Azure Resource Group and Storage Account creation for Terraform remote state  
**ADR Section:** ARCHITECTURE.md ADR-013 §13.2 (lines 283-298)  
**Manual Alternative:** [BOOTSTRAP_GUIDE.md Phase 1](../docs/deployment/BOOTSTRAP_GUIDE.md#phase-1-terraform-state-storage-bootstrap)

**Prerequisites:**
- Azure CLI 2.50.0 or higher installed
- Active Azure login with **Contributor** or **Owner** rights
- Valid Azure subscription selected

**What It Does:**
1. Verifies Azure CLI installation and login status
2. Creates Resource Group for Terraform state using ARM API
3. Creates Storage Account with secure defaults using ARM API
4. Creates Blob Container for state files
5. Generates Terraform backend configuration files
6. Optionally applies resource lock to prevent accidental deletion

**Usage:**

```bash
# Option 1: Use default configuration
./scripts/bootstrap-terraform-state.sh

# Option 2: Customize via environment variables
export RG="rg-tfstate-custom"
export LOC="westus2"
export STORAGE="sttfstatecustom"
export CONTAINER="tfstate"
./scripts/bootstrap-terraform-state.sh

# Option 3: Non-interactive execution (CI/CD)
export RG="rg-tfstate-prod"
export APPLY_RESOURCE_LOCK="yes"
./scripts/bootstrap-terraform-state.sh
```

**Default Configuration:**
- Resource Group: `rg-tfstate`
- Storage Account: `sttfstate{timestamp8}{random4}` (e.g., `sttfstate12345678abcd`)
- Blob Container: `tfstate`
- Location: `eastus2`
- SKU: Standard_LRS (Locally Redundant Storage)

**Generated Files:**
- `terraform-backend-config/backend.tf` - Terraform backend configuration
- `terraform-backend-config/backend.env` - Environment variables with storage key
- `terraform-backend-config/README.md` - Usage instructions

**For detailed manual steps:** See [BOOTSTRAP_GUIDE.md Phase 1](../BOOTSTRAP_GUIDE.md#phase-1-terraform-state-storage-bootstrap)

## Security Features

Both scripts implement the following security best practices:

### Error Handling
- `set -euo pipefail` - Exit on error, undefined variables, and pipe failures
- Comprehensive error checking for all Azure CLI and API calls
- Graceful handling of already-existing resources

### Validation
- Prerequisite verification (Azure CLI, login status, permissions)
- Input validation for resource names
- Verification of successful resource creation

### Secure Defaults
- Storage Account: HTTPS-only traffic, TLS 1.2 minimum
- Blob Container: Private access (no public access)
- Encryption enabled for blob storage

### Sensitive Data
- Storage account keys are not displayed in console output
- Generated configuration files contain credentials (must not be committed)
- Clear warnings about protecting sensitive files

## Execution Order

For a complete bootstrap, run scripts in this order:

```bash
# 1. Bootstrap Terraform State Storage (No special permissions required beyond Contributor)
./scripts/bootstrap-terraform-state.sh

# 2. Grant Entra ID Consent (Requires Global Administrator)
export APP_ID="your-application-client-id"
./scripts/bootstrap-entra-consent.sh

# 3. Proceed with Terraform deployment
cp terraform-backend-config/backend.tf ./terraform/
cd terraform
terraform init
terraform plan
terraform apply
```

## Error Handling & Troubleshooting

### Common Issues

**Issue:** "Azure CLI is not installed"
```bash
# Install Azure CLI (Ubuntu/Debian)
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Install Azure CLI (macOS)
brew update && brew install azure-cli
```

**Issue:** "Not logged into Azure"
```bash
# Login to Azure
az login

# Select correct subscription
az account list --output table
az account set --subscription "Your Subscription Name"
```

**Issue:** "Failed to retrieve Application Service Principal ID"
```bash
# Create service principal for your app
az ad sp create --id YOUR_APP_CLIENT_ID
```

**Issue:** "Permission already granted"
- This is expected behavior if re-running the script
- The script detects existing permissions and skips gracefully

### Script Logs

Both scripts provide color-coded output:
- 🔵 **INFO** (Blue): Informational messages
- 🟢 **SUCCESS** (Green): Successful operations
- 🟡 **WARNING** (Yellow): Non-critical issues
- 🔴 **ERROR** (Red): Critical failures

## Integration with Existing Documentation

These scripts implement automation for manual steps documented in:

### Related Documentation
- **[GETTING_STARTED.md](../GETTING_STARTED.md)**: Quick setup path using these scripts
- **[BOOTSTRAP_GUIDE.md](../BOOTSTRAP_GUIDE.md)**: Detailed manual procedures and fallback instructions
  - Phase 1: Terraform State Storage → `bootstrap-terraform-state.sh`
  - Phase 2: Entra ID API Consent → `bootstrap-entra-consent.sh`
- **[ARCHITECTURE.md](../ARCHITECTURE.md)**: ADR specifications
  - ADR-012: Manual operations specification
  - ADR-013: Automation implementation (these scripts)
- **[IMPLEMENTATION_ADR_012.md](../IMPLEMENTATION_ADR_012.md)**: ADR-012 implementation details
- **[IMPLEMENTATION_ADR_013.md](../IMPLEMENTATION_ADR_013.md)**: Complete automation implementation documentation
- **[DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)**: Next steps after bootstrap completion

## Testing & Validation

### Syntax Validation

```bash
# Check bash syntax
bash -n scripts/bootstrap-entra-consent.sh
bash -n scripts/bootstrap-terraform-state.sh

# Run shellcheck (if available)
shellcheck scripts/bootstrap-entra-consent.sh
shellcheck scripts/bootstrap-terraform-state.sh
```

### Dry Run Testing

Both scripts perform validation before making changes:
1. Verify prerequisites (Azure CLI, login, permissions)
2. Check for existing resources
3. Validate input parameters

### Idempotency

Both scripts are designed to be **idempotent**:
- Safe to run multiple times
- Detect existing resources and skip creation
- Only create missing components

## Security Considerations

### Secrets Management

⚠️ **CRITICAL:** The following files contain sensitive credentials:

```bash
# Add to .gitignore
terraform-backend-config/
*.env
```

### Required Permissions

| Script | Minimum Azure Role | Additional Requirements |
|--------|-------------------|------------------------|
| `bootstrap-terraform-state.sh` | Contributor | Storage Account permissions |
| `bootstrap-entra-consent.sh` | Global Administrator | Entra ID admin consent |

### API Endpoints Used

Both scripts use official Azure APIs:
- **Microsoft Graph API:** `https://graph.microsoft.com/v1.0/`
- **Azure Resource Manager API:** `https://management.azure.com/`

All API calls are authenticated via Azure CLI token (`az rest`).

## Future Enhancements

Potential improvements for future versions:
- [ ] Azure DevOps Agent Pool automation (ADR-012 Phase 3)
- [ ] Terraform variable file generation
- [ ] Multi-region deployment support
- [ ] Azure Key Vault integration for secrets
- [ ] CI/CD pipeline integration
- [ ] Rollback/cleanup automation

## Support & Documentation

### Primary Documentation
- **[Documentation Hub](../docs/README.md)** - Complete documentation index
- **[GETTING_STARTED.md](../GETTING_STARTED.md)**: Quick setup guide
- **[BOOTSTRAP_GUIDE.md](../docs/deployment/BOOTSTRAP_GUIDE.md)**: Manual bootstrap procedures
- **[DEPLOYMENT_GUIDE.md](../docs/deployment/DEPLOYMENT_GUIDE.md)**: Infrastructure deployment

### Reference Documentation
- **[ARCHITECTURE.md](../ARCHITECTURE.md)**: ADR-012 and ADR-013 specifications
- **[IMPLEMENTATION_ADR_012.md](../IMPLEMENTATION_ADR_012.md)**: ADR-012 implementation details
- **[IMPLEMENTATION_ADR_013.md](../IMPLEMENTATION_ADR_013.md)**: This automation implementation

### Issue Tracking
- GitHub Issues for bugs or enhancement requests

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | January 2026 | Initial implementation of ADR-013 |
| 1.1.0 | January 2026 | Enhanced documentation and cross-references |

---

**Note:** These scripts are part of the AssetSim Pro Zero Trust architecture implementation. Always review and test scripts in a non-production environment before running in production.

**Last Updated:** January 28, 2026  
**Maintained By:** AssetSim Pro DevOps Team
