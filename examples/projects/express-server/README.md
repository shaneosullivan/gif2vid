# Express Server Example

This example shows server-side GIF to MP4 conversion using Express.js and gif2vid.

## Features

- ✅ Server-side conversion (Node.js)
- ✅ File upload with multer
- ✅ Saves MP4 to /tmp directory
- ✅ Download links for converted videos
- ✅ Auto-cleanup after 5 minutes
- ✅ Import from GitHub

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the server:

   ```bash
   npm start
   ```

3. Open http://localhost:3336 in your browser

## API Endpoints

### POST /convert

Convert a GIF to MP4.

**Request:**

- Content-Type: `multipart/form-data`
- Body: `gif` file field

**Response:**

```json
{
  "success": true,
  "videoUrl": "/videos/gif2vid-1234567890.mp4",
  "filename": "gif2vid-1234567890.mp4",
  "stats": {
    "inputSize": 124876,
    "outputSize": 118650,
    "duration": 0.65,
    "originalFilename": "animation.gif"
  }
}
```

### GET /health

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "service": "gif2vid-server"
}
```

## How It Works

### 1. File Upload

Uses multer to handle multipart/form-data uploads:

```javascript
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});
```

### 2. Conversion

Converts the uploaded GIF buffer:

```javascript
const mp4Buffer = await convertGifBuffer(req.file.buffer);
```

### 3. Save to Disk

Writes the MP4 to /tmp with a unique filename:

```javascript
const filename = `gif2vid-${Date.now()}.mp4`;
await writeFile(join('/tmp', filename), mp4Buffer);
```

### 4. Cleanup

Automatically deletes the file after 5 minutes:

```javascript
setTimeout(async () => {
  await unlink(filepath);
}, 5 * 60 * 1000);
```

## Benefits

- **Server resources**: Uses server CPU/memory, not client
- **Works everywhere**: No WebCodecs requirement
- **Persistent files**: Videos are saved to disk
- **API endpoint**: Can be integrated with other services

## Local Development

This example uses `"gif2vid": "file:../../.."` in package.json to reference the parent project. This means:
- You must run `npm run build` in the root project first
- The example uses the built files from the parent project's `lib/` and `converter/wasm/` folders
- Changes to the parent project require rebuilding before they appear in the example

## Production Considerations

- Add authentication/authorization
- Use cloud storage instead of /tmp
- Add rate limiting
- Implement proper error handling
- Use a job queue for long-running conversions
- Add webhook support for async processing
