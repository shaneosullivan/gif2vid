# gif2vid

Convert GIF animations to optimized MP4 videos using WebAssembly. Works in Node.js and browsers with zero external dependencies.

## Installation

```bash
npm install gif2vid
```

## Quick Start

### Command Line

```bash
# Direct usage (no installation)
npx gif2vid input.gif output.mp4

# With options
npx gif2vid input.gif output.mp4 --fps 30
gif2vid input.gif ./videos/  # Auto-generates filename
```

### Node.js

```typescript
import { convertGifBuffer } from 'gif2vid';

const gifBuffer = await readFile('./animation.gif');
const mp4Buffer = await convertGifBuffer(gifBuffer);
await writeFile('./output.mp4', mp4Buffer);
```

### Browser

```html
<script src="https://unpkg.com/gif2vid/lib/browser/gif2vid.standalone.js"></script>
<script>
  const mp4Buffer = await window.gif2vid.convertGifBuffer(gifBuffer);
</script>
```

## API

### Three Main Functions

#### 1. `convertFile(inputPath, outputPath, options?)`

```typescript
import { convertFile } from 'gif2vid';

await convertFile('./input.gif', './output.mp4');
await convertFile('./input.gif', './videos/');  // Auto-generates filename
await convertFile('./input.gif', './output.mp4', { fps: 30 });
```

#### 2. `convertGifBuffer(gifBuffer, options?)`

```typescript
import { convertGifBuffer } from 'gif2vid';

const gifBuffer = await readFile('./animation.gif');
const mp4Buffer = await convertGifBuffer(gifBuffer);
await writeFile('./output.mp4', mp4Buffer);
```

#### 3. `convertFrames(frames, options?)`

```typescript
import { convertFrames } from 'gif2vid';

const frames = [
  {
    data: { data: rgbaPixelData, width: 400, height: 300 },
    delayMs: 100
  },
  // ... more frames
];

const mp4Buffer = await convertFrames(frames, { fps: 30 });
```

### Options

All functions accept optional configuration:

```typescript
{
  fps?: number;      // Frames per second (default: 10)
  width?: number;    // Output width (defaults to input width)
  height?: number;   // Output height (defaults to input height)
}
```

## Usage Examples

### Browser (Standalone)

```html
<script src="https://unpkg.com/gif2vid/lib/browser/gif2vid.standalone.js"></script>
<script>
  const { convertGifBuffer } = window.gif2vid;

  async function convert() {
    const file = document.getElementById('gifInput').files[0];
    const arrayBuffer = await file.arrayBuffer();
    const gifBuffer = new Uint8Array(arrayBuffer);
    const mp4Buffer = await convertGifBuffer(gifBuffer);

    const blob = new Blob([mp4Buffer], { type: 'video/mp4' });
    videoElement.src = URL.createObjectURL(blob);
  }
</script>
```

### Browser (ES Module)

```javascript
import { convertGifBuffer } from 'gif2vid';

const arrayBuffer = await file.arrayBuffer();
const mp4Buffer = await convertGifBuffer(new Uint8Array(arrayBuffer));
const blob = new Blob([mp4Buffer], { type: 'video/mp4' });
videoElement.src = URL.createObjectURL(blob);
```

### Batch Processing

```typescript
import { convertFile } from 'gif2vid';

const files = await readdir('./gifs');
for (const file of files.filter(f => f.endsWith('.gif'))) {
  await convertFile(`./gifs/${file}`, './videos/');
}
```

### HTTP API

```typescript
import express from 'express';
import { convertGifBuffer } from 'gif2vid';

app.post('/convert', express.raw({ type: 'image/gif' }), async (req, res) => {
  const mp4Buffer = await convertGifBuffer(req.body);
  res.setHeader('Content-Type', 'video/mp4');
  res.send(mp4Buffer);
});
```

### Canvas to Video

```typescript
import { convertFrames } from 'gif2vid';

const frames = [];
for (let i = 0; i < 60; i++) {
  ctx.fillRect(0, 0, width, height); // Draw frame
  const imageData = ctx.getImageData(0, 0, width, height);
  frames.push({ data: imageData, delayMs: 33 });
}

const mp4Buffer = await convertFrames(frames);
```

### From URL

```typescript
const response = await fetch('https://example.com/animation.gif');
const gifBuffer = Buffer.from(await response.arrayBuffer());
const mp4Buffer = await convertGifBuffer(gifBuffer);
```

### Web Worker (Non-blocking UI)

```typescript
// worker.ts
import { convertGifBuffer } from 'gif2vid/worker';

self.addEventListener('message', async (event) => {
  const mp4Buffer = await convertGifBuffer(new Uint8Array(event.data));
  self.postMessage({ mp4Buffer: mp4Buffer.buffer }, [mp4Buffer.buffer]);
});
```

```typescript
// main.ts
const worker = new Worker('worker.js');

worker.addEventListener('message', (event) => {
  const blob = new Blob([event.data.mp4Buffer], { type: 'video/mp4' });
  videoElement.src = URL.createObjectURL(blob);
});

// Send GIF to worker
const arrayBuffer = await file.arrayBuffer();
worker.postMessage(arrayBuffer, [arrayBuffer]);
```

> **Note:** Use `gif2vid/worker` import in worker files. See [web-worker example](./examples/projects/web-worker) for complete implementation.

## Example Projects

Four complete example projects in `examples/projects/`:

| Project | Use Case | Quick Start |
|---------|----------|-------------|
| [standalone-unpkg](./examples/projects/standalone-unpkg) | Simple HTML, no build | `./startServer.sh` |
| [web-worker](./examples/projects/web-worker) | Production web apps | `npm install && npm run build && ./startServer.sh` |
| [express-server](./examples/projects/express-server) | REST API backend | `npm install && npm start` |
| [nextjs-app](./examples/projects/nextjs-app) | Full-stack Next.js | `npm install && npm run dev` |

See [examples/projects/README.md](./examples/projects/README.md) for details.

## License

MIT
