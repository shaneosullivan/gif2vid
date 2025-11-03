/**
 * Standalone Node.js Bundle Builder for gif2vid
 *
 * Creates a self-contained Node.js bundle with embedded WASM files.
 * Uses esbuild plugin to inline WASM as base64.
 */

import { mkdirSync, readFileSync } from 'node:fs';
import * as esbuild from 'esbuild';

// Ensure output directory exists
try {
  mkdirSync('lib', { recursive: true });
} catch {}

// Read WASM binary once
const wasmBinary = readFileSync('converter/wasm/gif2vid-node.wasm');
const wasmBase64 = wasmBinary.toString('base64');

console.log('  WASM binary size:', (wasmBinary.length / 1024).toFixed(2), 'KB');
console.log('  Base64 encoded:', (wasmBase64.length / 1024).toFixed(2), 'KB');

// ============================================================================
// Plugin to stub web version of h264-mp4-encoder (not needed in Node.js)
// ============================================================================
const stubWebH264EncoderPlugin = {
  name: 'stub-web-h264-encoder',
  setup(build) {
    // Stub out the web version of h264-mp4-encoder (Node.js only needs .node.js version)
    build.onResolve({ filter: /h264-mp4-encoder\.web\.js$/ }, (args) => {
      return { path: args.path, namespace: 'h264-encoder-web-stub' };
    });

    build.onLoad({ filter: /.*/, namespace: 'h264-encoder-web-stub' }, () => {
      return {
        contents: `
          // Web version of h264-mp4-encoder is not needed in Node.js
          // Node.js uses the .node.js version
          export default { createH264MP4Encoder: () => { throw new Error('h264-mp4-encoder web version should not be used in Node.js'); } };
          export const createH264MP4Encoder = () => { throw new Error('h264-mp4-encoder web version should not be used in Node.js'); };
        `,
        loader: 'js',
      };
    });
  },
};

// ============================================================================
// Plugin to inline WASM loader with embedded binary
// ============================================================================
const inlineWasmPlugin = {
  name: 'inline-wasm',
  setup(build) {
    // Intercept imports of the WASM loader
    build.onResolve(
      { filter: /\/converter\/wasm\/gif2vid-node\.js$/ },
      (args) => {
        return { path: args.path, namespace: 'inline-wasm' };
      },
    );

    build.onLoad({ filter: /.*/, namespace: 'inline-wasm' }, () => {
      // Read the WASM loader code
      let wasmLoader = readFileSync('converter/wasm/gif2vid-node.js', 'utf-8');

      // Inject the WASM binary directly into the loader
      // Replace the wasmBinary variable declaration with our embedded binary
      wasmLoader = wasmLoader.replace(
        /var wasmBinary;/g,
        `var wasmBinary = Buffer.from('${wasmBase64}', 'base64');`,
      );

      // Replace the new URL() call with an empty string since we have wasmBinary embedded
      // The return value needs to be a string, not null, because it's used in string operations
      wasmLoader = wasmLoader.replace(
        /new URL\("gif2vid-node\.wasm",import\.meta\.url\)\.href/g,
        '""',
      );

      // Fix createRequire call - replace the entire import and call with a stub
      // We don't need require since the WASM binary is embedded
      wasmLoader = wasmLoader.replace(
        /const\{createRequire\}=await import\("module"\);var require=createRequire\(import\.meta\.url\)/g,
        'var require=(id)=>{return{}}',
      );

      // Stub out fs since we have the WASM binary embedded
      wasmLoader = wasmLoader.replace(
        /var fs=require\("fs"\);/g,
        'var fs={readFileSync:()=>{throw new Error("fs not needed - WASM is embedded")}};',
      );

      // Remove the entire ENVIRONMENT_IS_NODE block that tries to use fs
      // We don't need it since the WASM binary is embedded
      wasmLoader = wasmLoader.replace(
        /if\(_scriptName\.startsWith\("file:"\)\)\{scriptDirectory=require[^}]+\}/g,
        '',
      );

      // Stub out readBinary and readAsync since we have the binary embedded
      wasmLoader = wasmLoader.replace(
        /readBinary=filename=>\{[^}]+\};/g,
        'readBinary=()=>{throw new Error("readBinary not needed")};',
      );

      wasmLoader = wasmLoader.replace(
        /readAsync=async\(filename,binary=true\)=>\{[^}]+\};/g,
        'readAsync=async()=>{throw new Error("readAsync not needed")};',
      );

      return {
        contents: wasmLoader,
        loader: 'js',
      };
    });
  },
};

// ============================================================================
// Bundle everything with esbuild using ESM format
// ============================================================================

// Build main library
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'esm',
  target: 'node20',
  platform: 'node',
  outfile: 'lib/index.js',
  external: ['node:*'],
  plugins: [stubWebH264EncoderPlugin, inlineWasmPlugin],
  banner: {
    js: `/**
 * gif2vid - Standalone Node.js Bundle
 *
 * This is a self-contained bundle that includes:
 * - gif2vid core library
 * - All WASM binaries (embedded as base64)
 *
 * No external files or special configuration needed!
 * Works with Next.js, Remix, serverless functions, Docker, etc.
 */
`,
  },
});

// Build CLI (shebang is preserved from source file)
await esbuild.build({
  entryPoints: ['src/cli.ts'],
  bundle: true,
  format: 'esm',
  target: 'node20',
  platform: 'node',
  outfile: 'lib/cli.js',
  external: ['node:*'],
  plugins: [stubWebH264EncoderPlugin, inlineWasmPlugin],
});

const stats = readFileSync('lib/index.js');
const cliStats = readFileSync('lib/cli.js');
console.log('✓ Standalone Node.js bundles created successfully');
console.log(
  '  Library: lib/index.js -',
  (stats.length / 1024 / 1024).toFixed(2),
  'MB',
);
console.log(
  '  CLI:     lib/cli.js -',
  (cliStats.length / 1024 / 1024).toFixed(2),
  'MB',
);
