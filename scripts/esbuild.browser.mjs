#!/usr/bin/env node
/**
 * Browser ESM Bundle Builder with Embedded WASM
 *
 * This creates an ES module for browsers with WASM and h264-mp4-encoder embedded inline.
 * Works with modern build tools (webpack, vite, rollup, Next.js, etc.)
 */

import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import * as esbuild from 'esbuild';

// Ensure the output directory exists
try {
  mkdirSync('lib', { recursive: true });
} catch {}

console.log('Building browser bundle with embedded WASM...');

// ============================================================================
// STEP 1: Bundle with ESM format
// ============================================================================
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'esm',
  target: 'es2020',
  platform: 'browser',
  outfile: 'lib/browser.temp.js',
  plugins: [
    {
      name: 'ignore-node-modules',
      setup(build) {
        // Stub out node: imports for browser
        build.onResolve({ filter: /^node:/ }, (args) => {
          return { path: args.path, namespace: 'node-stub' };
        });

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
      name: 'replace-wasm-loader-import',
      setup(build) {
        // Replace dynamic WASM imports with embedded module
        build.onResolve({ filter: /gif2vid-web\.js$/ }, (args) => {
          return { path: args.path, namespace: 'wasm-loader-stub' };
        });
        build.onLoad({ filter: /.*/, namespace: 'wasm-loader-stub' }, () => {
          return {
            contents: `
            // Returns the embedded WASM module creator
            export default function() {
              if (typeof __gif2vidCreateModule !== 'undefined') {
                return __gif2vidCreateModule;
              }
              throw new Error('__gif2vidCreateModule not found');
            }
          `,
            loader: 'js',
          };
        });
      },
    },
    {
      name: 'replace-h264-encoder-import',
      setup(build) {
        build.onResolve({ filter: /h264-mp4-encoder\.node\.js/ }, (args) => {
          return { path: args.path, namespace: 'h264-encoder-node-stub' };
        });

        build.onLoad(
          { filter: /.*/, namespace: 'h264-encoder-node-stub' },
          () => {
            return {
              contents: `export default {}; export const createH264MP4Encoder = () => {};`,
              loader: 'js',
            };
          },
        );

        build.onResolve({ filter: /h264-mp4-encoder/ }, (args) => {
          return { path: args.path, namespace: 'h264-encoder-stub' };
        });

        build.onLoad({ filter: /.*/, namespace: 'h264-encoder-stub' }, () => {
          return {
            contents: `
            // Access the embedded HME library
            const getHME = () => {
              if (typeof __gif2vidHME !== 'undefined') {
                return __gif2vidHME;
              }
              throw new Error('HME not found - should be embedded in bundle');
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
const h264Encoder = readFileSync(
  'node_modules/h264-mp4-encoder/embuild/dist/h264-mp4-encoder.web.js',
  'utf-8',
);

const wasmBinary = readFileSync('converter/wasm/gif2vid-web.wasm');
const wasmBase64 = wasmBinary.toString('base64');

let wasmLoader = readFileSync('converter/wasm/gif2vid-web.js', 'utf-8');

// Modify WASM loader to use embedded binary
wasmLoader = wasmLoader.replace(
  /return new URL\("gif2vid-web\.wasm",import\.meta\.url\)\.href/g,
  'return "embedded.wasm"',
);
wasmLoader = wasmLoader.replace(/import\.meta\.url/g, 'location.href');
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

// Remove the export statement - we'll access the function directly
wasmLoader = wasmLoader.replace(
  /export default createGif2VidModule;/g,
  '',
);

// ============================================================================
// STEP 3: Read and modify the bundled code
// ============================================================================
let bundle = readFileSync('lib/browser.temp.js', 'utf-8');

// CRITICAL: Remove any Node.js WASM loader that got bundled
// The bundle might contain gif2vid-node.js code which also has createGif2VidModule
// We need to rename or remove it to avoid conflicts
bundle = bundle.replace(
  /\/\/ converter\/wasm\/gif2vid-node\.js[\s\S]*?async function createGif2VidModule/g,
  '// converter/wasm/gif2vid-node.js (removed)\nasync function __REMOVED_createGif2VidModule_NodeVersion',
);

// Replace import.meta references
bundle = bundle.replace(/import\.meta\.dirname/g, '""');
bundle = bundle.replace(/import_meta\.dirname/g, '""');
bundle = bundle.replace(/import\.meta\.url/g, 'location.href');
bundle = bundle.replace(/import_meta\.url/g, 'location.href');
bundle = bundle.replace(/import_meta2\.url/g, 'location.href');

// Replace dynamic WASM imports with embedded module reference
bundle = bundle.replace(
  /await \(await import\(wasmUrl\)\.then\(\(m\) => m\.default\)\)\(\)/g,
  'await __gif2vidCreateModule()',
);
bundle = bundle.replace(
  /await import\(wasmPath\)\.then\(\(m\) => m\.default\)/g,
  '__gif2vidCreateModule',
);

// ============================================================================
// STEP 4: Combine everything
// ============================================================================
const finalBundle = `// h264-mp4-encoder library
${h264Encoder}

// Embedded WASM binary
const __gif2vidWasmBinary = (function() {
  const wasmBase64 = '${wasmBase64}';
  const binaryString = atob(wasmBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
})();

// WASM loader
${wasmLoader}
const __gif2vidCreateModule = createGif2VidModule;

// HME reference
const __gif2vidHME = HME;

// Main module
${bundle}
`;

// ============================================================================
// STEP 5: Write output
// ============================================================================
writeFileSync('lib/browser.js', finalBundle);

try {
  unlinkSync('lib/browser.temp.js');
} catch {}

const finalSize = (readFileSync('lib/browser.js').length / 1024 / 1024).toFixed(2);

console.log('✓ Browser bundle created successfully');
console.log('  Output: lib/browser.js');
console.log(`  Size: ${finalSize} MB`);
