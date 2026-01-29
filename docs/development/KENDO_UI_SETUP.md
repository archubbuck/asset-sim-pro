# Kendo UI License Configuration Guide

## Overview

AssetSim Pro uses Kendo UI for Angular as its primary UI component library. This guide explains how to configure your Kendo UI license key for local development and production environments.

The license key is managed through environment variables to ensure it remains secure and is never committed to version control.

## Prerequisites

- Active Kendo UI license from Telerik
- Access to your Telerik account at https://www.telerik.com/account/

## Local Development Setup

### 1. Obtain Your License Key

1. Visit https://www.telerik.com/account/
2. Navigate to your licenses section
3. Copy your Kendo UI for Angular license key

### 2. Configure Environment Variables

1. Copy the environment template:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and add your license key:
   ```bash
   KENDO_UI_LICENSE=your-actual-license-key-here
   ```

3. Verify the file is in `.gitignore` (it should be by default)

### 3. Run the Application

```bash
# Development server
npm start

# Production build
npm run build
```

### 4. Verify Installation

- Check the browser console for license activation messages
- Kendo UI components should render without trial watermarks
- The console should show: "Kendo UI license activated successfully"

## CI/CD Configuration

### GitHub Actions

1. Navigate to your repository settings
2. Go to: **Settings → Secrets and variables → Actions**
3. Click **"New repository secret"**
4. Add the secret:
   - Name: `KENDO_UI_LICENSE`
   - Value: Your Kendo UI license key
5. Click **"Add secret"**

The GitHub Actions workflows will automatically use this secret during builds.

### Azure DevOps

1. Navigate to: **Pipelines → Library**
2. Select or create the `assetsim-prod-vars` variable group
3. Add the variable:
   - Name: `KENDO_UI_LICENSE`
   - Value: Your Kendo UI license key
   - Type: **Secret** (lock icon)
4. Save the variable group
5. Link to Azure Key Vault for additional security (recommended)

## How It Works

### Build-Time Injection

The build process uses `scripts/load-env.js` to:
1. Load environment variables from `.env.local` (local) or CI/CD secrets (production)
2. Temporarily inject the license key into the environment configuration
3. Build the application
4. Restore the original environment file

### Application Initialization

The license is activated in `apps/client/src/main.ts` during application bootstrap:
- Validates the license key is present
- Prevents using placeholder values
- Falls back to trial mode if license is not configured

## Troubleshooting

### Build Warning: "KENDO_UI_LICENSE not set"

**Cause**: The environment variable is not configured.

**Solution**:
- **Local development**: Ensure `.env.local` exists with the correct license key
- **CI/CD**: Verify the secret is configured in your CI/CD platform

### Kendo Components Show Watermarks

**Cause**: License not activated or invalid key.

**Solutions**:
1. Check browser console for "Running in trial mode" message
2. Verify the license key is correct in `.env.local`
3. Ensure the build completed successfully
4. Clear browser cache and rebuild

### Environment File Not Restored

**Symptom**: `environment.ts.backup` file exists after build.

**Cause**: Build script was interrupted.

**Solution**:
- Run `npm run build` again to complete the restore
- Or manually delete the backup file

### License Key Not Loading

**Steps to debug**:
1. Verify `.env.local` exists: `ls -la .env.local`
2. Check file contents: `cat .env.local` (be careful not to expose the key)
3. Ensure no trailing spaces or quotes around the key
4. Restart the development server

## Security Best Practices

✅ **Secure Practices**:
- License keys are stored in environment variables only
- `.env.local` is in `.gitignore` to prevent commits
- CI/CD platforms encrypt secrets at rest and in transit
- Temporary files are automatically cleaned up after builds
- No hardcoded license keys in source code

⚠️ **Important**:
- **Never commit** `.env.local` to version control
- **Rotate license keys** immediately if accidentally exposed
- **Use platform-native secret management** in production (Azure Key Vault, AWS Secrets Manager, etc.)
- **Limit access** to CI/CD secrets to authorized personnel only

## Files Involved

- `.env.local.example` - Template for local environment configuration
- `.env.local` - Your local environment file (gitignored)
- `scripts/load-env.js` - Build-time environment loader
- `apps/client/src/main.ts` - Application bootstrap with license activation
- `apps/client/src/environments/environment.ts` - Environment configuration

## Additional Resources

- [Kendo UI for Angular Documentation](https://www.telerik.com/kendo-angular-ui/)
- [GETTING_STARTED.md](../../GETTING_STARTED.md) - Complete setup guide
- [AssetSim Pro Architecture](../../ARCHITECTURE.md) - System architecture overview

## Support

For issues or questions:
1. Check this documentation thoroughly
2. Review the console logs for specific error messages
3. Verify your license is active at https://www.telerik.com/account/
4. Create an issue on GitHub with details and relevant logs
