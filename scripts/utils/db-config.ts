/**
 * Shared database configuration constants
 */

/**
 * Database connection string for AssetSimPro database
 * Uses environment variable if available, otherwise falls back to local development defaults
 */
export const DB_CONNECTION_STRING =
  process.env['SQL_CONNECTION_STRING'] ||
  'Server=localhost,1433;Database=AssetSimPro;User Id=sa;Password=LocalDevPassword123!;Encrypt=true;TrustServerCertificate=true';

/**
 * Database connection string for master database (used for creating AssetSimPro database)
 * Uses environment variable if available, otherwise falls back to local development defaults
 */
export const MASTER_CONNECTION_STRING =
  process.env['SQL_MASTER_CONNECTION_STRING'] ||
  'Server=localhost,1433;Database=master;User Id=sa;Password=LocalDevPassword123!;Encrypt=true;TrustServerCertificate=true';
