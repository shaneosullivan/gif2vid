#!/usr/bin/env node
/**
 * Worker Bundle Builder for gif2vid
 *
 * This script creates a pre-built worker bundle that includes everything needed
 * for Web Worker usage, including the h264-mp4-encoder library.
 *
 * Developers can use this by simply importing in their worker:
 *   import { convertGifBuffer } from 'gif2vid/worker';
 *
 * ## Why a Separate Worker Build?
 *
 * 1. **Includes h264-mp4-encoder**: The worker bundle has h264-mp4-encoder prepended
 *    and exported as self.HME, so it's available for optimization.
 *
 * 2. **No build configuration needed**: Developers don't need to configure esbuild,
 *    webpack, or any other bundler to handle the worker dependencies.
 *
 * 3. **Optimized for workers**: Uses self.location.href instead of import.meta.url
 *    and properly handles the Web Worker global scope.
 */
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import * as esbuild from 'esbuild';

// Ensure the output directory exists
try {
  mkdirSync('lib', { recursive: true });
} catch {}

console.log('Building worker bundle...');

// ============================================================================
// STEP 1: Bundle the worker code with ESM format
// ============================================================================
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'esm',
  target: 'es2020',
  platform: 'browser',
  outfile: 'lib/worker.temp.js',
  plugins: [
    {
      name: 'ignore-node-modules',
      setup(build) {
        // Stub out node: imports for browser
        build.onResolve({ filter: /^node:/ }, (args) => {
          return { path: args.path, namespace: 'node-stub' };
        });

        // Also stub bare module names like "path", "fs", "crypto", "module"
        build.onResolve({ filter: /^(path|fs|crypto|module)$/ }, (args) => {
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
            export const readFileSync = () => {};
            export const createRequire = () => {};
          `,
            loader: 'js',
          };
        });
      },
    },
    {
      name: 'replace-h264-encoder-import',
      setup(build) {
        // Intercept .node.js imports first to prevent them from being processed
        build.onResolve({ filter: /h264-mp4-encoder\.node\.js/ }, (args) => {
          return { path: args.path, namespace: 'h264-encoder-node-stub' };
        });

        build.onLoad(
          { filter: /.*/, namespace: 'h264-encoder-node-stub' },
          () => {
            // Return empty stub for Node.js encoder (not used in browser/worker)
            return {
              contents: `export default {}; export const createH264MP4Encoder = () => {};`,
              loader: 'js',
            };
          },
        );

        // Then intercept other h264-mp4-encoder imports
        build.onResolve({ filter: /h264-mp4-encoder/ }, (args) => {
          return { path: args.path, namespace: 'h264-encoder-stub' };
        });

        build.onLoad({ filter: /.*/, namespace: 'h264-encoder-stub' }, () => {
          return {
            contents: `
            // This stub replaces the dynamic import of h264-mp4-encoder
            // The actual library is prepended to the worker bundle and sets self.HME
            const getHME = () => {
              if (typeof self !== 'undefined' && self.HME) {
                return self.HME;
              }
              throw new Error('HME not found - h264-mp4-encoder should be prepended to worker bundle');
            };
            export default getHME();
            export const createH264MP4Encoder = getHME().createH264MP4Encoder;
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
// In workers, it will set self.HME
const h264Encoder = readFileSync(
  'node_modules/h264-mp4-encoder/embuild/dist/h264-mp4-encoder.web.js',
  'utf-8',
);

// ============================================================================
// STEP 3: Read the bundled worker code
// ============================================================================
let workerBundle = readFileSync('lib/worker.temp.js', 'utf-8');

// Fix import.meta.url references for workers
// In workers, we use self.location.href
workerBundle = workerBundle.replace(/import\.meta\.url/g, 'self.location.href');
workerBundle = workerBundle.replace(/import_meta\.url/g, 'self.location.href');
workerBundle = workerBundle.replace(/import_meta2\.url/g, 'self.location.href');

// CRITICAL: Replace dynamic WASM imports with stub since HME is prepended
// Pattern 1: await (await import(wasmUrl).then((m) => m.default))()
// This is used in webcodecs.ts and needs to be replaced with a stub
workerBundle = workerBundle.replace(
  /await \(await import\(wasmUrl\)\.then\(\(m\) => m\.default\)\)\(\)/g,
  '(function() { throw new Error("WASM module should not be dynamically imported in worker bundle - this is a bug"); })()'
);

// Pattern 2: await import(wasmPath).then((m) => m.default)
// This is used in index.ts for Node.js path, should also be stubbed
workerBundle = workerBundle.replace(
  /await import\(wasmPath\)\.then\(\(m\) => m\.default\)/g,
  '(function() { throw new Error("WASM module should not be dynamically imported in worker bundle - this is a bug"); })'
);

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
// STEP 5: Write the final bundle and clean up
// ============================================================================
writeFileSync('lib/worker.js', finalBundle);

// Clean up the temporary bundle file
try {
  unlinkSync('lib/worker.temp.js');
} catch {}

// ============================================================================
// STEP 6: Generate TypeScript definitions
// ============================================================================
const workerDts = `/**
 * Web Worker bundle for gif2vid
 *
 * This module is pre-built for use in Web Workers and includes everything needed:
 * - h264-mp4-encoder for video optimization
 * - WASM modules for GIF decoding
 * - All conversion functions
 *
 * Usage in a Web Worker:
 * \`\`\`typescript
 * import { convertGifBuffer } from 'gif2vid/worker';
 *
 * self.addEventListener('message', async (e) => {
 *   const gifBuffer = new Uint8Array(e.data.gifBuffer);
 *   const mp4Buffer = await convertGifBuffer(gifBuffer);
 *   self.postMessage({ mp4Buffer: mp4Buffer.buffer }, { transfer: [mp4Buffer.buffer] });
 * });
 * \`\`\`
 */

export * from './index.js';
`;

writeFileSync('lib/worker.d.ts', workerDts);

const finalSize = (readFileSync('lib/worker.js').length / 1024 / 1024).toFixed(
  2,
);

console.log('✓ Worker bundle created successfully');
console.log('  Output: lib/worker.js');
console.log(`  Size: ${finalSize} MB`);
