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

  // Track previous frame for disposal method 3
  let previousCanvasBuffer: Uint8Array | null = null;

  // Decode each frame with proper composition
  for (let i = 0; i < numFrames; i++) {
    const frameInfo = reader.frameInfo(i);

    // Handle disposal method from PREVIOUS frame (before decoding current frame)
    if (i > 0) {
      const prevFrameInfo = reader.frameInfo(i - 1);

      // disposal: 0 = unspecified, 1 = do not dispose, 2 = restore to background, 3 = restore to previous
      if (prevFrameInfo.disposal === 2) {
        // Restore to background color (transparent/white)
        const frameX = prevFrameInfo.x || 0;
        const frameY = prevFrameInfo.y || 0;
        const frameWidth = prevFrameInfo.width;
        const frameHeight = prevFrameInfo.height;

        for (let y = frameY; y < frameY + frameHeight && y < height; y++) {
          for (let x = frameX; x < frameX + frameWidth && x < width; x++) {
            const idx = (y * width + x) * 4;
            canvasBuffer[idx] = 255;     // R - white background
            canvasBuffer[idx + 1] = 255; // G
            canvasBuffer[idx + 2] = 255; // B
            canvasBuffer[idx + 3] = 255; // A - fully opaque
          }
        }
      } else if (prevFrameInfo.disposal === 3 && previousCanvasBuffer) {
        // Restore to previous state
        canvasBuffer.set(previousCanvasBuffer);
      }
      // disposal 1 (do not dispose) and 0 (unspecified) leave the canvas as-is
    }

    // Save canvas state before decoding (for disposal method 3)
    if (frameInfo.disposal === 3) {
      previousCanvasBuffer = new Uint8Array(canvasBuffer);
    }

    // Decode frame directly onto the canvas buffer
    reader.decodeAndBlitFrameRGBA(i, canvasBuffer);

    // Create a copy of the current canvas state for this frame
    const pixelData = new Uint8Array(canvasBuffer);

    frames.push({
      data: pixelData,
      delay: (frameInfo.delay || 10) * 10, // Convert centiseconds to milliseconds
      height,
      width,
    });
  }

  return {
    frames,
    height,
    width,
  };
}
