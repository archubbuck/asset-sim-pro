/**
 * Environment Configuration for AssetSim Pro
 * 
 * This file provides compile-time constants for the application.
 * Values are replaced during the build process using the 'define' option.
 * 
 * Security Note:
 * - KENDO_LICENSE is sourced from KENDO_UI_LICENSE environment variable
 * - Local development: Set in .env.local file (gitignored)
 * - CI/CD: Set as GitHub secret or Azure Key Vault variable
 * - Never commit actual license keys to source control
 * 
 * The define mechanism in project.json will replace NG_KENDO_LICENSE 
 * at build time with the value from the environment variable.
 */

// This constant will be replaced at build time via the define mechanism
declare const NG_KENDO_LICENSE: string;

/**
 * Kendo UI License Key
 * Injected at build time from KENDO_UI_LICENSE environment variable
 */
export const KENDO_LICENSE = typeof NG_KENDO_LICENSE !== 'undefined' ? NG_KENDO_LICENSE : '';

export const environment = {
  production: false
};
