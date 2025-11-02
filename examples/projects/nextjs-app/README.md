# Next.js App Example

This example shows server-side GIF to MP4 conversion using Next.js App Router and gif2vid.

## Features

- ✅ Server-side conversion (Next.js API Routes)
- ✅ File upload interface
- ✅ Saves MP4 to /tmp directory
- ✅ Download links for converted videos
- ✅ Auto-cleanup after 5 minutes
- ✅ Import from GitHub

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Open http://localhost:3337 in your browser

## Project Structure

```
nextjs-app/
├── app/
│   ├── api/
│   │   ├── convert/
│   │   │   └── route.ts          # POST endpoint for conversion
│   │   └── video/
│   │       └── [filename]/
│   │           └── route.ts      # GET endpoint for video download
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Main page component
│   └── globals.css               # Styling
├── public/
│   └── test1.gif                 # Test GIF file
├── package.json
├── tsconfig.json
├── next.config.ts
└── README.md
```

## API Endpoints

### POST /api/convert

Convert a GIF to MP4.

**Request:**

- Content-Type: `multipart/form-data`
- Body: `gif` file field

**Response:**

```json
{
  "success": true,
  "videoUrl": "/api/video/gif2vid-1234567890.mp4",
  "filename": "gif2vid-1234567890.mp4",
  "stats": {
    "inputSize": 124876,
    "outputSize": 118650,
    "duration": 0.65,
    "originalFilename": "animation.gif"
  }
}
```

### GET /api/video/[filename]

Download a converted video file.

**Response:**

- Content-Type: `video/mp4`
- Binary MP4 data

## How It Works

### 1. File Upload

The client uploads a GIF file via POST request:

```typescript
const formData = new FormData();
formData.append('gif', file);

const response = await fetch('/api/convert', {
  method: 'POST',
  body: formData,
});
```

### 2. Server-Side Conversion

The API route converts the uploaded GIF:

```typescript
import { convertGifBuffer } from 'gif2vid';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('gif') as File;
  const buffer = Buffer.from(await file.arrayBuffer());

  const mp4Buffer = await convertGifBuffer(buffer);

  const filename = `gif2vid-${Date.now()}.mp4`;
  await writeFile(join('/tmp', filename), mp4Buffer);

  return NextResponse.json({
    videoUrl: `/api/video/${filename}`,
    filename,
  });
}
```

### 3. Video Download

The video is served via a dynamic API route:

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  const filepath = join('/tmp', params.filename);
  const videoBuffer = await readFile(filepath);

  return new NextResponse(videoBuffer, {
    headers: {
      'Content-Type': 'video/mp4',
    },
  });
}
```

### 4. Cleanup

Files are automatically deleted after 5 minutes to save disk space.

## Benefits

- **Server resources**: Uses server CPU/memory, not client
- **Works everywhere**: No WebCodecs requirement
- **Persistent files**: Videos are saved to disk
- **API endpoints**: Can be integrated with other services
- **Next.js optimizations**: Built-in caching and optimization

## Local Development

This example uses `"gif2vid": "file:../../.."` in package.json to reference the parent project. This means:
- You must run `npm run build` in the root project first
- The example uses the built files from the parent project's `lib/` and `converter/wasm/` folders
- Changes to the parent project require rebuilding before they appear in the example

## Production Considerations

- Add authentication/authorization
- Use cloud storage (AWS S3, Vercel Blob, etc.) instead of /tmp
- Add rate limiting
- Implement proper error handling
- Use a job queue for long-running conversions
- Add webhook support for async processing
- Configure CORS for cross-origin requests

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [gif2vid on GitHub](https://github.com/shaneosullivan/gif2vid)
