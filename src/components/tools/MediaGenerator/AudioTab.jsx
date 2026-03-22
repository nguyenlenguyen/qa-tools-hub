import { AlertCircle, CheckCircle2, Download, Loader2, Music, Settings } from 'lucide-react';
import React, { useEffect, useRef,useState } from 'react';

import { formatBytes } from '../../../utils/helpers.js';

const AudioTab = () => {
  const [format, setFormat] = useState('wav');
  const [duration, setDuration] = useState(5);
  const [sampleRate, setSampleRate] = useState(44100);
  const [targetSize, setTargetSize] = useState('');
  const [sizeUnit, setSizeUnit] = useState('MB');
  const [audioType, setAudioType] = useState('noise');

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

  const generateAudio = async () => {
    setIsGenerating(true);
    setError('');
    // Revoke previous Object URL to prevent memory leak
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    setResultUrl(null);
    resultUrlRef.current = null;

    // Read latest values directly from state (called synchronously from click handler)
    const currentAudioType = audioType;
    const currentSampleRate = parseInt(sampleRate);
    const currentFormat = format;
    const currentDuration = parseFloat(duration);
    const currentTargetSize = targetSize;
    const currentSizeUnit = sizeUnit;

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
          } else if (targetBytes < buffer.byteLength) {
            setError(`Warning: Original size (${formatBytes(buffer.byteLength)}) is already larger than target size.`);
          }
        }
        const blob = finalBuffer instanceof Blob ? finalBuffer : new Blob([finalBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        resultUrlRef.current = url;
        setResultUrl(url); setResultSize(blob.size);
        setResultName(`qa_audio_${currentDuration}s_${formatBytes(blob.size).replace(' ', '')}.wav`);
        setResultMeta({ format: 'wav', duration: currentDuration, size: blob.size });
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

        // Cleanup FFmpeg virtual filesystem to free WASM memory
        try { await ffmpeg.deleteFile('input.pcm'); } catch { }
        try { await ffmpeg.deleteFile(`output.${currentFormat}`); } catch { }

        let blob = new Blob([data.buffer], { type: mimeMap[currentFormat] || 'audio/mpeg' });
        if (currentTargetSize && parseFloat(currentTargetSize) > 0) {
          const multiplier = currentSizeUnit === 'MB' ? 1024 * 1024 : 1024;
          const targetBytes = Math.floor(parseFloat(currentTargetSize) * multiplier);
          if (targetBytes > blob.size) {
            blob = new Blob([blob, new Uint8Array(targetBytes - blob.size)], { type: blob.type });
          } else if (targetBytes < blob.size) {
            setError(`Warning: Original size (${formatBytes(blob.size)}) is already larger than target size.`);
          }
        }
        const url = URL.createObjectURL(blob);
        resultUrlRef.current = url;
        setResultUrl(url); setResultSize(blob.size);
        setResultName(`qa_audio_${currentDuration}s_${formatBytes(blob.size).replace(' ', '')}.${currentFormat}`);
        setResultMeta({ format: currentFormat, duration: currentDuration, size: blob.size });
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

          {resultUrl && !isGenerating && resultMeta && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="flex flex-wrap gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Format</p>
                  <p className="font-medium text-gray-900 uppercase">.{resultMeta.format}</p>
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
export default AudioTab;
