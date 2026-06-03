#!/usr/bin/env node
/**
 * Build validation script for gif2vid
 *
 * Checks that every file expected from the build pipeline actually exists.
 * Run automatically as the last step of `npm run build`.
 */

import { existsSync, statSync } from 'node:fs';

const EXPECTED = [
  // build:wasm
  'converter/wasm/gif2vid-web.js',
  'converter/wasm/gif2vid-web.wasm',
  'converter/wasm/gif2vid-node.js',
  'converter/wasm/gif2vid-node.wasm',
  // build:browser
  'lib/browser.js',
  // build:browser:standalone
  'lib/browser/gif2vid.standalone.js',
  // build:worker
  'lib/worker.js',
  'lib/worker.d.ts',
  // build:node
  'lib/index.js',
  'lib/cli.js',
  // build:types
  'lib/cli.d.ts',
  'lib/gif-decoder.d.ts',
  'lib/index.d.ts',
  'lib/wasm-node-loader.d.ts',
  'lib/webcodecs.d.ts',
];

let failed = false;

for (const file of EXPECTED) {
  if (!existsSync(file) || statSync(file).size === 0) {
    console.error(`✗ Missing or empty: ${file}`);
    failed = true;
  } else {
    console.log(`✓ ${file}`);
  }
}

if (failed) {
  console.error('\nBuild validation failed — one or more output files are missing.');
  process.exit(1);
}

console.log('\nBuild validation passed.');
