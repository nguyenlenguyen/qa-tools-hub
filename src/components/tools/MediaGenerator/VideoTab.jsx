import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Settings, Image as ImageIcon, CheckCircle2, AlertCircle, Download, Loader2, Music, Film } from 'lucide-react';
import { formatBytes } from '../../../utils/helpers.js';
import Card from '../../ui/Card';
import Button from '../../ui/Button';

const VideoTab = () => {
  const [format, setFormat] = useState('mp4');
  const [width, setWidth] = useState(1280);
  const [height, setHeight] = useState(720);
  const [selectedPreset, setSelectedPreset] = useState('720p');
  const [duration, setDuration] = useState(5);
  const fps = 30;
  const [targetSize, setTargetSize] = useState('');
  const [sizeUnit, setSizeUnit] = useState('MB');
  const [customText, setCustomText] = useState('QA TEST VIDEO');

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [resultUrl, setResultUrl] = useState(null);
  const [resultSize, setResultSize] = useState(0);
  const [resultName, setResultName] = useState('');
  const [resultMeta, setResultMeta] = useState(null);
  const [error, setError] = useState('');
  const ffmpegRef = useRef(null);
  const ffmpegLoadedRef = useRef(false);
  const resultUrlRef = useRef(null);

  // formatBytes is now a shared utility defined at the top of the file

  // Cleanup Object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    };
  }, []);

  const loadFFmpeg = async () => {
    if (ffmpegLoadedRef.current) return ffmpegRef.current;
    setProgress('Loading FFmpeg engine (~30MB, first time only)...');
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { fetchFile, toBlobURL } = await import('@ffmpeg/util');
    const ffmpeg = new FFmpeg();
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      workerURL: await toBlobURL(`https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/worker.js`, 'text/javascript'),
    });
    ffmpegRef.current = { ffmpeg, fetchFile };
    ffmpegLoadedRef.current = true;
    return ffmpegRef.current;
  };

  const generateVideo = async () => {
    setIsGenerating(true);
    setError('');
    // Revoke previous Object URL to prevent memory leak
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    setResultUrl(null);
    resultUrlRef.current = null;

    try {
      const w = parseInt(width) || 1280;
      const h = parseInt(height) || 720;
      const dur = parseFloat(duration) || 5;
      const fpsVal = parseInt(fps) || 30;
      const totalFrames = Math.ceil(dur * fpsVal);

      // Render frames to canvas
      setProgress(`Rendering ${totalFrames} frames on canvas...`);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');

      const { ffmpeg, fetchFile } = await loadFFmpeg();
      setProgress('Uploading frames to FFmpeg...');

      for (let f = 0; f < totalFrames; f++) {
        const t = f / fpsVal;

        // Draw frame - always color bars
        const barW = w / 7;
        const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];
        colors.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(i * barW, 0, barW, h); });

        // Overlay text
        const fs = Math.max(16, Math.min(w, h) / 12);
        // Semi-transparent dark band for readability
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(0, h / 2 - fs * 1.4, w, fs * 3);
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${fs}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(customText || 'QA TEST VIDEO', w / 2, h / 2 - fs * 0.4);
        ctx.font = `${fs * 0.55}px monospace`;
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillText(`${w} × ${h} • ${format.toUpperCase()} • ${t.toFixed(2)}s`, w / 2, h / 2 + fs * 0.8);

        // Timecode bar
        const progress_ratio = f / (totalFrames - 1 || 1);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(0, h - 8, w, 8);
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(0, h - 8, w * progress_ratio, 8);

        // Convert frame to PNG blob
        const frameBlob = await new Promise(res => canvas.toBlob(res, 'image/png'));
        const frameData = await fetchFile(frameBlob);
        const frameNum = String(f).padStart(5, '0');
        await ffmpeg.writeFile(`frame${frameNum}.png`, frameData);

        if (f % 10 === 0) setProgress(`Uploading frames: ${f + 1}/${totalFrames}`);
      }

      setProgress('Encoding video with FFmpeg...');

      const codecMap = {
        mp4: ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'fast', '-crf', '23'],
        mov: ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'fast', '-crf', '23'],
        avi: ['-c:v', 'libx264', '-pix_fmt', 'yuv420p'],
        mkv: ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23'],
        webm: ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '30'],
      };
      const mimeMap = {
        mp4: 'video/mp4', mov: 'video/quicktime',
        avi: 'video/x-msvideo', mkv: 'video/x-matroska', webm: 'video/webm'
      };

      const codecArgs = codecMap[format] || codecMap.mp4;
      await ffmpeg.exec([
        '-framerate', String(fpsVal),
        '-i', 'frame%05d.png',
        ...codecArgs,
        '-r', String(fpsVal),
        `output.${format}`
      ]);

      const data = await ffmpeg.readFile(`output.${format}`);

      // Clean up FFmpeg virtual filesystem to free WASM memory
      setProgress('Cleaning up temporary files...');
      for (let f = 0; f < totalFrames; f++) {
        try { await ffmpeg.deleteFile(`frame${String(f).padStart(5, '0')}.png`); } catch { }
      }
      try { await ffmpeg.deleteFile(`output.${format}`); } catch { }

      let blob = new Blob([data.buffer], { type: mimeMap[format] || 'video/mp4' });

      if (targetSize && parseFloat(targetSize) > 0) {
        const multiplier = sizeUnit === 'MB' ? 1024 * 1024 : 1024;
        const targetBytes = Math.floor(parseFloat(targetSize) * multiplier);
        if (targetBytes > blob.size) {
          const padding = new Uint8Array(targetBytes - blob.size);
          blob = new Blob([blob, padding], { type: blob.type });
        } else if (targetBytes < blob.size) {
          setError(`Warning: Original size (${formatBytes(blob.size)}) is already larger than target size.`);
        }
      }

      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      const name = `qa_video_${w}x${h}_${dur}s_${formatBytes(blob.size).replace(' ', '')}.${format}`;
      setResultUrl(url); setResultSize(blob.size); setResultName(name);
      setResultMeta({ format, width: w, height: h, duration: dur, size: blob.size });
      setProgress('');
    } catch (err) {
      console.error(err);
      setError('Generation failed: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl; a.download = resultName;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
  };

  const FORMATS = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
  const PRESETS = [
    { label: '360p', w: 640, h: 360 },
    { label: '480p', w: 854, h: 480 },
    { label: '720p', w: 1280, h: 720 },
    { label: '1080p', w: 1920, h: 1080 },
    { label: 'Custom', w: null, h: null },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <div className="xl:col-span-5 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 space-y-5">
          <h2 className="text-lg font-semibold flex items-center gap-2 border-b pb-3">
            <Settings size={18} className="text-gray-400" />
            Video Settings
          </h2>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Format</label>
            <div className="flex flex-wrap gap-2">
              {FORMATS.map(f => (
                <button key={f} onClick={() => setFormat(f)}
                  className={`py-1.5 px-3 text-sm font-medium rounded-lg border transition-colors ${format === f ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Resolution</label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button key={p.label}
                  onClick={() => {
                    setSelectedPreset(p.label);
                    if (p.w) { setWidth(p.w); setHeight(p.h); }
                  }}
                  className={`py-1.5 px-3 text-sm font-medium rounded-lg border transition-colors ${selectedPreset === p.label ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Width (px)</label>
                <input type="number" value={width} onChange={e => setWidth(e.target.value)}
                  disabled={selectedPreset !== 'Custom'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-400" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Height (px)</label>
                <input type="number" value={height} onChange={e => setHeight(e.target.value)}
                  disabled={selectedPreset !== 'Custom'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-400" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Duration (seconds)</label>
              <input type="number" value={duration} min="1" max="30"
                onChange={e => setDuration(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Size (Optional)</label>
              <div className="flex gap-2">
                <input type="number" value={targetSize}
                  onChange={e => setTargetSize(e.target.value)}
                  className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                <select value={sizeUnit} onChange={e => setSizeUnit(e.target.value)}
                  className="w-20 shrink-0 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="KB">KB</option>
                  <option value="MB">MB</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Custom Text</label>
            <input type="text" value={customText} onChange={e => setCustomText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          <button onClick={generateVideo} disabled={isGenerating}
            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors focus:ring-4 focus:ring-blue-200 disabled:opacity-70 flex justify-center items-center gap-2 mt-2">
            {isGenerating ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : <><Film size={18} /> Generate Video</>}
          </button>
        </div>
      </div>

      <div className="xl:col-span-7 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex flex-col h-full">
          <h2 className="text-lg font-semibold flex items-center gap-2 border-b pb-3 mb-4">
            <CheckCircle2 size={18} className="text-green-500" />
            Result
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-start gap-2 text-sm">
              <AlertCircle size={16} className="mt-0.5 shrink-0" /><p>{error}</p>
            </div>
          )}

          <div className="flex-1 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center p-6 min-h-[260px]">
            {isGenerating ? (
              <div className="text-center space-y-3">
                <Loader2 size={36} className="animate-spin text-blue-500 mx-auto" />
                <p className="text-sm text-gray-500 max-w-xs text-center">{progress}</p>
              </div>
            ) : resultUrl ? (
              <video controls src={resultUrl} className="max-w-full max-h-[380px] rounded-lg shadow-md" />
            ) : (
              <div className="text-center text-gray-400 space-y-2">
                <Film size={36} className="mx-auto opacity-30" />
                <p className="text-sm">Configure settings and click Generate</p>
              </div>
            )}
          </div>

          {resultUrl && !isGenerating && resultMeta && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="flex flex-wrap gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Format</p>
                  <p className="font-medium text-gray-900 uppercase">.{resultMeta.format}</p>
                </div>
                <div className="w-px bg-gray-300 hidden sm:block"></div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Resolution</p>
                  <p className="font-medium text-gray-900">{resultMeta.width}×{resultMeta.height}</p>
                </div>
                <div className="w-px bg-gray-300 hidden sm:block"></div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Duration</p>
                  <p className="font-medium text-gray-900">{resultMeta.duration}s</p>
                </div>
                <div className="w-px bg-gray-300 hidden sm:block"></div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-semibold">File Size</p>
                  <p className="font-medium text-gray-900">{formatBytes(resultMeta.size)}</p>
                </div>
              </div>
              <button onClick={handleDownload}
                className="w-full sm:w-auto py-2.5 px-6 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                <Download size={18} /> Download
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default VideoTab;
