// Web Worker for gif2vid conversion
// This runs in a separate thread to avoid blocking the main UI

import { convertGifBuffer } from 'gif2vid';

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
  const { id, gifBuffer } = event.data;

  try {
    // Send progress update
    self.postMessage({
      id,
      type: 'progress',
      message: 'Converting GIF to MP4...',
    });

    // Convert the GIF to MP4
    const mp4Buffer = await convertGifBuffer(new Uint8Array(gifBuffer));

    // Send the result back to the main thread
    self.postMessage(
      {
        id,
        type: 'success',
        mp4Buffer: mp4Buffer.buffer,
        inputSize: gifBuffer.byteLength,
        outputSize: mp4Buffer.byteLength,
      },
      { transfer: [mp4Buffer.buffer] }, // Transfer ownership for better performance
    );
  } catch (error) {
    // Send error back to main thread
    self.postMessage({
      id,
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// Signal that the worker is ready
self.postMessage({ type: 'ready' });
