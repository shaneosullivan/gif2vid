import { NextRequest, NextResponse } from 'next/server';
import { convertGifBuffer } from 'gif2vid';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('gif') as File;

    if (!file) {
      return NextResponse.json({ error: 'No GIF file provided' }, { status: 400 });
    }

    if (!file.type.includes('gif')) {
      return NextResponse.json({ error: 'Only GIF files are allowed' }, { status: 400 });
    }

    console.log(`Converting ${file.name}...`);
    const startTime = Date.now();

    // Convert GIF to MP4
    const buffer = Buffer.from(await file.arrayBuffer());
    const mp4Buffer = await convertGifBuffer(buffer);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Save to /tmp with unique filename
    const filename = `gif2vid-${Date.now()}.mp4`;
    const filepath = join('/tmp', filename);
    await writeFile(filepath, mp4Buffer);

    console.log(`✓ Converted in ${duration}s`);
    console.log(
      `  Input: ${(buffer.length / 1024).toFixed(2)} KB -> Output: ${(mp4Buffer.byteLength / 1024).toFixed(2)} KB`,
    );

    // Return the video URL and stats
    const response = {
      success: true,
      videoUrl: `/api/video/${filename}`,
      filename: filename,
      stats: {
        inputSize: buffer.length,
        outputSize: mp4Buffer.byteLength,
        duration: parseFloat(duration),
        originalFilename: file.name,
      },
    };

    // Clean up after 5 minutes
    setTimeout(async () => {
      try {
        const { unlink } = await import('fs/promises');
        await unlink(filepath);
        console.log(`Cleaned up ${filename}`);
      } catch (err) {
        // File might already be deleted
      }
    }, 5 * 60 * 1000);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Conversion error:', error);
    return NextResponse.json(
      {
        error: 'Conversion failed',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
