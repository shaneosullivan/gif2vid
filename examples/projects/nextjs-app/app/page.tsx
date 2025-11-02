'use client';

import { useState, useRef, ChangeEvent } from 'react';

export default function Home() {
  const [output, setOutput] = useState('Ready to convert...');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [gifFile, setGifFile] = useState<File | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const log = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setOutput((prev) => prev + `\n[${timestamp}] ${message}`);
  };

  const uploadAndConvert = async (file: File) => {
    setOutput('');
    setVideoUrl(null);
    setGifFile(file);
    log(`Uploading ${file.name}...`);
    setUploading(true);

    const formData = new FormData();
    formData.append('gif', file);

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        log(`✗ Error: ${error.message || error.error}`);
        return;
      }

      const result = await response.json();

      log(`✓ Success!`);
      log(`  Server processing time: ${result.stats.duration}s`);
      log(
        `  Input: ${(result.stats.inputSize / 1024).toFixed(2)} KB -> Output: ${(result.stats.outputSize / 1024).toFixed(2)} KB`,
      );
      log(`  Video saved: ${result.filename}`);

      setVideoUrl(result.videoUrl);
    } catch (error) {
      log(`✗ Error: ${error instanceof Error ? error.message : String(error)}`);
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadAndConvert(file);
    }
  };

  const testExistingGif = async () => {
    setOutput('');
    log('Loading test1.gif from server...');

    try {
      const response = await fetch('/test1.gif');
      const blob = await response.blob();
      const file = new File([blob], 'test1.gif', { type: 'image/gif' });

      await uploadAndConvert(file);
    } catch (error) {
      log(`✗ Error loading test file: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleDownload = async () => {
    if (!videoUrl) return;

    setDownloading(true);
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = videoUrl.split('/').pop() || 'video.mp4';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      log(`✗ Download error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="container">
      <header>
        <h1>🎬 gif2vid</h1>
        <p className="subtitle">Server-side conversion with Next.js</p>
        <div className="badge">Next.js App Router</div>
      </header>

      <div className="info">
        <strong>⚡ Next.js:</strong> This example uses Next.js App Router with
        API Routes for server-side conversion. The GIF is uploaded via a POST
        request and converted on the server.
      </div>

      <section>
        <h2>Convert Your GIF</h2>
        <div className="file-input-wrapper">
          <input
            ref={fileInputRef}
            type="file"
            id="gifFile"
            accept=".gif"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <label htmlFor="gifFile">
            📁 {fileInputRef.current?.files?.[0]?.name || 'Select a GIF file: No file chosen'}
          </label>
        </div>
        {uploading && (
          <div className="progress">
            <div className="progress-bar" />
          </div>
        )}
        <p className="note">File is uploaded and converted on the server</p>
      </section>

      <section>
        <h2>Quick Test</h2>
        <button onClick={testExistingGif} disabled={uploading}>
          🚀 Load & Convert test1.gif
        </button>
        <p className="note">Test with the server's sample GIF file</p>
      </section>

      <section>
        <h2>Output</h2>
        <div id="output">{output}</div>
      </section>

      {videoUrl && gifFile && (
        <div className="video-container">
          <div className="comparison">
            <div className="media-box">
              <h3>Original GIF</h3>
              <img src={URL.createObjectURL(gifFile)} alt="Original GIF" />
            </div>
            <div className="media-box">
              <h3>Converted MP4</h3>
              <video controls autoPlay loop>
                <source src={videoUrl} type="video/mp4" />
              </video>
              <br />
              <button className="download-btn" onClick={handleDownload} disabled={downloading}>
                {downloading ? '⬇️ Downloading...' : '⬇️ Download MP4'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
