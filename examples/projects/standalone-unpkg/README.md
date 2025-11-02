# Standalone unpkg.com Example

This example shows how to use gif2vid directly from a CDN (unpkg.com) with zero build step.

## Features

- ✅ No build required
- ✅ Single HTML file
- ✅ Loads library from unpkg.com CDN
- ✅ Works with WebCodecs for optimization
- ✅ File upload support
- ✅ Includes test GIF

## Usage

1. Start the server:

   ```bash
   ./startServer.sh
   ```

2. Open http://localhost:3334 in your browser

3. Either:
   - Click "Load & Convert test1.gif" to test with the included file
   - Select your own GIF file to convert

## How It Works

The HTML file includes a single script tag:

```html
<script src="https://unpkg.com/gif2vid@latest/lib/browser/gif2vid.standalone.js"></script>
```

This loads the complete library (including WASM embedded as base64) from unpkg.com. The library is then available globally as `window.gif2vid`.

## Code Example

```javascript
// Convert a GIF buffer to MP4
const mp4Buffer = await window.gif2vid.convertGifBuffer(gifBuffer);

// Create a video element
const blob = new Blob([mp4Buffer], { type: 'video/mp4' });
const videoUrl = URL.createObjectURL(blob);
```

## Notes

- The first time you load this page, it will download ~1.7MB from unpkg.com
- After that, the file is cached by your browser
- WebCodecs API is used for optimization (available in Chrome/Edge)
- Falls back to WASM-only mode in browsers without WebCodecs
