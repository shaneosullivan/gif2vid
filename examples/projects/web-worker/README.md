# Web Worker Example

This example shows how to use gif2vid in a Web Worker to keep the UI responsive during conversion.

## Features

- ✅ Non-blocking UI (conversion in separate thread)
- ✅ TypeScript Web Worker
- ✅ Built with esbuild
- ✅ Imports from GitHub
- ✅ Transferable objects for performance
- ✅ Progress updates

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy WASM files (required for dynamic imports):

   ```bash
   npm run copy-wasm
   ```

3. Build the worker:

   ```bash
   npm run build
   ```

4. Start the server:

   ```bash
   ./startServer.sh
   ```

   Or use npm:

   ```bash
   npm start
   ```

5. Open http://localhost:3335 in your browser

## How It Works

### 1. Worker (TypeScript)

The worker imports gif2vid and handles conversion:

```typescript
import { convertGifBuffer } from 'gif2vid';

self.addEventListener('message', async (event) => {
  const { gifBuffer } = event.data;
  const mp4Buffer = await convertGifBuffer(new Uint8Array(gifBuffer));
  self.postMessage({ mp4Buffer: mp4Buffer.buffer }, [mp4Buffer.buffer]);
});
```

### 2. Main Thread

The UI sends messages to the worker:

```javascript
const worker = new Worker('./dist/worker.js', { type: 'module' });
worker.postMessage({ gifBuffer }, [gifBuffer]);
worker.addEventListener('message', (event) => {
  const { mp4Buffer } = event.data;
  // Display video
});
```

### 3. Build Process

esbuild bundles the TypeScript worker with gif2vid:

```bash
esbuild src/worker.ts --bundle --format=esm --outfile=dist/worker.js
```

## Benefits

- **Non-blocking**: UI remains responsive during conversion
- **Better UX**: Can show progress, cancel operations
- **Performance**: Transferable objects avoid copying large buffers
- **Clean code**: Separation of concerns

## Notes

- The worker is built as an ES module (`type: 'module'`)
- Uses Transferable objects for better performance
- gif2vid is imported as a local file reference to the parent project
- WebCodecs is available in workers (Chrome/Edge)

## Local Development

This example uses `"gif2vid": "file:../../.."` in package.json to reference the parent project. This means:
- You must run `npm run build` in the root project first
- The example uses the built files from the parent project's `lib/` and `converter/wasm/` folders
- Changes to the parent project require rebuilding before they appear in the example

### WASM File Copying

The WASM files need to be copied to the project root (`converter/wasm/`) because:
- The bundled worker uses dynamic imports to load WASM modules at runtime
- Relative paths in the worker resolve from the web server root, not node_modules
- The `postinstall` script automatically copies these files after `npm install`
- You can manually run `npm run copy-wasm` if needed
