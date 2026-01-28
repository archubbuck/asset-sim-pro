/**
 * Environment Configuration for AssetSim Pro
 * 
 * This file exports configuration constants that are set at build time.
 * 
 * The KENDO_LICENSE constant is populated from the KENDO_UI_LICENSE environment variable
 * during the build process by the load-env.js script.
 * 
 * Security Note:
 * - Local development: Set in .env.local file (gitignored)
 * - CI/CD: Set as GitHub secret or Azure Key Vault variable
 * - Never commit actual license keys to source control
 * 
 * The environment variable is injected via a generated file that is created
 * before the build starts and cleaned up after.
 */

// This will be replaced by the actual license key at build time
// via a dynamically generated file
export const KENDO_LICENSE = '__KENDO_UI_LICENSE__';

export const environment = {
  production: false
};
