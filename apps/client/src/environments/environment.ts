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
 * - Kendo UI licensing for Angular uses **client-side activation**; the resolved
 *   KENDO_LICENSE value is embedded in the compiled JavaScript bundle and is
 *   therefore visible to any end user who inspects loaded assets.
 * - Treat this value strictly as a **licensing token**, never as a general-purpose
 *   secret (e.g., do not reuse it for API keys, database credentials, or any
 *   server-side authentication).
 * - The risk tradeoff and rationale for client-visible license tokens is
 *   documented in SECURITY_SUMMARY.md under "Kendo UI License Exposure".
 * 
 * The environment variable is injected via a generated file that is created
 * before the build starts and cleaned up after.
 */

// This placeholder will be replaced by the actual Kendo UI license key at build time
// via a dynamically generated file. The resulting value is shipped to the browser
// as part of the client bundle and is visible to users. This matches Kendo's
// client-side licensing model and is **not** used as an authentication or data
// access secret.
export const KENDO_LICENSE = '__KENDO_UI_LICENSE__';

export const environment = {
  production: false
};
