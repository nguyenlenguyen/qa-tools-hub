import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Download, Image as ImageIcon, Settings, AlertCircle, CheckCircle2,
  Menu, X, Type, Code, FileJson, ChevronRight, Copy, Trash2,
  Maximize2, Minimize2, Check, Clock, CalendarDays, RefreshCw, ArrowRightLeft, Palette,
  Binary, AlignLeft, GitCompare, Network, Search, Music, Video, Film, Loader2
} from 'lucide-react';

// ==========================================
// UTILS
// ==========================================
const copyTextToClipboard = (text) => {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand('copy');
  } catch (err) {
    console.error('Failed to copy', err);
  }
  document.body.removeChild(textArea);
};

// ==========================================
// TOOL 1: MEDIA GENERATOR (Image + Audio + Video)
// ==========================================

// --- Tab: Image ---
const ImageTab = () => {
  const [width, setWidth] = useState(500);
  const [height, setHeight] = useState(500);
  const [format, setFormat] = useState('png');
  const [targetSize, setTargetSize] = useState('');
  const [sizeUnit, setSizeUnit] = useState('MB');
  const [bgColor, setBgColor] = useState('#3b82f6');
  const [textColor, setTextColor] = useState('#ffffff');
  const [customText, setCustomText] = useState('QA TEST IMAGE');

  const [previewUrl, setPreviewUrl] = useState(null);
  const [actualSize, setActualSize] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const canvasRef = useRef(null);

  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const generateImage = () => {
    setIsGenerating(true);
    setError('');

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      canvas.width = parseInt(width) || 100;
      canvas.height = parseInt(height) || 100;

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = textColor;
      const fontSize = Math.max(12, Math.min(canvas.width, canvas.height) / 10);
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const displayText = customText || `${canvas.width}x${canvas.height}`;
      ctx.fillText(displayText, canvas.width / 2, canvas.height / 2 - fontSize / 2);
      ctx.fillText(`${canvas.width} x ${canvas.height} • ${format.toUpperCase()}`, canvas.width / 2, canvas.height / 2 + fontSize / 2);

      const mimeType = `image/${format === 'jpg' ? 'jpeg' : format}`;

      canvas.toBlob((blob) => {
        if (!blob) {
          setError('Cannot generate image. Please try again.');
          setIsGenerating(false);
          return;
        }

        let finalBlob = blob;

        if (targetSize && parseFloat(targetSize) > 0) {
          const multiplier = sizeUnit === 'MB' ? 1024 * 1024 : 1024;
          const targetBytes = Math.floor(parseFloat(targetSize) * multiplier);

          if (targetBytes > blob.size) {
            const paddingSize = targetBytes - blob.size;
            try {
              const padding = new Uint8Array(paddingSize);
              finalBlob = new Blob([blob, padding], { type: mimeType });
            } catch (err) {
              setError('Requested size is too large, browser memory insufficient.');
              setIsGenerating(false);
              return;
            }
          } else if (targetBytes < blob.size) {
            setError(`Warning: Original size (${formatBytes(blob.size)}) is already larger than target size.`);
          }
        }

        if (previewUrl) URL.revokeObjectURL(previewUrl);
        const newUrl = URL.createObjectURL(finalBlob);

        setPreviewUrl(newUrl);
        setActualSize(finalBlob.size);
        setIsGenerating(false);

      }, mimeType, 0.9);

    } catch (err) {
      setError('An error occurred during image generation.');
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    generateImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownload = () => {
    if (!previewUrl) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = `qa_test_image_${width}x${height}_${formatBytes(actualSize).replace(' ', '')}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <div className="xl:col-span-5 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 space-y-5">
          <h2 className="text-lg font-semibold flex items-center gap-2 border-b pb-3">
            <Settings size={18} className="text-gray-400" />
            Image Settings
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Width (px)</label>
              <input type="number" value={width} onChange={(e) => setWidth(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Height (px)</label>
              <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">File Format</label>
            <div className="grid grid-cols-3 gap-2">
              {['png', 'jpg', 'webp'].map(fmt => (
                <button key={fmt} onClick={() => setFormat(fmt)} className={`py-2 px-3 text-sm font-medium rounded-lg border transition-colors ${format === fmt ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 sm:col-span-6 space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Size (Optional)</label>
              <div className="flex gap-2">
                <input type="number" placeholder="Original" value={targetSize} onChange={(e) => setTargetSize(e.target.value)} className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" />
                <select value={sizeUnit} onChange={(e) => setSizeUnit(e.target.value)} className="w-20 shrink-0 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-shadow">
                  <option value="KB">KB</option>
                  <option value="MB">MB</option>
                </select>
              </div>
            </div>

            <div className="col-span-6 sm:col-span-3 space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Background</label>
              <div className="flex items-center">
                <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="h-[42px] w-full p-1 border border-gray-300 rounded-lg cursor-pointer" />
              </div>
            </div>

            <div className="col-span-6 sm:col-span-3 space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Text Color</label>
              <div className="flex items-center">
                <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="h-[42px] w-full p-1 border border-gray-300 rounded-lg cursor-pointer" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <label className="text-sm font-medium text-gray-700">Custom Text</label>
            <input type="text" value={customText} onChange={(e) => setCustomText(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" />
          </div>

          <button onClick={generateImage} disabled={isGenerating} className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors focus:ring-4 focus:ring-blue-200 disabled:opacity-70 flex justify-center items-center gap-2 mt-4">
            <ImageIcon size={18} />
            {isGenerating ? 'Generating...' : 'Generate Image'}
          </button>
        </div>
      </div>

      <div className="xl:col-span-7 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex flex-col h-full">
          <h2 className="text-lg font-semibold flex items-center gap-2 border-b pb-3 mb-4">
            <CheckCircle2 size={18} className="text-green-500" />
            Result (Preview)
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-start gap-2 text-sm">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="flex-1 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl overflow-hidden flex flex-col items-center justify-center p-4 relative min-h-[300px]">
            <canvas ref={canvasRef} className="hidden" />
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full max-h-[400px] object-contain shadow-md rounded border border-gray-200"
                style={{
                  backgroundImage: format === 'png' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none',
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                }}
              />
            ) : (
              <p className="text-gray-400">No image generated yet</p>
            )}
          </div>

          {previewUrl && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="flex flex-wrap gap-4 w-full sm:w-auto">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Actual Size</p>
                  <p className="font-medium text-gray-900">{width}x{height} px</p>
                </div>
                <div className="w-px bg-gray-300 hidden sm:block"></div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Format</p>
                  <p className="font-medium text-gray-900 uppercase">.{format}</p>
                </div>
                <div className="w-px bg-gray-300 hidden sm:block"></div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-semibold">File Size</p>
                  <p className={`font-medium ${targetSize ? 'text-blue-600' : 'text-gray-900'}`}>
                    {formatBytes(actualSize)}
                  </p>
                </div>
              </div>

              <button onClick={handleDownload} className="w-full sm:w-auto py-2.5 px-6 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 shadow-sm">
                <Download size={18} />
                Download
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Tab: Audio ---
const AudioTab = () => {
  const [format, setFormat] = useState('wav');
  const [duration, setDuration] = useState(5);
  const [sampleRate, setSampleRate] = useState(44100);
  const [channels] = useState(2);
  const [targetSize, setTargetSize] = useState('');
  const [sizeUnit, setSizeUnit] = useState('MB');
  const [audioType, setAudioType] = useState('noise');

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [resultUrl, setResultUrl] = useState(null);
  const [resultSize, setResultSize] = useState(0);
  const [resultName, setResultName] = useState('');
  const [error, setError] = useState('');
  const ffmpegRef = useRef(null);
  const ffmpegLoadedRef = useRef(false);

  const formatBytes = (bytes) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

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

  const audioTypeRef = useRef(audioType);
  const sampleRateRef = useRef(sampleRate);
  const formatRef = useRef(format);
  const durationRef = useRef(duration);
  const targetSizeRef = useRef(targetSize);
  const sizeUnitRef = useRef(sizeUnit);

  useEffect(() => { audioTypeRef.current = audioType; }, [audioType]);
  useEffect(() => { sampleRateRef.current = sampleRate; }, [sampleRate]);
  useEffect(() => { formatRef.current = format; }, [format]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { targetSizeRef.current = targetSize; }, [targetSize]);
  useEffect(() => { sizeUnitRef.current = sizeUnit; }, [sizeUnit]);

  const generateAudio = async () => {
    setIsGenerating(true);
    setError('');
    setResultUrl(null);

    // Read latest values from refs to avoid stale closure
    const currentAudioType = audioTypeRef.current;
    const currentSampleRate = parseInt(sampleRateRef.current);
    const currentFormat = formatRef.current;
    const currentDuration = parseFloat(durationRef.current);
    const currentTargetSize = targetSizeRef.current;
    const currentSizeUnit = sizeUnitRef.current;

    try {
      setProgress('Generating audio samples...');
      const ch = 2;
      const numSamples = Math.floor(currentSampleRate * currentDuration);

      const offlineCtx = new OfflineAudioContext(ch, numSamples, currentSampleRate);

      if (currentAudioType === 'silence') {
        // silence: render empty buffer
      } else if (currentAudioType === 'noise') {
        const bufferSource = offlineCtx.createBufferSource();
        const noiseBuffer = offlineCtx.createBuffer(ch, numSamples, currentSampleRate);
        for (let c = 0; c < ch; c++) {
          const data = noiseBuffer.getChannelData(c);
          for (let i = 0; i < numSamples; i++) data[i] = Math.random() * 2 - 1;
        }
        bufferSource.buffer = noiseBuffer;
        bufferSource.connect(offlineCtx.destination);
        bufferSource.start(0);
      } else if (currentAudioType === 'beep') {
        for (let b = 0; b < 3; b++) {
          const osc = offlineCtx.createOscillator();
          const gain = offlineCtx.createGain();
          osc.frequency.value = 440;
          osc.connect(gain);
          gain.connect(offlineCtx.destination);
          const t = b * (currentDuration / 3);
          osc.start(t);
          osc.stop(t + currentDuration / 6);
        }
      } else {
        // sine, square, sawtooth, triangle
        const osc = offlineCtx.createOscillator();
        osc.type = currentAudioType;
        osc.frequency.setValueAtTime(440, 0);
        osc.connect(offlineCtx.destination);
        osc.start(0);
        osc.stop(currentDuration);
      }

      const rendered = await offlineCtx.startRendering();

      if (currentFormat === 'wav') {
        setProgress('Encoding WAV...');
        const numCh = rendered.numberOfChannels;
        const length = rendered.length;
        const bitsPerSample = 16;
        const byteRate = currentSampleRate * numCh * bitsPerSample / 8;
        const blockAlign = numCh * bitsPerSample / 8;
        const dataSize = length * numCh * bitsPerSample / 8;
        const buffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(buffer);
        const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
        writeStr(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true);
        writeStr(8, 'WAVE'); writeStr(12, 'fmt ');
        view.setUint32(16, 16, true); view.setUint16(20, 1, true);
        view.setUint16(22, numCh, true); view.setUint32(24, currentSampleRate, true);
        view.setUint32(28, byteRate, true); view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitsPerSample, true); writeStr(36, 'data');
        view.setUint32(40, dataSize, true);
        let offset = 44;
        for (let i = 0; i < length; i++) {
          for (let c = 0; c < numCh; c++) {
            const s = Math.max(-1, Math.min(1, rendered.getChannelData(c)[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            offset += 2;
          }
        }
        let finalBuffer = buffer;
        if (currentTargetSize && parseFloat(currentTargetSize) > 0) {
          const multiplier = currentSizeUnit === 'MB' ? 1024 * 1024 : 1024;
          const targetBytes = Math.floor(parseFloat(currentTargetSize) * multiplier);
          if (targetBytes > buffer.byteLength) {
            const padding = new Uint8Array(targetBytes - buffer.byteLength);
            finalBuffer = new Blob([buffer, padding], { type: 'audio/wav' });
          }
        }
        const blob = finalBuffer instanceof Blob ? finalBuffer : new Blob([finalBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        setResultUrl(url); setResultSize(blob.size);
        setResultName(`qa_audio_${currentDuration}s_${formatBytes(blob.size).replace(' ', '')}.wav`);
      } else {
        setProgress('Loading FFmpeg...');
        const { ffmpeg, fetchFile } = await loadFFmpeg();
        setProgress('Encoding with FFmpeg...');
        const numCh = rendered.numberOfChannels;
        const length = rendered.length;
        const pcmData = new Float32Array(length * numCh);
        for (let i = 0; i < length; i++) {
          for (let c = 0; c < numCh; c++) {
            pcmData[i * numCh + c] = rendered.getChannelData(c)[i];
          }
        }
        const pcmBlob = new Blob([pcmData.buffer], { type: 'application/octet-stream' });
        await ffmpeg.writeFile('input.pcm', await fetchFile(pcmBlob));
        const codecMap = { mp3: 'libmp3lame', aac: 'aac', ogg: 'libvorbis', flac: 'flac' };
        const mimeMap = { mp3: 'audio/mpeg', aac: 'audio/aac', ogg: 'audio/ogg', flac: 'audio/flac' };
        const codec = codecMap[currentFormat] || 'libmp3lame';
        await ffmpeg.exec([
          '-f', 'f32le', '-ar', String(currentSampleRate), '-ac', String(numCh),
          '-i', 'input.pcm', '-c:a', codec, '-b:a', '192k',
          `output.${currentFormat}`
        ]);
        const data = await ffmpeg.readFile(`output.${currentFormat}`);
        let blob = new Blob([data.buffer], { type: mimeMap[currentFormat] || 'audio/mpeg' });
        if (currentTargetSize && parseFloat(currentTargetSize) > 0) {
          const multiplier = currentSizeUnit === 'MB' ? 1024 * 1024 : 1024;
          const targetBytes = Math.floor(parseFloat(currentTargetSize) * multiplier);
          if (targetBytes > blob.size) {
            blob = new Blob([blob, new Uint8Array(targetBytes - blob.size)], { type: blob.type });
          }
        }
        const url = URL.createObjectURL(blob);
        setResultUrl(url); setResultSize(blob.size);
        setResultName(`qa_audio_${currentDuration}s_${formatBytes(blob.size).replace(' ', '')}.${currentFormat}`);
      }
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

  const FORMATS = ['wav', 'mp3', 'aac', 'ogg', 'flac'];
  const AUDIO_TYPES = [
    { value: 'sine', label: 'Sine Wave' },
    { value: 'square', label: 'Square Wave' },
    { value: 'sawtooth', label: 'Sawtooth' },
    { value: 'triangle', label: 'Triangle' },
    { value: 'noise', label: 'White Noise' },
    { value: 'beep', label: 'Beep x3' },
    { value: 'silence', label: 'Silence' },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <div className="xl:col-span-5 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 space-y-5">
          <h2 className="text-lg font-semibold flex items-center gap-2 border-b pb-3">
            <Settings size={18} className="text-gray-400" />
            Audio Settings
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

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Audio Content</label>
            <select value={audioType} onChange={e => setAudioType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
              {AUDIO_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Sample Rate</label>
            <div className="flex flex-wrap gap-2">
              {[8000, 22050, 44100, 48000].map(sr => (
                <button key={sr} onClick={() => setSampleRate(sr)}
                  className={`py-1.5 px-3 text-sm font-medium rounded-lg border transition-colors ${sampleRate === sr ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {sr >= 1000 ? `${sr / 1000}kHz` : `${sr}Hz`}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Duration (seconds)</label>
              <input type="number" value={duration} min="1" max="300"
                onChange={e => setDuration(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Target Size (Optional)</label>
              <div className="flex gap-2">
                <input type="number" placeholder="Original" value={targetSize}
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

          <button onClick={generateAudio} disabled={isGenerating}
            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors focus:ring-4 focus:ring-blue-200 disabled:opacity-70 flex justify-center items-center gap-2 mt-2">
            {isGenerating ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : <><Music size={18} /> Generate Audio</>}
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
                <p className="text-sm text-gray-500">{progress}</p>
              </div>
            ) : resultUrl ? (
              <div className="w-full space-y-4">
                <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <Music size={28} className="text-blue-500 shrink-0" />
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{resultName}</p>
                    <p className="text-xs text-gray-500">{formatBytes(resultSize)}</p>
                  </div>
                </div>
                <audio controls src={resultUrl} className="w-full" />
              </div>
            ) : (
              <div className="text-center text-gray-400 space-y-2">
                <Music size={36} className="mx-auto opacity-30" />
                <p className="text-sm">Configure settings and click Generate</p>
              </div>
            )}
          </div>

          {resultUrl && !isGenerating && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="flex flex-wrap gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Format</p>
                  <p className="font-medium text-gray-900 uppercase">.{format}</p>
                </div>
                <div className="w-px bg-gray-300 hidden sm:block"></div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Duration</p>
                  <p className="font-medium text-gray-900">{duration}s</p>
                </div>
                <div className="w-px bg-gray-300 hidden sm:block"></div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-semibold">File Size</p>
                  <p className="font-medium text-gray-900">{formatBytes(resultSize)}</p>
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

// --- Tab: Video ---
const VideoTab = () => {
  const [format, setFormat] = useState('mp4');
  const [width, setWidth] = useState(1280);
  const [height, setHeight] = useState(720);
  const [selectedPreset, setSelectedPreset] = useState('720p');
  const [duration, setDuration] = useState(5);
  const [fps, setFps] = useState(30);
  const [targetSize, setTargetSize] = useState('');
  const [sizeUnit, setSizeUnit] = useState('MB');
  const [customText, setCustomText] = useState('QA TEST VIDEO');

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [resultUrl, setResultUrl] = useState(null);
  const [resultSize, setResultSize] = useState(0);
  const [resultName, setResultName] = useState('');
  const [error, setError] = useState('');
  const ffmpegRef = useRef(null);
  const ffmpegLoadedRef = useRef(false);

  const formatBytes = (bytes) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

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
    setResultUrl(null);

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
      let blob = new Blob([data.buffer], { type: mimeMap[format] || 'video/mp4' });

      if (targetSize && parseFloat(targetSize) > 0) {
        const multiplier = sizeUnit === 'MB' ? 1024 * 1024 : 1024;
        const targetBytes = Math.floor(parseFloat(targetSize) * multiplier);
        if (targetBytes > blob.size) {
          const padding = new Uint8Array(targetBytes - blob.size);
          blob = new Blob([blob, padding], { type: blob.type });
        }
      }

      const url = URL.createObjectURL(blob);
      const name = `qa_video_${w}x${h}_${dur}s_${formatBytes(blob.size).replace(' ', '')}.${format}`;
      setResultUrl(url); setResultSize(blob.size); setResultName(name);
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
              <label className="text-sm font-medium text-gray-700">Frame Rate (FPS)</label>
              <select value={fps} onChange={e => setFps(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                {[15, 24, 30, 60].map(f => <option key={f} value={f}>{f} fps</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Custom Text</label>
            <input type="text" value={customText} onChange={e => setCustomText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Target File Size (Optional)</label>
            <div className="flex gap-2">
              <input type="number" placeholder="Original" value={targetSize}
                onChange={e => setTargetSize(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              <select value={sizeUnit} onChange={e => setSizeUnit(e.target.value)}
                className="w-20 shrink-0 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                <option value="KB">KB</option>
                <option value="MB">MB</option>
              </select>
            </div>
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

          {resultUrl && !isGenerating && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="flex flex-wrap gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Format</p>
                  <p className="font-medium text-gray-900 uppercase">.{format}</p>
                </div>
                <div className="w-px bg-gray-300 hidden sm:block"></div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Resolution</p>
                  <p className="font-medium text-gray-900">{width}×{height}</p>
                </div>
                <div className="w-px bg-gray-300 hidden sm:block"></div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Duration</p>
                  <p className="font-medium text-gray-900">{duration}s</p>
                </div>
                <div className="w-px bg-gray-300 hidden sm:block"></div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-semibold">File Size</p>
                  <p className="font-medium text-gray-900">{formatBytes(resultSize)}</p>
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

// --- Main MediaGenerator wrapper with tabs ---
const MediaGenerator = () => {
  const [activeTab, setActiveTab] = useState('image');

  const tabs = [
    { id: 'image', label: 'Image', icon: ImageIcon },
    { id: 'audio', label: 'Audio', icon: Music },
    { id: 'video', label: 'Video', icon: Film },
  ];

  return (
    <div className="space-y-6">
      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Keep all tabs mounted to prevent cancelling ongoing generation */}
      <div style={{ display: activeTab === 'image' ? 'block' : 'none' }}><ImageTab /></div>
      <div style={{ display: activeTab === 'audio' ? 'block' : 'none' }}><AudioTab /></div>
      <div style={{ display: activeTab === 'video' ? 'block' : 'none' }}><VideoTab /></div>
    </div>
  );
};

// ==========================================
// TOOL 2: MOCK DUMMY TEXT GENERATOR
// ==========================================
const DummyTextGenerator = () => {
  const [paragraphs, setParagraphs] = useState(1);
  const [characters, setCharacters] = useState(50);
  const [text, setText] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const generateText = () => {
    const lorem = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. ";

    const pCount = Math.max(1, parseInt(paragraphs) || 1);
    const charLimit = parseInt(characters);

    if (!isNaN(charLimit) && charLimit > 0) {
      const separatorLength = 2;
      const totalSeparatorsLength = (pCount - 1) * separatorLength;
      const charsForText = charLimit - totalSeparatorsLength;

      const sourceText = lorem.repeat(Math.ceil(charLimit / lorem.length) + 1);

      if (charsForText <= 0) {
        setText(sourceText.slice(0, charLimit));
      } else {
        const charsPerParagraph = Math.floor(charsForText / pCount);
        let remainder = charsForText % pCount;

        let result = [];
        let currentLoremIndex = 0;

        for (let i = 0; i < pCount; i++) {
          let lengthForThis = charsPerParagraph + (remainder > 0 ? 1 : 0);
          if (remainder > 0) remainder--;

          result.push(sourceText.slice(currentLoremIndex, currentLoremIndex + lengthForThis));
          currentLoremIndex += lengthForThis;
        }

        setText(result.join('\n\n'));
      }
    } else {
      let result = [];
      for (let i = 0; i < pCount; i++) {
        result.push(lorem.trim());
      }
      setText(result.join('\n\n'));
    }

    setIsCopied(false);
  };

  useEffect(() => generateText(), [paragraphs, characters]);

  const handleCopy = () => {
    copyTextToClipboard(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 space-y-6 max-w-4xl">
      <div className="flex items-end gap-4">
        <div className="space-y-1.5 flex-1">
          <label className="text-sm font-medium text-gray-700">Paragraphs</label>
          <input type="number" min="1" max="50" value={paragraphs} onChange={(e) => setParagraphs(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" />
        </div>
        <div className="space-y-1.5 flex-1">
          <label className="text-sm font-medium text-gray-700">Character Limit</label>
          <input type="number" min="0" placeholder="No limit" value={characters} onChange={(e) => setCharacters(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" />
        </div>
        <button onClick={generateText} className="py-2 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 h-[42px] transition-colors">
          Regenerate
        </button>
      </div>

      <div className="relative group">
        <textarea
          readOnly
          value={text}
          className="w-full h-80 p-5 border border-gray-200 rounded-xl bg-gray-50 outline-none resize-y text-gray-700 leading-relaxed pb-12"
        />
        <button
          onClick={handleCopy}
          className={`absolute top-4 right-4 px-3 py-2 rounded-lg shadow-sm border text-sm font-medium flex items-center gap-2 transition-all duration-200 ${isCopied
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 opacity-0 group-hover:opacity-100'
            }`}
        >
          {isCopied ? (
            <><Check size={16} /> Copied</>
          ) : (
            <><Copy size={16} /> Copy Text</>
          )}
        </button>
        <div className="absolute bottom-4 right-4 text-xs font-medium text-gray-500 bg-white border border-gray-200 px-2 py-1 rounded shadow-sm">
          {text.length} characters
        </div>
      </div>
    </div>
  );
};

// ==========================================
// TOOL 3: JSON FORMATTER & VALIDATOR
// ==========================================
const JsonFormatter = () => {
  const [input, setInput] = useState('{\n  "name": "QA Tools",\n  "status": "active",\n  "features": ["format", "minify", "validate"],\n  "isAwesome": true,\n  "version": 1.0\n}');
  const [output, setOutput] = useState('');
  const [error, setError] = useState(null);
  const [indent, setIndent] = useState(2);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    formatJson('format');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, indent]);

  const formatJson = (action) => {
    if (!input.trim()) {
      setOutput('');
      setError(null);
      return;
    }
    try {
      const parsed = JSON.parse(input);
      let result = '';
      if (action === 'format') {
        result = JSON.stringify(parsed, null, Number(indent));
      } else if (action === 'minify') {
        result = JSON.stringify(parsed);
      }
      setOutput(result);
      setError(null);
    } catch (err) {
      setError(err.message);
      setOutput('');
    }
  };

  const handleCopy = () => {
    if (output) {
      copyTextToClipboard(output);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const clearInput = () => {
    setInput('');
    setOutput('');
    setError(null);
  };

  const syntaxHighlight = (jsonString) => {
    if (!jsonString) return '';
    let json = jsonString.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const regex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g;
    return json.replace(regex, function (match) {
      let cls = 'text-blue-500';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'text-purple-600 font-medium';
        } else {
          cls = 'text-emerald-600';
        }
      } else if (/true|false/.test(match)) {
        cls = 'text-amber-500 font-bold';
      } else if (/null/.test(match)) {
        cls = 'text-gray-400 italic';
      }
      return '<span class="' + cls + '">' + match + '</span>';
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[500px] xl:h-[calc(100vh-16rem)]">
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={clearInput} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 size={16} /> <span className="hidden sm:inline">Clear</span>
          </button>
          <div className="w-px h-5 bg-gray-300 mx-2 hidden sm:block"></div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 font-medium">Indent:</label>
            <select
              value={indent}
              onChange={(e) => setIndent(e.target.value)}
              className="px-2 py-1 text-sm border border-gray-300 rounded-md bg-white outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="2">2 Spaces</option>
              <option value="4">4 Spaces</option>
              <option value="1">1 Space</option>
              <option value="0">Minified</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => formatJson('minify')} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg shadow-sm transition-colors">
            <Minimize2 size={16} /> <span className="hidden sm:inline">Minify</span>
          </button>
          <button onClick={() => formatJson('format')} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg shadow-sm transition-colors">
            <Maximize2 size={16} /> <span className="hidden sm:inline">Format</span>
          </button>

          <button
            onClick={handleCopy}
            disabled={!!error || !output}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white rounded-lg shadow-sm transition-all duration-200 ${isCopied ? 'bg-green-600' : 'bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed'
              }`}
          >
            {isCopied ? <Check size={16} /> : <Copy size={16} />}
            <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-start gap-2">
          <AlertCircle size={18} className="text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-800">JSON Syntax Error</p>
            <p className="text-sm text-red-600 font-mono mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col xl:flex-row min-h-0">
        <div className="flex-1 flex flex-col border-b xl:border-b-0 xl:border-r border-gray-200 bg-white relative min-h-[250px] xl:min-h-0">
          <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Input (Raw)</span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your JSON string here..."
            className="flex-1 w-full p-4 resize-none outline-none font-mono text-sm leading-relaxed text-gray-800 bg-transparent h-full"
            spellCheck="false"
          />
        </div>

        <div className="flex-1 flex flex-col bg-[#fafafa] relative min-h-[250px] xl:min-h-0">
          <div className="px-4 py-2 border-b border-gray-100 bg-white/50 flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Output (Formatted)</span>
            {!error && output && (
              <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={12} /> Valid
              </span>
            )}
          </div>
          <div className="flex-1 p-4 overflow-auto custom-scrollbar relative">
            {output ? (
              <pre
                className="font-mono text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: syntaxHighlight(output) }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                {error ? 'Fix errors to view result' : 'No valid data yet'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// TOOL 4: EPOCH TIME CONVERTER
// ==========================================
const EpochConverter = () => {
  const [currentEpoch, setCurrentEpoch] = useState(Math.floor(Date.now() / 1000));
  const [isCurrentCopied, setIsCurrentCopied] = useState(false);

  const [epochInput, setEpochInput] = useState('');
  const [epochToDateCopied, setEpochToDateCopied] = useState(false);

  const [dateInput, setDateInput] = useState('');
  const [dateToEpochCopied, setDateToEpochCopied] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentEpoch(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    if (!date || isNaN(date.getTime())) return null;
    return {
      local: date.toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      utc: date.toUTCString(),
      iso: date.toISOString()
    };
  };

  let parsedDateResult = null;
  let detectedUnit = '';
  if (epochInput.trim() !== '') {
    const num = parseInt(epochInput);
    if (!isNaN(num)) {
      const isAutoMs = num > 100000000000;
      const dateObj = new Date(isAutoMs ? num : num * 1000);
      parsedDateResult = formatDate(dateObj);
      detectedUnit = isAutoMs ? 'Milliseconds (ms)' : 'Seconds (s)';
    }
  }

  let parsedEpochResult = null;
  if (dateInput.trim() !== '') {
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) {
      parsedEpochResult = {
        sec: Math.floor(d.getTime() / 1000),
        ms: d.getTime()
      };
    }
  }

  const handleCopy = (text, setCopiedState) => {
    copyTextToClipboard(text);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2000);
  };

  const setNowForDateInput = () => {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const str = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    setDateInput(str);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="bg-gray-900 rounded-2xl shadow-sm p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gray-800 rounded-xl">
            <Clock size={24} className="text-teal-400" />
          </div>
          <div>
            <p className="text-gray-400 text-sm font-medium mb-1 uppercase tracking-wider">Current Epoch Time (Seconds)</p>
            <div className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-teal-400">
              {currentEpoch}
            </div>
          </div>
        </div>
        <button
          onClick={() => handleCopy(currentEpoch.toString(), setIsCurrentCopied)}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors ${isCurrentCopied ? 'bg-teal-500/20 text-teal-300' : 'bg-white text-gray-900 hover:bg-gray-100'
            }`}
        >
          {isCurrentCopied ? <Check size={18} /> : <Copy size={18} />}
          {isCurrentCopied ? 'Copied' : 'Copy Timestamp'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <ArrowRightLeft size={18} className="text-teal-600" />
            <h3 className="font-semibold text-gray-800">Epoch to Date Time</h3>
          </div>

          <div className="p-6 space-y-6 flex-1">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Enter Epoch Timestamp</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="number"
                  value={epochInput}
                  onChange={(e) => setEpochInput(e.target.value)}
                  placeholder="Example: 1718294400 or 1718294400000"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-mono transition-shadow"
                />
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 min-h-[140px] flex flex-col justify-center relative">
              {parsedDateResult ? (
                <div className="space-y-3 relative group">
                  <div className="absolute -top-1 right-8 bg-teal-100 text-teal-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                    Auto: {detectedUnit}
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Local Time</span>
                    <p className="text-lg font-bold text-gray-900">{parsedDateResult.local}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">UTC Time (GMT)</span>
                    <p className="text-sm font-medium text-gray-700 font-mono">{parsedDateResult.utc}</p>
                  </div>
                  <button
                    onClick={() => handleCopy(parsedDateResult.local, setEpochToDateCopied)}
                    className="absolute top-0 right-0 p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    title="Copy Local Time"
                  >
                    {epochToDateCopied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                  </button>
                </div>
              ) : (
                <p className="text-center text-gray-400 text-sm">Enter valid Epoch to view result</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <CalendarDays size={18} className="text-purple-600" />
            <h3 className="font-semibold text-gray-800">Date Time to Epoch</h3>
          </div>

          <div className="p-6 space-y-6 flex-1">
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <label className="text-sm font-medium text-gray-700">Select Local Time</label>
                <button onClick={setNowForDateInput} className="text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1">
                  <RefreshCw size={12} /> Set Current
                </button>
              </div>
              <input
                type="datetime-local"
                step="1"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 transition-shadow bg-white"
              />
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 min-h-[140px] flex flex-col justify-center">
              {parsedEpochResult ? (
                <div className="space-y-3 relative group">
                  <div>
                    <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Epoch (Seconds)</span>
                    <p className="text-2xl font-bold font-mono text-purple-700">{parsedEpochResult.sec}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Epoch (Milliseconds)</span>
                    <p className="text-sm font-medium text-gray-600 font-mono">{parsedEpochResult.ms}</p>
                  </div>
                  <button
                    onClick={() => handleCopy(parsedEpochResult.sec.toString(), setDateToEpochCopied)}
                    className="absolute top-0 right-0 p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    title="Copy Epoch (Seconds)"
                  >
                    {dateToEpochCopied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                  </button>
                </div>
              ) : (
                <p className="text-center text-gray-400 text-sm">Select date and time to view result</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// TOOL 5: COLOR CONVERTER
// ==========================================
const ColorConverter = () => {
  const [hex, setHex] = useState('#3B82F6');
  const [rgb, setRgb] = useState({ r: 59, g: 130, b: 246 });
  const [hexCopied, setHexCopied] = useState(false);
  const [rgbCopied, setRgbCopied] = useState(false);

  const hexToRgb = (hexCode) => {
    let h = hexCode.replace('#', '');
    if (h.length === 3) {
      h = h.split('').map(c => c + c).join('');
    }
    const num = parseInt(h, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  };

  const rgbToHex = (r, g, b) => {
    return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).toUpperCase();
  };

  const handleColorPicker = (e) => {
    const val = e.target.value;
    setHex(val.toUpperCase());
    setRgb(hexToRgb(val));
  };

  const handleHexInput = (e) => {
    let val = e.target.value;
    if (!val.startsWith('#') && val.length > 0) val = '#' + val;
    setHex(val);

    if (/^#([0-9A-Fa-f]{3}){1,2}$/i.test(val)) {
      setRgb(hexToRgb(val));
    }
  };

  const handleRgbInput = (channel, value) => {
    let num = parseInt(value, 10);
    if (isNaN(num)) num = 0;
    if (num > 255) num = 255;
    if (num < 0) num = 0;

    const newRgb = { ...rgb, [channel]: num };
    setRgb(newRgb);
    setHex(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
  };

  const rgbString = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;

  const handleCopy = (text, setCopied) => {
    copyTextToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLuminance = (r, g, b) => {
    const a = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  };
  const isLight = getLuminance(rgb.r, rgb.g, rgb.b) > 0.5;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-6xl">
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 space-y-6">
          <div className="flex items-center gap-2 border-b pb-3">
            <Palette size={18} className="text-gray-400" />
            <h3 className="font-semibold text-gray-800">Color Adjustment</h3>
          </div>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Select Color (Picker)</label>
              <div className="flex h-12">
                <input
                  type="color"
                  value={/^#[0-9A-Fa-f]{6}$/i.test(hex) ? hex : '#000000'}
                  onChange={handleColorPicker}
                  className="w-full h-full cursor-pointer rounded-xl border border-gray-300 p-1 bg-white focus:ring-2 focus:ring-pink-500 transition-shadow"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">HEX Code</label>
              <div className="flex relative">
                <input
                  type="text"
                  value={hex}
                  onChange={handleHexInput}
                  maxLength={7}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 font-mono text-gray-800 transition-shadow"
                />
                <button
                  onClick={() => handleCopy(hex, setHexCopied)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Copy HEX"
                >
                  {hexCopied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-gray-100">
              <div className="flex justify-between items-end mb-2.5">
                <label className="text-sm font-medium text-gray-700">RGB Code (0 - 255)</label>
                <button
                  onClick={() => handleCopy(rgbString, setRgbCopied)}
                  className="text-xs text-pink-600 font-medium flex items-center gap-1 hover:text-pink-800 transition-colors"
                >
                  {rgbCopied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />} Copy RGB
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <div className="text-xs text-center font-bold text-red-500">R (Red)</div>
                  <input type="number" min="0" max="255" value={rgb.r} onChange={(e) => handleRgbInput('r', e.target.value)} className="w-full px-3 py-2 border border-red-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-center font-mono bg-red-50/30" />
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs text-center font-bold text-green-500">G (Green)</div>
                  <input type="number" min="0" max="255" value={rgb.g} onChange={(e) => handleRgbInput('g', e.target.value)} className="w-full px-3 py-2 border border-green-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-center font-mono bg-green-50/30" />
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs text-center font-bold text-blue-500">B (Blue)</div>
                  <input type="number" min="0" max="255" value={rgb.b} onChange={(e) => handleRgbInput('b', e.target.value)} className="w-full px-3 py-2 border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-center font-mono bg-blue-50/30" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-7">
        <div
          className="h-full min-h-[300px] rounded-2xl shadow-inner border border-gray-200 flex flex-col items-center justify-center p-8 transition-colors duration-300 relative overflow-hidden"
          style={{ backgroundColor: /^#([0-9A-Fa-f]{3}){1,2}$/i.test(hex) ? hex : '#ffffff' }}
        >
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(45deg, #000 25%, transparent 25%), linear-gradient(-45deg, #000 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #000 75%), linear-gradient(-45deg, transparent 75%, #000 75%)',
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
            zIndex: 0
          }} />

          <div className={`relative z-10 flex flex-col items-center gap-5 ${isLight ? 'text-gray-900' : 'text-white'}`}>
            <div className="text-center space-y-1">
              <p className="text-sm font-bold uppercase tracking-widest opacity-70">HEX</p>
              <p className="text-4xl md:text-6xl font-black font-mono tracking-tight drop-shadow-sm">
                {/^#([0-9A-Fa-f]{3}){1,2}$/i.test(hex) ? hex.toUpperCase() : 'INVALID'}
              </p>
            </div>

            <div className={`w-16 h-1 rounded-full opacity-20 ${isLight ? 'bg-gray-900' : 'bg-white'}`}></div>

            <div className="text-center space-y-1">
              <p className="text-sm font-bold uppercase tracking-widest opacity-70">RGB</p>
              <p className="text-2xl md:text-3xl font-bold font-mono drop-shadow-sm opacity-90">{rgbString}</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

// ==========================================
// TOOL 6: BASE64 CONVERTER
// ==========================================
const Base64Converter = () => {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('encode');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!input) {
      setOutput('');
      setError('');
      return;
    }

    try {
      if (mode === 'encode') {
        const bytes = new TextEncoder().encode(input);
        const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join("");
        setOutput(btoa(binString));
        setError('');
      } else {
        const binString = atob(input.trim());
        const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0));
        setOutput(new TextDecoder().decode(bytes));
        setError('');
      }
    } catch (err) {
      setOutput('');
      setError('Invalid input. Please check the ' + (mode === 'encode' ? 'text' : 'Base64') + ' string.');
    }
  }, [input, mode]);

  const handleCopy = () => {
    if (output) {
      copyTextToClipboard(output);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const clearInput = () => {
    setInput('');
    setOutput('');
    setError('');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[500px] xl:h-[calc(100vh-16rem)] max-w-6xl">
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={clearInput} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 size={16} /> <span className="hidden sm:inline">Clear</span>
          </button>
          <div className="w-px h-5 bg-gray-300 mx-2 hidden sm:block"></div>

          <div className="flex bg-white rounded-lg border border-gray-300 overflow-hidden p-0.5">
            <button
              onClick={() => setMode('encode')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === 'encode' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Encode
            </button>
            <button
              onClick={() => setMode('decode')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === 'decode' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Decode
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            disabled={!!error || !output}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white rounded-lg shadow-sm transition-all duration-200 ${isCopied ? 'bg-green-600' : 'bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed'
              }`}
          >
            {isCopied ? <Check size={16} /> : <Copy size={16} />}
            <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-start gap-2">
          <AlertCircle size={18} className="text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-800">Conversion Error</p>
            <p className="text-sm text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col xl:flex-row min-h-0">
        <div className="flex-1 flex flex-col border-b xl:border-b-0 xl:border-r border-gray-200 bg-white relative min-h-[250px] xl:min-h-0">
          <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Input ({mode === 'encode' ? 'Text' : 'Base64'})</span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'encode' ? "Enter text to encode (supports Unicode)..." : "Enter Base64 string to decode..."}
            className="flex-1 w-full p-4 resize-none outline-none font-mono text-sm leading-relaxed text-gray-800 bg-transparent h-full"
            spellCheck="false"
          />
        </div>

        <div className="flex-1 flex flex-col bg-[#fafafa] relative min-h-[250px] xl:min-h-0">
          <div className="px-4 py-2 border-b border-gray-100 bg-white/50 flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Output ({mode === 'encode' ? 'Base64' : 'Text'})</span>
            {!error && output && (
              <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={12} /> Success
              </span>
            )}
          </div>
          <div className="flex-1 p-4 overflow-auto custom-scrollbar relative">
            {output ? (
              <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap word-break-all text-gray-800 break-all">
                {output}
              </pre>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                {error ? 'Fix errors to view result' : 'No data'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// TOOL 7: TEXT ANALYZER
// ==========================================
const TextAnalyzer = () => {
  const [text, setText] = useState('');

  const stats = React.useMemo(() => {
    const trimmed = text.trim();
    const chars = text.length;
    const charsNoSpaces = text.replace(/\s+/g, '').length;
    const words = trimmed === '' ? 0 : trimmed.split(/\s+/).length;
    const sentences = trimmed === '' ? 0 : text.split(/[.!?]+(?=\s|$)/).filter(s => s.trim().length > 0).length;
    const paragraphs = trimmed === '' ? 0 : text.split(/\n+/).filter(p => p.trim().length > 0).length;

    return { chars, charsNoSpaces, words, sentences, paragraphs };
  }, [text]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Characters</p>
          <p className="text-3xl font-bold text-gray-900">{stats.chars}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Words</p>
          <p className="text-3xl font-bold text-emerald-600">{stats.words}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Sentences</p>
          <p className="text-3xl font-bold text-blue-600">{stats.sentences}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Paragraphs</p>
          <p className="text-3xl font-bold text-purple-600">{stats.paragraphs}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Characters (No spaces)</p>
          <p className="text-3xl font-bold text-gray-700">{stats.charsNoSpaces}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col relative">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <AlignLeft size={16} className="text-gray-400" /> Input Text
          </h3>
          <button
            onClick={() => setText('')}
            className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors flex items-center gap-1"
          >
            <Trash2 size={14} /> Clear
          </button>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste or type your text here to count..."
          className="w-full min-h-[400px] p-5 outline-none resize-y text-gray-800 leading-relaxed bg-transparent"
        />
      </div>
    </div>
  );
};

// ==========================================
// TOOL 8: TEXT DIFF CHECKER (UPDATED SPLIT VIEW)
// ==========================================
const TextDiffChecker = () => {
  const [originalText, setOriginalText] = useState('');
  const [modifiedText, setModifiedText] = useState('');
  const [diffResult, setDiffResult] = useState(null);

  const handleCompare = () => {
    if (!originalText && !modifiedText) {
      setDiffResult(null);
      return;
    }

    const lines1 = originalText.split('\n');
    const lines2 = modifiedText.split('\n');
    const max = Math.max(lines1.length, lines2.length);
    const diffs = [];

    for (let i = 0; i < max; i++) {
      diffs.push({
        num: i + 1,
        orig: lines1[i],
        mod: lines2[i],
        isChanged: lines1[i] !== lines2[i]
      });
    }
    setDiffResult(diffs);
  };

  const clearInputs = () => {
    setOriginalText('');
    setModifiedText('');
    setDiffResult(null);
  };

  return (
    <div className="space-y-6 max-w-[1600px]">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[300px]">
          <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Original Text (Expected)</span>
          </div>
          <textarea
            value={originalText}
            onChange={(e) => setOriginalText(e.target.value)}
            placeholder="Paste original text or expected JSON here..."
            className="flex-1 w-full p-4 resize-none outline-none font-mono text-sm leading-relaxed text-gray-800 bg-transparent custom-scrollbar"
            spellCheck="false"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[300px]">
          <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Modified Text (Actual)</span>
          </div>
          <textarea
            value={modifiedText}
            onChange={(e) => setModifiedText(e.target.value)}
            placeholder="Paste modified text or actual API response here..."
            className="flex-1 w-full p-4 resize-none outline-none font-mono text-sm leading-relaxed text-gray-800 bg-transparent custom-scrollbar"
            spellCheck="false"
          />
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <button
          onClick={clearInputs}
          className="px-6 py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors flex items-center gap-2"
        >
          <Trash2 size={16} /> Clear All
        </button>
        <button
          onClick={handleCompare}
          className="px-8 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm rounded-xl transition-colors flex items-center gap-2"
        >
          <GitCompare size={16} /> Compare Strict Lines
        </button>
      </div>

      {diffResult && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Code size={16} className="text-indigo-500" /> Split Diff Result
            </h3>
            <div className="flex gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-200 border border-red-300"></span> Original (Removed)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-200 border border-green-300"></span> Modified (Added)</span>
            </div>
          </div>

          <div className="p-0 overflow-x-hidden custom-scrollbar max-h-[600px] overflow-y-auto">
            <div className="w-full flex flex-col font-mono text-sm leading-6 text-gray-800">
              {diffResult.map((row, index) => {
                const origDefined = row.orig !== undefined;
                const modDefined = row.mod !== undefined;

                return (
                  <div key={index} className="flex w-full border-b border-gray-100 hover:bg-gray-100/30">
                    {/* Left Side - Original */}
                    <div className={`flex w-1/2 px-2 border-r border-gray-200 ${row.isChanged && origDefined ? 'bg-red-50/70 text-red-800' : 'text-gray-700'}`}>
                      <div className="w-10 shrink-0 text-right pr-3 text-gray-400 select-none border-r border-gray-200 mr-3 text-xs opacity-70 flex flex-col justify-center">
                        {origDefined ? row.num : ''}
                      </div>
                      <div className="shrink-0 w-4 font-bold select-none text-red-600/70 flex flex-col justify-center">
                        {row.isChanged && origDefined ? '-' : ' '}
                      </div>
                      <div className="whitespace-pre-wrap flex-1 break-all py-1">
                        {origDefined ? row.orig : ' '}
                      </div>
                    </div>

                    {/* Right Side - Modified */}
                    <div className={`flex w-1/2 px-2 ${row.isChanged && modDefined ? 'bg-green-50/70 text-green-800' : 'text-gray-700'}`}>
                      <div className="w-10 shrink-0 text-right pr-3 text-gray-400 select-none border-r border-gray-200 mr-3 text-xs opacity-70 flex flex-col justify-center">
                        {modDefined ? row.num : ''}
                      </div>
                      <div className="shrink-0 w-4 font-bold select-none text-green-600/70 flex flex-col justify-center">
                        {row.isChanged && modDefined ? '+' : ' '}
                      </div>
                      <div className="whitespace-pre-wrap flex-1 break-all py-1">
                        {modDefined ? row.mod : ' '}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// CONFIG: TOOLS LIST MANAGEMENT
// ==========================================
const TOOLS_CONFIG = [
  {
    id: 'media-generator',
    name: 'Media Generator',
    description: 'Generate test images, audio files, and videos with custom dimensions, formats, and sizes.',
    icon: Film,
    component: MediaGenerator,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50'
  },
  {
    id: 'color-converter',
    name: 'Color Converter',
    description: 'Convert between HEX and RGB color codes.',
    icon: Palette,
    component: ColorConverter,
    color: 'text-pink-500',
    bgColor: 'bg-pink-50'
  },
  {
    id: 'epoch-converter',
    name: 'Epoch Converter',
    description: 'Convert between Epoch Timestamp and Local Date Time.',
    icon: Clock,
    component: EpochConverter,
    color: 'text-teal-500',
    bgColor: 'bg-teal-50'
  },
  {
    id: 'json-formatter',
    name: 'JSON Formatter',
    description: 'Format, beautify, and validate JSON strings.',
    icon: FileJson,
    component: JsonFormatter,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50'
  },
  {
    id: 'dummy-text',
    name: 'Dummy Text',
    description: 'Quickly generate Lorem Ipsum text to test UI/UX.',
    icon: Type,
    component: DummyTextGenerator,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50'
  },
  {
    id: 'base64-converter',
    name: 'Base64 Converter',
    description: 'Encode and decode Base64 strings.',
    icon: Binary,
    component: Base64Converter,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50'
  },
  {
    id: 'text-analyzer',
    name: 'Text Analyzer',
    description: 'Count paragraphs, sentences, words, and characters of a text.',
    icon: AlignLeft,
    component: TextAnalyzer,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50'
  },
  {
    id: 'text-diff-checker',
    name: 'Text Diff Checker',
    description: 'Compare two texts side-by-side to find differences (Strict line match).',
    icon: GitCompare,
    component: TextDiffChecker,
    color: 'text-rose-500',
    bgColor: 'bg-rose-50'
  }
];

// ==========================================
// MAIN APP: SHELL & LAYOUT
// ==========================================
export default function App() {
  const [activeToolId, setActiveToolId] = useState(TOOLS_CONFIG[0].id);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const activeTool = TOOLS_CONFIG.find(t => t.id === activeToolId) || TOOLS_CONFIG[0];
  const ActiveComponent = activeTool.component;

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-800">

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 flex flex-col
        transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="bg-gray-900 text-white p-1.5 rounded-lg shadow-sm">
              <Code size={20} />
            </div>
            <span className="font-bold text-lg text-gray-900 tracking-tight">QA Tools Hub</span>
          </div>
          <button className="lg:hidden text-gray-500 hover:bg-gray-100 p-1.5 rounded-md" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Tools List */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 mt-2">Tool List</p>

          {TOOLS_CONFIG.map((tool) => {
            const isActive = activeToolId === tool.id;
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => {
                  setActiveToolId(tool.id);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left
                  ${isActive
                    ? `bg-gray-900 text-white shadow-md shadow-gray-900/10`
                    : `text-gray-600 hover:bg-gray-100 hover:text-gray-900`
                  }
                `}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-gray-800 text-white' : tool.bgColor + ' ' + tool.color}`}>
                  <Icon size={18} />
                </div>
                <span className="font-medium text-sm flex-1">{tool.name}</span>
                {isActive && <ChevronRight size={16} className="text-gray-400" />}
              </button>
            )
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-100">
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <p className="text-xs text-gray-500 leading-relaxed font-medium">
              Internal tool platform supporting Software Testing & QA processes.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">

        {/* Top Header (Mobile Only) */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 shrink-0 lg:hidden">
          <button
            className="text-gray-600 hover:bg-gray-100 p-2 rounded-md transition-colors"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
        </header>

        {/* Dynamic Tool Content */}
        <div className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="max-w-[1600px] mx-auto h-full flex flex-col">
            {/* Tool Header */}
            <div className="mb-6 shrink-0">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2.5 rounded-xl ${activeTool.bgColor} ${activeTool.color} shadow-sm border border-white/50`}>
                  <activeTool.icon size={24} />
                </div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">{activeTool.name}</h1>
              </div>
              <p className="text-gray-500 text-base">{activeTool.description}</p>
            </div>

            {/* Render Component */}
            <div className="flex-1 animate-in fade-in duration-500">
              <ActiveComponent />
            </div>
          </div>
        </div>

      </main>

      {/* CSS Scrollbar */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
      `}} />
    </div>
  );
}