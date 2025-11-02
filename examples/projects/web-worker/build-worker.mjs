#!/usr/bin/env node
/**
 * Web Worker Bundle Builder for gif2vid
 *
 * This script creates a web worker bundle that can run gif2vid conversion
 * in a separate thread without blocking the main UI.
 *
 * ## Key Differences from Main Thread
 *
 * 1. **No window object**: Web Workers run in a WorkerGlobalScope, not Window
 * 2. **Has self instead**: Use self for global scope
 * 3. **No document**: Cannot access DOM or document.currentScript
 *
 * ## Build Approach (mirrors standalone build)
 *
 * 1. **Prepend h264-mp4-encoder**: Like standalone build, we prepend the
 *    h264-mp4-encoder library so it sets self.HME (global in worker scope)
 *
 * 2. **Bundle worker code**: Use esbuild to bundle the worker TypeScript
 *
 * 3. **No WASM embedding needed**: Workers can fetch WASM files normally
 *    since they have network access
 *
 * This approach avoids the "Buffer is not defined" error because:
 * - h264-mp4-encoder is loaded as a script, not imported
 * - No Node.js code paths are triggered
 * - Worker can use self.HME just like standalone uses window.HME
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import * as esbuild from 'esbuild';

// Ensure the dist directory exists
try {
  mkdirSync('dist', { recursive: true });
} catch {}

console.log('Building web worker bundle...');

// ============================================================================
// STEP 1: Bundle the worker code with ESM format
// ============================================================================
await esbuild.build({
  entryPoints: ['src/worker.ts'],
  bundle: true,
  format: 'esm',
  target: 'es2020',
  platform: 'browser',
  outfile: 'dist/worker.temp.js',
  plugins: [
    {
      name: 'ignore-node-modules',
      setup(build) {
        // Stub out node: imports for browser
        build.onResolve({ filter: /^node:/ }, (args) => {
          return { path: args.path, namespace: 'node-stub' };
        });
        build.onLoad({ filter: /.*/, namespace: 'node-stub' }, () => {
          return {
            contents: `
            export default {};
            export const join = () => {};
            export const dirname = () => {};
            export const exec = () => {};
            export const promisify = () => {};
            export const writeFile = () => {};
            export const unlink = () => {};
            export const tmpdir = () => {};
          `,
            loader: 'js',
          };
        });
      },
    },
  ],
});

// ============================================================================
// STEP 2: Read the h264-mp4-encoder library
// ============================================================================
// This library provides H.264 video encoding via WebCodecs API.
// In workers, it will set self.HME instead of window.HME
// Note: We get this from the gif2vid package's node_modules
const h264Encoder = readFileSync(
  'node_modules/gif2vid/node_modules/h264-mp4-encoder/embuild/dist/h264-mp4-encoder.web.js',
  'utf-8',
);

// ============================================================================
// STEP 3: Read the bundled worker code
// ============================================================================
let workerBundle = readFileSync('dist/worker.temp.js', 'utf-8');

// Fix import.meta.url references for workers
// In workers, we can use self.location.href
workerBundle = workerBundle.replace(/import\.meta\.url/g, 'self.location.href');
workerBundle = workerBundle.replace(/import_meta\.url/g, 'self.location.href');
workerBundle = workerBundle.replace(/import_meta2\.url/g, 'self.location.href');

// ============================================================================
// STEP 4: Combine h264-encoder + worker bundle
// ============================================================================
// The order is critical:
//   1. h264-encoder: Creates HME variable
//   2. Export HME to self scope for worker access
//   3. workerBundle: The worker code that uses gif2vid (which uses self.HME)
const finalBundle = `${h264Encoder}

// Export HME to self scope so it's accessible as self.HME
self.HME = HME;

${workerBundle}
`;

// ============================================================================
// STEP 5: Write the final bundle
// ============================================================================
writeFileSync('dist/worker.js', finalBundle);

const finalSize = (readFileSync('dist/worker.js').length / 1024 / 1024).toFixed(
  2,
);

console.log('✓ Web worker bundle created successfully');
console.log('  Output: dist/worker.js');
console.log(`  Size: ${finalSize} MB`);
console.log('');
console.log('  Features:');
console.log('    • Non-blocking UI: Runs in separate thread');
console.log('    • H.264 encoding: Includes h264-mp4-encoder for optimization');
console.log('    • WebCodecs support: Uses browser hardware acceleration');
console.log('    • WASM fallback: Works without WebCodecs support');
