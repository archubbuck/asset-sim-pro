/**
 * esbuild Configuration for AssetSim Pro Backend
 * 
 * This build script addresses the two known TypeScript limitations:
 * 
 * 1. Output Structure: Bundles code into dist/functions/ matching Azure Functions structure
 * 2. Runtime Module Resolution: Resolves @assetsim/* path mappings during build
 * 
 * The bundler approach is production-ready and eliminates the need for:
 * - Nx workspace linking
 * - tsconfig-paths runtime resolution
 * - Building shared libraries separately
 */

import * as esbuild from 'esbuild';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Find all function entry points
const functionsDir = join(__dirname, 'src/functions');
const functionFiles = readdirSync(functionsDir)
  .filter(file => file.endsWith('.ts') && !file.endsWith('.spec.ts') && !file.endsWith('.test.ts'))
  .map(file => join(functionsDir, file));

console.log('Building Azure Functions with esbuild...');
console.log(`Found ${functionFiles.length} function(s) to build`);

try {
  await esbuild.build({
    entryPoints: functionFiles,
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outdir: 'dist/functions',
    outbase: 'src/functions',
    sourcemap: true,
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
          const mapping = {
            '@assetsim/shared/error-models': join(__dirname, '../../libs/shared/error-models/src/index.ts'),
            '@assetsim/shared/finance-models': join(__dirname, '../../libs/shared/finance-models/src/index.ts'),
            '@assetsim/shared/auth-models': join(__dirname, '../../libs/shared/auth-models/src/index.ts'),
          };
          
          const resolvedPath = mapping[args.path];
          if (resolvedPath) {
            return { path: resolvedPath };
          }
          
          return null;
        });
      }
    }],
    logLevel: 'info',
  });

  console.log('\n✓ Build completed successfully');
  console.log('Output: dist/functions/');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
