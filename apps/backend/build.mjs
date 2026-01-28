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
 * IMPORTANT: When adding new @assetsim/* shared libraries, update the path mapping
 * in the 'assetsim-paths' plugin below to include the new library path.
 */

import * as esbuild from 'esbuild';
import { readdirSync, copyFileSync, readFileSync } from 'fs';
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
  // Simple JSON parsing (comments are stripped by JSON.parse's error tolerance in practice)
  // For production use, consider using a proper JSON-with-comments parser
  const tsconfig = JSON.parse(tsconfigContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, ''));
  
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
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('Watching for changes...');
    // Keep the process running in watch mode
  } else {
    await esbuild.build(buildOptions);

  // Copy essential Azure Functions configuration files
  console.log('\nCopying configuration files...');
  try {
    copyFileSync(join(__dirname, 'host.json'), join(__dirname, 'dist/host.json'));
    copyFileSync(join(__dirname, 'package.json'), join(__dirname, 'dist/package.json'));
    console.log('✓ Copied host.json and package.json to dist/');
  } catch (copyError) {
    console.error('Warning: Failed to copy configuration files:', copyError.message);
    // Non-fatal - build artifacts are still usable
  }

  console.log('\n✓ Build completed successfully');
  console.log('Output: dist/');
  }
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
