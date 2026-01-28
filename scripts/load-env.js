#!/usr/bin/env node
/**
 * Load Environment Variables and Execute Command
 * 
 * This script:
 * 1. Loads environment variables from .env.local file (if it exists)
 * 2. Injects the KENDO_UI_LICENSE into the environment file
 * 3. Executes the provided command with those variables
 * 4. Restores the original environment file after the command completes
 * 
 * Usage: 
 *   node scripts/load-env.js <command> [args...]
 * 
 * Example:
 *   node scripts/load-env.js nx build client --configuration=production
 */

const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Load .env.local if it exists (for local development)
const envLocalPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envLocalPath)) {
  const result = dotenv.config({ path: envLocalPath });
  
  if (result.error) {
    console.error('Error loading .env.local:', result.error);
    process.exit(1);
  }

  if (result.parsed && result.parsed.KENDO_UI_LICENSE) {
    console.log('✓ Loaded KENDO_UI_LICENSE from .env.local');
  }
}

// Get the Kendo license key from environment
const kendoLicense = process.env.KENDO_UI_LICENSE || '';

// Check if KENDO_UI_LICENSE is set
if (!kendoLicense) {
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true' || process.env.TF_BUILD === 'True';
  
  if (isCI) {
    console.error('❌ ERROR: KENDO_UI_LICENSE not set in CI/CD environment');
    console.error('  Production builds require a valid Kendo license');
    console.error('  Please configure KENDO_UI_LICENSE as a secret in your CI/CD platform');
    // In CI, we continue but log an error - the build will still work in trial mode
    // The user can decide if this is acceptable for their use case
  } else {
    console.warn('⚠ Warning: KENDO_UI_LICENSE not set');
    console.warn('  Kendo UI will run in trial mode with watermarks');
    console.warn('  For local development:');
    console.warn('    1. Copy .env.local.example to .env.local');
    console.warn('    2. Set KENDO_UI_LICENSE=your-license-key in .env.local');
  }
  console.warn('');
}

// Path to the environment file
const envFilePath = path.join(__dirname, '..', 'apps', 'client', 'src', 'environments', 'environment.ts');
const envFileBackupPath = envFilePath + '.backup';

// Backup and update the environment file
let originalContent = '';
try {
  if (fs.existsSync(envFilePath)) {
    originalContent = fs.readFileSync(envFilePath, 'utf8');
    
    // Check if placeholder exists
    if (!originalContent.includes('__KENDO_UI_LICENSE__')) {
      console.warn('⚠ Warning: Placeholder __KENDO_UI_LICENSE__ not found in environment.ts');
      console.warn('  The license key may not be injected correctly');
    } else {
      // Create backup
      fs.writeFileSync(envFileBackupPath, originalContent, 'utf8');
      
      // Replace placeholder with actual license key
      // If kendoLicense is empty, replace with empty string
      const updatedContent = originalContent.replace('__KENDO_UI_LICENSE__', kendoLicense);
      fs.writeFileSync(envFilePath, updatedContent, 'utf8');
    }
  }
} catch (error) {
  console.error('Error updating environment file:', error);
  // Don't exit - allow build to continue with placeholder
}

// Function to restore the original environment file
function cleanup() {
  try {
    if (fs.existsSync(envFileBackupPath) && fs.existsSync(envFilePath)) {
      fs.renameSync(envFileBackupPath, envFilePath);
    } else if (fs.existsSync(envFileBackupPath)) {
      // If original file was deleted, restore from backup
      fs.renameSync(envFileBackupPath, envFilePath);
    }
  } catch (error) {
    console.error('Warning: Failed to restore environment file:', error.message);
    // Don't throw - we're in cleanup
  }
}

// Register cleanup handlers
process.on('exit', cleanup);
process.on('SIGINT', () => {
  cleanup();
  process.exit(130);
});
process.on('SIGTERM', () => {
  cleanup();
  process.exit(143);
});

// Get command and arguments from command line
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Error: No command provided');
  console.error('Usage: node scripts/load-env.js <command> [args...]');
  cleanup();
  process.exit(1);
}

const command = args[0];
const commandArgs = args.slice(1);

// Execute the command with inherited environment
const child = spawn(command, commandArgs, {
  stdio: 'inherit',
  env: process.env,
  shell: true
});

child.on('exit', (code) => {
  cleanup();
  process.exit(code || 0);
});

child.on('error', (error) => {
  console.error('Failed to execute command:', error);
  cleanup();
  process.exit(1);
});


