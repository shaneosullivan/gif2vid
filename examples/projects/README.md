# gif2vid Example Projects

This directory contains complete, working example projects demonstrating different ways to use gif2vid in your applications.

## Examples Overview

### 1. [standalone-unpkg](./standalone-unpkg) - Simplest Browser Usage

**Best for**: Quick prototypes, no-build-step projects

Load gif2vid directly from CDN with a single `<script>` tag. No npm install, no build process required.

```html
<script src="https://unpkg.com/gif2vid@latest/lib/browser/gif2vid.standalone.js"></script>
<script>
  const mp4Buffer = await window.gif2vid.convertGifBuffer(gifBuffer);
</script>
```

**Features:**
- ✅ Zero dependencies
- ✅ Works with just an HTML file
- ✅ Loads from unpkg.com CDN
- ✅ Includes local test server script

**Start it:**
```bash
cd standalone-unpkg
./startServer.sh
# Open http://localhost:8080
```

---

### 2. [web-worker](./web-worker) - Non-Blocking Conversion

**Best for**: Production web apps, smooth UI experience

Runs gif2vid in a Web Worker to keep the main thread responsive during conversion.

```typescript
// worker.ts
import { convertGifBuffer } from 'gif2vid';

self.addEventListener('message', async (event) => {
  const mp4Buffer = await convertGifBuffer(event.data.gifBuffer);
  self.postMessage({ mp4Buffer: mp4Buffer.buffer }, [mp4Buffer.buffer]);
});
```

**Features:**
- ✅ Non-blocking UI
- ✅ TypeScript support
- ✅ esbuild bundling
- ✅ Transferable objects for performance
- ✅ Imports from GitHub (pre-npm publish)

**Start it:**
```bash
cd web-worker
npm install
npm run build
./startServer.sh
# Open http://localhost:8080
```

---

### 3. [express-server](./express-server) - Server-Side Conversion

**Best for**: Backend services, API endpoints, Node.js apps

A Node.js Express server that accepts GIF uploads via POST and returns MP4 download links.

```javascript
import { convertGifBuffer } from 'gif2vid';
import multer from 'multer';

app.post('/convert', upload.single('gif'), async (req, res) => {
  const mp4Buffer = await convertGifBuffer(req.file.buffer);
  const filename = `gif2vid-${Date.now()}.mp4`;
  await writeFile(join('/tmp', filename), mp4Buffer);
  res.json({ videoUrl: `/videos/${filename}` });
});
```

**Features:**
- ✅ Server-side processing
- ✅ File upload with multer
- ✅ RESTful API endpoints
- ✅ Auto-cleanup after 5 minutes
- ✅ Saves files to /tmp directory

**Start it:**
```bash
cd express-server
npm install
npm start
# Open http://localhost:3000
```

---

### 4. [nextjs-app](./nextjs-app) - Modern Full-Stack App

**Best for**: Production web applications, full-stack projects

A complete Next.js application using App Router with API routes for server-side conversion.

```typescript
// app/api/convert/route.ts
import { convertGifBuffer } from 'gif2vid';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('gif') as File;
  const buffer = Buffer.from(await file.arrayBuffer());
  const mp4Buffer = await convertGifBuffer(buffer);
  // Save and return URL
}
```

**Features:**
- ✅ Next.js App Router
- ✅ Server-side conversion
- ✅ TypeScript throughout
- ✅ API routes
- ✅ Modern React components

**Start it:**
```bash
cd nextjs-app
npm install
npm run dev
# Open http://localhost:3000
```

---

## Choosing the Right Example

| Use Case | Example | Why? |
|----------|---------|------|
| Quick prototype | standalone-unpkg | No build step, works instantly |
| Production web app | web-worker | Non-blocking, smooth UX |
| Backend API | express-server | Server resources, universal compatibility |
| Full-stack app | nextjs-app | Modern stack, optimized builds |

## Common Features

All examples include:
- 📁 File selection UI
- 🚀 Quick test with included test1.gif
- 📊 Conversion stats (time, file size)
- 🎬 Video preview player
- ⬇️ Download button
- 🎨 Consistent, modern UI

## Installation Notes

### Local Development

All TypeScript examples (web-worker, express-server, nextjs-app) use a local file reference to the parent project:

```json
{
  "dependencies": {
    "gif2vid": "file:../../.."
  }
}
```

**Important:** Before running these examples, you must build the parent project first:

```bash
# From the root of the gif2vid project
npm run build

# Then in any example folder
cd examples/projects/web-worker
npm install
npm run build
```

### For External Projects

When using gif2vid in your own projects (outside this repository), install from npm:

```json
{
  "dependencies": {
    "gif2vid": "^1.0.0"
  }
}
```

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| WASM (required) | ✅ 57+ | ✅ 52+ | ✅ 11+ | ✅ 79+ |
| WebCodecs (optimization) | ✅ 94+ | ❌ | ✅ 16.4+ | ✅ 94+ |

All examples work in all browsers via WASM. Chrome, Safari, and Edge get automatic WebCodecs optimization for smaller file sizes.

## Development Tips

### Testing Locally

Each example includes its own test GIF file (test1.gif), so you can test immediately without finding your own GIF.

### Build Process

- **standalone-unpkg**: No build needed
- **web-worker**: Runs `esbuild` to bundle worker
- **express-server**: No build needed (uses Node.js imports)
- **nextjs-app**: Uses Next.js's built-in bundler

### Debugging

All examples include detailed console logging. Open your browser's DevTools to see:
- Conversion progress
- File sizes
- Processing time
- Whether WebCodecs optimization was used

## Production Deployment

### Client-Side (standalone-unpkg, web-worker)

1. **CDN**: Host on CDN for global distribution
2. **Caching**: Set long cache headers for the standalone bundle
3. **Compression**: Serve with gzip/brotli compression

### Server-Side (express-server, nextjs-app)

1. **Storage**: Use cloud storage (S3, Vercel Blob) instead of /tmp
2. **Rate Limiting**: Prevent abuse with rate limits
3. **Auth**: Add authentication for private conversions
4. **Queue**: Use job queue (Bull, BullMQ) for async processing
5. **Monitoring**: Track conversion times and errors

## Learn More

- [gif2vid Main README](../../README.md)
- [gif2vid on GitHub](https://github.com/shaneosullivan/gif2vid)
- [npm package](https://www.npmjs.com/package/gif2vid) (coming soon)

## Support

If you encounter issues with any example:
1. Check the example's README for specific instructions
2. Verify Node.js version (requires 18+)
3. Clear node_modules and reinstall: `rm -rf node_modules && npm install`
4. Check browser console for errors
5. Open an issue on GitHub
