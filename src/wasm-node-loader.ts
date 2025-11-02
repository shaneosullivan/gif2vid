/**
 * WASM loader for Node.js
 * This module provides a single entry point for loading the WASM module
 */

// This import will be intercepted by the esbuild plugin in standalone builds
import createModule from '../converter/wasm/gif2vid-node.js';

export { createModule };
