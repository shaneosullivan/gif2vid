/**
 * Browser-compatible GIF decoder using omggif
 * This module works in both Node.js and browser environments
 */
import * as omggif from 'omggif';

const GifReader = omggif.GifReader;

export interface GifFrame {
  data: Uint8Array; // RGBA pixel data
  delay: number; // milliseconds
  width: number;
  height: number;
}

export interface DecodedGif {
  frames: GifFrame[];
  width: number;
  height: number;
}

/**
 * Decode a GIF buffer into frames
 */
export function decodeGif(
  gifBuffer: Uint8Array | ArrayBuffer | any,
): DecodedGif {
  // Convert to Uint8Array if needed
  let uint8Array: Uint8Array;
  if (gifBuffer instanceof Uint8Array) {
    uint8Array = gifBuffer;
  } else if (gifBuffer instanceof ArrayBuffer) {
    uint8Array = new Uint8Array(gifBuffer);
  } else if (typeof Buffer !== 'undefined' && gifBuffer instanceof Buffer) {
    uint8Array = new Uint8Array(gifBuffer);
  } else if (gifBuffer.buffer instanceof ArrayBuffer) {
    // Handle TypedArray views
    uint8Array = new Uint8Array(
      gifBuffer.buffer,
      gifBuffer.byteOffset,
      gifBuffer.byteLength,
    );
  } else {
    uint8Array = gifBuffer;
  }

  // Parse GIF
  const reader = new GifReader(uint8Array);
  const frames: GifFrame[] = [];

  const width = reader.width;
  const height = reader.height;
  const numFrames = reader.numFrames();

  // Maintain a canvas buffer for frame composition
  // GIF frames may use disposal methods and only contain partial updates
  const canvasBuffer = new Uint8Array(width * height * 4);

  // Initialize canvas with transparent pixels
  for (let i = 0; i < canvasBuffer.length; i += 4) {
    canvasBuffer[i] = 0;     // R
    canvasBuffer[i + 1] = 0; // G
    canvasBuffer[i + 2] = 0; // B
    canvasBuffer[i + 3] = 0; // A (transparent)
  }

  // Decode each frame with proper composition
  for (let i = 0; i < numFrames; i++) {
    const frameInfo = reader.frameInfo(i);

    // Decode frame directly onto the canvas buffer
    // This handles frame composition automatically
    reader.decodeAndBlitFrameRGBA(i, canvasBuffer);

    // Create a copy of the current canvas state for this frame
    const pixelData = new Uint8Array(canvasBuffer);

    frames.push({
      data: pixelData,
      delay: (frameInfo.delay || 10) * 10, // Convert centiseconds to milliseconds
      height,
      width,
    });

    // Handle disposal method for next frame
    // disposal: 0 = unspecified, 1 = do not dispose, 2 = restore to background, 3 = restore to previous
    if (frameInfo.disposal === 2) {
      // Restore to background color (transparent)
      const frameX = frameInfo.x || 0;
      const frameY = frameInfo.y || 0;
      const frameWidth = frameInfo.width;
      const frameHeight = frameInfo.height;

      for (let y = frameY; y < frameY + frameHeight && y < height; y++) {
        for (let x = frameX; x < frameX + frameWidth && x < width; x++) {
          const idx = (y * width + x) * 4;
          canvasBuffer[idx] = 0;
          canvasBuffer[idx + 1] = 0;
          canvasBuffer[idx + 2] = 0;
          canvasBuffer[idx + 3] = 0;
        }
      }
    }
    // disposal 1 (do not dispose) and 0 (unspecified) leave the canvas as-is for next frame
    // disposal 3 (restore to previous) is complex and rarely used, treat as disposal 1
  }

  return {
    frames,
    height,
    width,
  };
}
