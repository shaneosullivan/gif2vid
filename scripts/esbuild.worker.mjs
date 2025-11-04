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
// STEP 2: Read dependencies
// ============================================================================
// h264-mp4-encoder library for video encoding
const h264Encoder = readFileSync(
  'node_modules/h264-mp4-encoder/embuild/dist/h264-mp4-encoder.web.js',
  'utf-8',
);

// Read and encode WASM binary as base64
const wasmBinary = readFileSync('converter/wasm/gif2vid-web.wasm');
const wasmBase64 = wasmBinary.toString('base64');

// Read and modify WASM loader to use embedded binary
let wasmLoader = readFileSync('converter/wasm/gif2vid-web.js', 'utf-8');
wasmLoader = wasmLoader.replace(
  /return new URL\("gif2vid-web\.wasm",import\.meta\.url\)\.href/g,
  'return "embedded.wasm"',
);
wasmLoader = wasmLoader.replace(/import\.meta\.url/g, 'self.location.href');
wasmLoader = wasmLoader.replace(
  /var wasmBinary;/g,
  'var wasmBinary=__gif2vidWasmBinary;',
);
wasmLoader = wasmLoader.replace(
  /async function instantiateAsync\(binary,binaryFile,imports\)\{/g,
  'async function instantiateAsync(binary,binaryFile,imports){if(binary){try{var instance=await WebAssembly.instantiate(binary,imports);return instance}catch(reason){err(`failed to instantiate embedded wasm: ${reason}`);abort(reason)}}',
);
wasmLoader = wasmLoader.replace(
  /if\(!binary\)\{try\{var response=fetch/g,
  'if(false && !binary){try{var response=fetch',
);
wasmLoader = wasmLoader.replace(
  /export default createGif2VidModule;/g,
  '',
);

// ============================================================================
// STEP 3: Read and modify the bundled worker code
// ============================================================================
let workerBundle = readFileSync('lib/worker.temp.js', 'utf-8');

// Remove any Node.js WASM loader to avoid conflicts
workerBundle = workerBundle.replace(
  /\/\/ converter\/wasm\/gif2vid-node\.js[\s\S]*?async function createGif2VidModule/g,
  '// converter/wasm/gif2vid-node.js (removed)\nasync function __REMOVED_createGif2VidModule_NodeVersion',
);

// Fix import.meta.url references for workers
workerBundle = workerBundle.replace(/import\.meta\.url/g, 'self.location.href');
workerBundle = workerBundle.replace(/import_meta\.url/g, 'self.location.href');
workerBundle = workerBundle.replace(/import_meta2\.url/g, 'self.location.href');

// Replace dynamic WASM imports with embedded module reference
workerBundle = workerBundle.replace(
  /await \(await import\(wasmUrl\)\.then\(\(m\) => m\.default\)\)\(\)/g,
  'await __gif2vidCreateModule()',
);
workerBundle = workerBundle.replace(
  /await import\(wasmPath\)\.then\(\(m\) => m\.default\)/g,
  '__gif2vidCreateModule',
);

// ============================================================================
// STEP 4: Combine everything
// ============================================================================
const finalBundle = `// h264-mp4-encoder library
${h264Encoder}

// Export HME to self scope
self.HME = HME;

// Embedded WASM binary
const __gif2vidWasmBinary = (function() {
  const wasmBase64 = '${wasmBase64}';
  const binaryString = atob(wasmBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
})();

// WASM module loader
${wasmLoader}

// Create module function reference
const __gif2vidCreateModule = createGif2VidModule;

// Main worker code
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
