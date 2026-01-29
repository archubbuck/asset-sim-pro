/**
 * esbuild Configuration for AssetSim Pro Backend
 * 
 * This build script addresses the two known TypeScript limitations:
 * 
 * 1. Output Structure: Bundles code into dist/ matching Azure Functions v4 structure
 * 2. Runtime Module Resolution: Resolves @assetsim/* path mappings during build
 * 
 * The bundler approach is production-ready and eliminates the need for:
 * - Nx workspace linking
 * - tsconfig-paths runtime resolution
 * - Building shared libraries separately
 * 
 * Path mappings are automatically loaded from tsconfig.json "compilerOptions.paths".
 * When adding new @assetsim/* shared libraries, update tsconfig.json paths configuration.
 */

import * as esbuild from 'esbuild';
import { readdirSync, copyFileSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if production build
const isProduction = process.env.NODE_ENV === 'production';

// Load path mappings from tsconfig.json to stay in sync
let tsconfigPaths = {};
try {
  const tsconfigPath = join(__dirname, 'tsconfig.json');
  const tsconfigContent = readFileSync(tsconfigPath, 'utf-8');
  
  // Use a more robust approach to handle JSON with comments
  // Remove single-line comments (but preserve URLs with //)
  let cleanedContent = tsconfigContent.replace(/(?:^|\s)\/\/.*$/gm, '');
  // Remove multi-line comments
  cleanedContent = cleanedContent.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove trailing commas before closing braces/brackets
  cleanedContent = cleanedContent.replace(/,(\s*[}\]])/g, '$1');
  
  const tsconfig = JSON.parse(cleanedContent);
  
  if (tsconfig.compilerOptions?.paths) {
    Object.keys(tsconfig.compilerOptions.paths).forEach(key => {
      if (key.startsWith('@assetsim/')) {
        const paths = tsconfig.compilerOptions.paths[key];
        if (paths && paths[0]) {
          tsconfigPaths[key] = join(__dirname, paths[0]);
        }
      }
    });
    console.log('Loaded path mappings from tsconfig.json:', Object.keys(tsconfigPaths));
  }
} catch (error) {
  console.warn('Warning: Could not load path mappings from tsconfig.json:', error.message);
  console.warn('Falling back to hardcoded mappings');
  // Fallback to hardcoded mappings
  tsconfigPaths = {
    '@assetsim/shared/error-models': join(__dirname, '../../libs/shared/error-models/src/index.ts'),
    '@assetsim/shared/finance-models': join(__dirname, '../../libs/shared/finance-models/src/index.ts'),
  };
}

// Find all function entry points
const functionsDir = join(__dirname, 'src/functions');
const functionFiles = readdirSync(functionsDir)
  .filter(file => file.endsWith('.ts') && !file.endsWith('.spec.ts') && !file.endsWith('.test.ts'))
  .map(file => join(functionsDir, file));

console.log('Building Azure Functions with esbuild...');
console.log(`Mode: ${isProduction ? 'production' : 'development'}`);
console.log(`Found ${functionFiles.length} function(s) to build`);

// Check if watch mode is requested
const isWatchMode = process.argv.includes('--watch');

try {
  const buildOptions = {
    entryPoints: functionFiles,
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outdir: 'dist',
    outbase: 'src/functions',
    sourcemap: !isProduction,
    minify: isProduction,
    external: [
      // Azure Functions runtime
      '@azure/functions',
      // Native modules that should not be bundled
      'mssql',
      'tedious',
      'ioredis',
      'applicationinsights',
      '@azure/event-hubs',
      '@azure/web-pubsub',
    ],
    // Resolve path mappings defined in tsconfig.json
    plugins: [{
      name: 'assetsim-paths',
      setup(build) {
        // Resolve @assetsim/* imports to their source locations
        build.onResolve({ filter: /^@assetsim\// }, args => {
          const resolvedPath = tsconfigPaths[args.path];
          
          if (resolvedPath) {
            return { path: resolvedPath };
          }
          
          // If an @assetsim/* path is not mapped, this is a configuration error
          // Throw an explicit error to fail fast during build
          throw new Error(
            `Unmapped @assetsim path encountered: "${args.path}"\n` +
            `Available mappings: ${Object.keys(tsconfigPaths).join(', ')}\n` +
            `Update tsconfig.json "paths" to include this library.`
          );
        });
      }
    }],
    logLevel: 'info',
  };

  if (isWatchMode) {
    console.log('\nWatch mode enabled - rebuilding on file changes...\n');
    
    // Copy config files before entering watch mode
    copyConfigFiles();
    
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('Watching for changes...');
    // Keep the process running in watch mode
  } else {
    await esbuild.build(buildOptions);
    
    // Copy essential Azure Functions configuration files
    copyConfigFiles();

    console.log('\n✓ Build completed successfully');
    console.log('Output: dist/');
  }
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}

// Helper function to copy configuration files
function copyConfigFiles() {
  console.log('\nCopying configuration files...');
  
  // Ensure dist directory exists
  const distDir = join(__dirname, 'dist');
  mkdirSync(distDir, { recursive: true });
  
  try {
    // Copy host.json
    copyFileSync(join(__dirname, 'host.json'), join(distDir, 'host.json'));
    
    // Create production-only package.json (excluding devDependencies)
    const packageJsonPath = join(__dirname, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    
    // Create a production version without devDependencies
    const productionPackageJson = {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description,
      main: packageJson.main,
      dependencies: packageJson.dependencies,
      // Include only essential scripts for runtime
      scripts: {
        start: packageJson.scripts.start
      }
    };
    
    writeFileSync(
      join(distDir, 'package.json'),
      JSON.stringify(productionPackageJson, null, 2)
    );
    
    console.log('✓ Copied host.json and created production package.json in dist/');
  } catch (copyError) {
    console.error('Warning: Failed to copy configuration files:', copyError.message);
    // Non-fatal - build artifacts are still usable
  }
}
