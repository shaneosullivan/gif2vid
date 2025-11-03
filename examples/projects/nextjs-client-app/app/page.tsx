'use client';

import { useState, useRef, useEffect } from 'react';

// Type for gif2vid module
type Gif2VidModule = {
  convertGifBuffer: (buffer: Uint8Array) => Promise<Uint8Array>;
};

export default function Home() {
  const [output, setOutput] = useState<string>('Loading gif2vid...');
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [stats, setStats] = useState<{
    inputSize: number;
    outputSize: number;
    duration: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gif2vidRef = useRef<Gif2VidModule | null>(null);

  // Dynamically import gif2vid on client side only
  useEffect(() => {
    import('gif2vid/browser')
      .then((module) => {
        gif2vidRef.current = module;
        setIsReady(true);
        setOutput('Ready to convert...');
      })
      .catch((error) => {
        setOutput(`Error loading gif2vid: ${error.message}`);
        console.error('Failed to load gif2vid:', error);
      });
  }, []);

  const log = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setOutput((prev) => `${prev}\n[${timestamp}] ${message}`);
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setOutput('');
    setGifUrl(null);
    setVideoUrl(null);
    setStats(null);

    log(`Loading ${file.name}...`);

    const gifObjectUrl = URL.createObjectURL(file);
    setGifUrl(gifObjectUrl);

    await convertFile(file);
  };

  const convertFile = async (file: File) => {
    if (!gif2vidRef.current) {
      log('Error: gif2vid not loaded yet');
      return;
    }

    setIsConverting(true);
    log(`Converting ${file.name}...`);
    const startTime = performance.now();

    try {
      const arrayBuffer = await file.arrayBuffer();
      const gifBuffer = new Uint8Array(arrayBuffer);

      // Convert on the client side using WebCodecs
      const mp4Buffer = await gif2vidRef.current.convertGifBuffer(gifBuffer);

      const duration = ((performance.now() - startTime) / 1000).toFixed(2);

      log('✓ Success!');
      log(`  Input: ${(gifBuffer.byteLength / 1024).toFixed(2)} KB`);
      log(`  Output: ${(mp4Buffer.byteLength / 1024).toFixed(2)} KB`);
      log(`  Duration: ${duration}s`);
      log(
        `  Savings: ${(((gifBuffer.byteLength - mp4Buffer.byteLength) / gifBuffer.byteLength) * 100).toFixed(1)}%`,
      );

      setStats({
        inputSize: gifBuffer.byteLength,
        outputSize: mp4Buffer.byteLength,
        duration: parseFloat(duration),
      });

      // Create video blob URL
      const videoBlob = new Blob([mp4Buffer], { type: 'video/mp4' });
      const videoObjectUrl = URL.createObjectURL(videoBlob);
      setVideoUrl(videoObjectUrl);
    } catch (error) {
      log(`✗ Error: ${error instanceof Error ? error.message : String(error)}`);
      console.error(error);
    } finally {
      setIsConverting(false);
    }
  };

  const loadTestGif = async () => {
    setOutput('');
    setGifUrl(null);
    setVideoUrl(null);
    setStats(null);
    log('Loading test1.gif...');

    try {
      const response = await fetch('/test1.gif');
      const arrayBuffer = await response.arrayBuffer();
      const file = new File([arrayBuffer], 'test1.gif', { type: 'image/gif' });

      const gifObjectUrl = URL.createObjectURL(file);
      setGifUrl(gifObjectUrl);

      await convertFile(file);
    } catch (error) {
      log(`✗ Error loading test file: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl p-8">
        <header className="text-center mb-8 pb-8 border-b-2 border-gray-200">
          <h1 className="text-5xl font-bold text-purple-600 mb-2">
            🎬 gif2vid
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            Client-Side GIF to MP4 Conversion with Next.js
          </p>
          <span className="inline-block bg-green-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
            Client-Side Processing (No Server!)
          </span>
        </header>

        <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <p className="text-gray-700">
            <strong className="text-blue-700">⚡ Browser Processing:</strong>{' '}
            Converts GIFs to MP4 entirely in your browser using WebCodecs API.
            No uploads, no server, complete privacy!
          </p>
        </div>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Convert Your GIF
          </h2>
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept=".gif"
              onChange={handleFileSelect}
              className="absolute left-[-9999px]"
              id="gifFile"
              disabled={!isReady || isConverting}
            />
            <label
              htmlFor="gifFile"
              className={`flex items-center justify-center p-8 border-4 border-dashed rounded-xl transition-all cursor-pointer text-lg font-medium ${
                !isReady || isConverting
                  ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'border-purple-600 bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white'
              }`}
            >
              📁 {!isReady ? 'Loading...' : isConverting ? 'Converting...' : 'Select a GIF file'}
            </label>
          </div>
          <p className="mt-4 text-sm text-gray-600 bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded">
            Converts in your browser using the WebCodecs API - no server upload
            required!
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Quick Test
          </h2>
          <button
            onClick={loadTestGif}
            disabled={!isReady || isConverting}
            className={`w-full px-8 py-4 text-lg font-semibold rounded-xl transition-all ${
              !isReady || isConverting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg hover:-translate-y-1'
            }`}
          >
            🚀 Load & Convert test1.gif
          </button>
          <p className="mt-4 text-sm text-gray-600 bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded">
            Test with the included sample GIF file
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Output</h2>
          <pre className="bg-gray-100 p-6 rounded-xl font-mono text-sm leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto border border-gray-300">
            {output}
          </pre>
        </section>

        {gifUrl && videoUrl && (
          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Comparison
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-purple-600 mb-4">
                  Original GIF
                </h3>
                <img
                  src={gifUrl}
                  alt="Original GIF"
                  className="max-w-full rounded-xl shadow-lg bg-black"
                />
                {stats && (
                  <p className="mt-2 text-gray-600">
                    {(stats.inputSize / 1024).toFixed(2)} KB
                  </p>
                )}
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-purple-600 mb-4">
                  Converted MP4
                </h3>
                <video
                  controls
                  autoPlay
                  loop
                  className="max-w-full rounded-xl shadow-lg bg-black"
                >
                  <source src={videoUrl} type="video/mp4" />
                </video>
                {stats && (
                  <>
                    <p className="mt-2 text-gray-600">
                      {(stats.outputSize / 1024).toFixed(2)} KB
                    </p>
                    <a
                      href={videoUrl}
                      download="converted.mp4"
                      className="inline-block mt-3 px-6 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-all"
                    >
                      ⬇️ Download MP4
                    </a>
                  </>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
