#!/usr/bin/env node
/**
 * Load Environment Variables and Execute Command
 * 
 * This script loads environment variables from .env.local file (if it exists)
 * and executes the provided command with those variables.
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

// Check if KENDO_UI_LICENSE is set
if (!process.env.KENDO_UI_LICENSE) {
  console.warn('⚠ Warning: KENDO_UI_LICENSE not set');
  console.warn('  Kendo UI will run in trial mode with watermarks');
  console.warn('  For local development:');
  console.warn('    1. Copy .env.local.example to .env.local');
  console.warn('    2. Set KENDO_UI_LICENSE=your-license-key in .env.local');
  console.warn('');
}

// Get command and arguments from command line
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Error: No command provided');
  console.error('Usage: node scripts/load-env.js <command> [args...]');
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
  process.exit(code || 0);
});

