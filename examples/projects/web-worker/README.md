# Web Worker Example

This example shows how to use gif2vid in a Web Worker to keep the UI responsive during conversion.

## Features

- ✅ Non-blocking UI (conversion in separate thread)
- ✅ TypeScript Web Worker
- ✅ Pre-built worker bundle (no complex configuration needed)
- ✅ Simple esbuild setup
- ✅ Transferable objects for performance
- ✅ Progress updates

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Build the worker:

   ```bash
   npm run build
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

   Or use the start script:

   ```bash
   npm start
   ```

4. Open http://localhost:8081 in your browser

## How It Works

### 1. Worker (TypeScript)

The worker imports from the pre-built `gif2vid/worker` bundle:

```typescript
import { convertGifBuffer } from 'gif2vid/worker';

self.addEventListener('message', async (event) => {
  const { gifBuffer } = event.data;
  const mp4Buffer = await convertGifBuffer(new Uint8Array(gifBuffer));
  self.postMessage({ mp4Buffer: mp4Buffer.buffer }, { transfer: [mp4Buffer.buffer] });
});
```

**Key Point**: Use `gif2vid/worker` instead of `gif2vid` - this pre-built bundle includes everything needed for Web Workers (h264-mp4-encoder, WASM modules, etc.)

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

Just use esbuild to bundle your worker:

```bash
esbuild src/worker.ts --bundle --format=esm --outfile=dist/worker.js --platform=browser --log-override:direct-eval=silent
```

That's it! No need to configure WASM file copying, h264-mp4-encoder prepending, or any other complex build steps.

**Note**: The `--log-override:direct-eval=silent` flag suppresses a harmless warning about `eval()` usage in the h264-mp4-encoder library.

## Benefits

- **Non-blocking**: UI remains responsive during conversion
- **Better UX**: Can show progress, cancel operations
- **Performance**: Transferable objects avoid copying large buffers
- **Clean code**: Separation of concerns
- **Simple setup**: Pre-built worker bundle eliminates configuration complexity

## Why `gif2vid/worker`?

The `gif2vid/worker` export is a pre-built bundle specifically designed for Web Workers:

- ✅ Includes h264-mp4-encoder for video optimization
- ✅ Includes WASM modules for GIF decoding
- ✅ Properly configured for Web Worker environment (uses `self` instead of `window`)
- ✅ No build configuration needed on your end

## Local Development

This example uses `"gif2vid": "file:../../.."` in package.json to reference the parent project. This means:
- You must run `npm run build` in the root project first
- The example uses the built files from the parent project's `lib/` folder
- Changes to the parent project require rebuilding before they appear in the example
