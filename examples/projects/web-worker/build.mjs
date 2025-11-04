#!/usr/bin/env node
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';

// Ensure dist directory exists
try {
  mkdirSync('dist', { recursive: true });
} catch {}

// Build the worker - this will bundle everything including gif2vid source
await build({
  entryPoints: ['src/worker.ts'],
  bundle: true,
  format: 'esm',
  outfile: 'dist/worker.js',
  platform: 'browser',
  logOverride: {
    'direct-eval': 'silent',
  },
});

console.log('✓ Worker built successfully');
