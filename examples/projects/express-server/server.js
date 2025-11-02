import express from 'express';
import multer from 'multer';
import { convertGifBuffer } from 'gif2vid';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3336;

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/gif') {
      cb(null, true);
    } else {
      cb(new Error('Only GIF files are allowed'));
    }
  },
});

// Serve static files from public directory
app.use(express.static('public'));

// Serve converted videos from /tmp
app.use('/videos', express.static('/tmp'));

// Convert GIF to MP4
app.post('/convert', upload.single('gif'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No GIF file provided' });
    }

    console.log(`Converting ${req.file.originalname}...`);
    const startTime = Date.now();

    // Convert GIF to MP4
    const mp4Buffer = await convertGifBuffer(req.file.buffer);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Save to /tmp with unique filename
    const filename = `gif2vid-${Date.now()}.mp4`;
    const filepath = join('/tmp', filename);
    await writeFile(filepath, mp4Buffer);

    console.log(`✓ Converted in ${duration}s`);
    console.log(
      `  Input: ${(req.file.size / 1024).toFixed(2)} KB -> Output: ${(mp4Buffer.byteLength / 1024).toFixed(2)} KB`,
    );

    // Return the video URL and stats
    res.json({
      success: true,
      videoUrl: `/videos/${filename}`,
      filename: filename,
      stats: {
        inputSize: req.file.size,
        outputSize: mp4Buffer.byteLength,
        duration: parseFloat(duration),
        originalFilename: req.file.originalname,
      },
    });

    // Clean up after 5 minutes
    setTimeout(async () => {
      try {
        await unlink(filepath);
        console.log(`Cleaned up ${filename}`);
      } catch (err) {
        // File might already be deleted
      }
    }, 5 * 60 * 1000);
  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({
      error: 'Conversion failed',
      message: error.message,
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'gif2vid-server' });
});

app.listen(PORT, () => {
  console.log(`gif2vid Express server running on http://localhost:${PORT}`);
  console.log('Upload a GIF to convert it to MP4');
});
