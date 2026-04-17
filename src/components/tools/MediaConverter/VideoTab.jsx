import { AlertCircle, CheckCircle2, Download, Film, Link, Link2Off, Loader2, Settings, Upload } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { formatBytes } from '../../../utils/helpers.js';

const VideoTab = () => {
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState('mp4');
  const [quality, setQuality] = useState('original');
  
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState('');
  const [originalMeta, setOriginalMeta] = useState(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState(null);
  const [resizeMode, setResizeMode] = useState('original');
  const [resizePercentage, setResizePercentage] = useState(100);
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);
  const [resultUrl, setResultUrl] = useState(null);
  const [resultMeta, setResultMeta] = useState(null);
  const [error, setError] = useState('');

  const ffmpegRef = useRef(null);
  const ffmpegLoadedRef = useRef(false);
  const resultUrlRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
      if (originalPreviewUrl) URL.revokeObjectURL(originalPreviewUrl);
    };
  }, [originalPreviewUrl]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('video/')) {
        setError('Please select a valid video file.');
        return;
      }
      setFile(selectedFile);
      setError('');
      setResultUrl(null);
      setResultMeta(null);
      setProgress('');

      const objUrl = URL.createObjectURL(selectedFile);
      setOriginalPreviewUrl(objUrl);

      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        setOriginalMeta({
          name: selectedFile.name,
          size: selectedFile.size,
          type: selectedFile.type,
          width: video.videoWidth,
          height: video.videoHeight,
          duration: video.duration
        });
        setCustomWidth(video.videoWidth);
        setCustomHeight(video.videoHeight);
      };
      video.src = objUrl;
    }
  };

  const handleWidthChange = (val) => {
    setCustomWidth(val);
    if (keepAspectRatio && originalMeta && val > 0) {
      const ratio = originalMeta.height / originalMeta.width;
      setCustomHeight(Math.round(val * ratio));
    }
  };

  const handleHeightChange = (val) => {
    setCustomHeight(val);
    if (keepAspectRatio && originalMeta && val > 0) {
      const ratio = originalMeta.width / originalMeta.height;
      setCustomWidth(Math.round(val * ratio));
    }
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

  const convertVideo = async () => {
    if (!file) return;
    
    setIsConverting(true);
    setError('');
    
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    setResultUrl(null);
    resultUrlRef.current = null;

    try {
      const { ffmpeg, fetchFile } = await loadFFmpeg();
      
      setProgress('Uploading video to FFmpeg...');
      const inputFileName = `input_${Date.now()}.${file.name.split('.').pop()}`;
      const outputFileName = `output_${Date.now()}.${format}`;
      
      const fileData = await fetchFile(file);
      await ffmpeg.writeFile(inputFileName, fileData);
      
      setProgress('Converting video...');
      
      const logHandler = ({ message }) => {
        const timeMatch = message.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);
        if (timeMatch) {
          setProgress(`Converting... Time processed: ${timeMatch[1]}`);
        }
      };
      
      ffmpeg.on('log', logHandler);
      
      const qualityMap = {
        x264: { original: '12', high: '18', medium: '23', low: '30' },
        vp9: { original: '15', high: '20', medium: '30', low: '40' }
      };

      const codecMap = {
        mp4: ['-c:v', 'libx264', '-crf', qualityMap.x264[quality], '-pix_fmt', 'yuv420p', '-preset', 'fast'],
        mov: ['-c:v', 'libx264', '-crf', qualityMap.x264[quality], '-pix_fmt', 'yuv420p', '-preset', 'fast'],
        avi: ['-c:v', 'libx264', '-crf', qualityMap.x264[quality], '-pix_fmt', 'yuv420p'],
        mkv: ['-c:v', 'libx264', '-crf', qualityMap.x264[quality], '-pix_fmt', 'yuv420p'],
        webm: ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', qualityMap.vp9[quality]],
      };
      
      const codecArgs = codecMap[format] || codecMap.mp4;
      
      let targetWidth = originalMeta?.width;
      let targetHeight = originalMeta?.height;
      let filterArgs = [];

      if (resizeMode !== 'original' && originalMeta) {
        if (resizeMode === 'percentage') {
          const ratio = resizePercentage / 100;
          targetWidth = Math.round((originalMeta.width * ratio) / 2) * 2;
          targetHeight = Math.round((originalMeta.height * ratio) / 2) * 2;
        } else if (resizeMode === 'custom') {
          targetWidth = Math.round((parseInt(customWidth) || originalMeta.width) / 2) * 2;
          targetHeight = Math.round((parseInt(customHeight) || originalMeta.height) / 2) * 2;
        }
        filterArgs = ['-vf', `scale=${targetWidth}:${targetHeight}`];
      }

      await ffmpeg.exec([
        '-i', inputFileName,
        ...filterArgs,
        ...codecArgs,
        outputFileName
      ]);
      
      ffmpeg.off('log', logHandler);
      setProgress('Finalizing display...');
      
      const data = await ffmpeg.readFile(outputFileName);
      
      try { await ffmpeg.deleteFile(inputFileName); } catch { }
      try { await ffmpeg.deleteFile(outputFileName); } catch { }
      
      const mimeMap = {
        mp4: 'video/mp4', mov: 'video/quicktime',
        avi: 'video/x-msvideo', mkv: 'video/x-matroska', webm: 'video/webm'
      };
      
      const blob = new Blob([data.buffer], { type: mimeMap[format] || 'video/mp4' });
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      
      setResultUrl(url);
      setResultMeta({ 
        format, 
        size: blob.size,
        width: targetWidth,
        height: targetHeight,
        originalName: file.name
      });
      
      setProgress('');
    } catch (err) {
      console.error(err);
      setError('Conversion failed: ' + (err.message || 'Unknown error.'));
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl || !resultMeta) return;
    const originalName = resultMeta.originalName ? resultMeta.originalName.split('.')[0] : 'converted_video';
    const a = document.createElement('a');
    a.href = resultUrl; 
    a.download = `${originalName}_converted.${format}`;
    document.body.appendChild(a); 
    a.click();
    document.body.removeChild(a);
  };

  const FORMATS = ['mp4', 'mov', 'avi', 'mkv', 'webm'];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <div className="xl:col-span-5 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 space-y-5">
          <h2 className="text-lg font-semibold flex items-center gap-2 border-b pb-3">
            <Settings size={18} className="text-gray-400" />
            Conversion Settings
          </h2>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-700">Input Video</label>
              {file && (
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Change file
                </button>
              )}
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="video/*" 
              className="hidden" 
            />

            {!file ? (
              <div 
                className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={24} className="text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 font-medium">Click to select video</p>
              </div>
            ) : (
              <div className="flex gap-4 p-4 border border-gray-200 rounded-xl bg-gray-50 items-center">
                <div className="w-28 aspect-video shrink-0 bg-black border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                  {originalPreviewUrl ? (
                    <video src={originalPreviewUrl} className="w-full h-full object-contain" muted />
                  ) : (
                    <Film size={24} className="text-gray-400" />
                  )}
                </div>
                {originalMeta && (
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-medium text-gray-900 truncate" title={originalMeta.name}>{originalMeta.name}</p>
                    <p className="text-xs text-gray-500 uppercase font-semibold">
                      {originalMeta.width}x{originalMeta.height} • {formatBytes(originalMeta.size)}
                    </p>
                    <p className="text-xs text-gray-400 font-medium">Duration: {Math.round(originalMeta.duration)}s</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Target Format</label>
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
            <label className="text-sm font-medium text-gray-700">Output Quality</label>
            <div className="grid grid-cols-4 gap-2">
              {['original', 'low', 'medium', 'high'].map(q => (
                <button key={q} onClick={() => setQuality(q)}
                  className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border transition-colors uppercase ${quality === q ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Dimensions</label>
            <div className="grid grid-cols-3 gap-2">
              {['original', 'percentage', 'custom'].map(mode => (
                <button 
                  key={mode} 
                  onClick={() => setResizeMode(mode)} 
                  className={`py-2 px-3 text-sm font-medium rounded-lg border transition-colors capitalize ${resizeMode === mode ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {mode}
                </button>
              ))}
            </div>
            
            {resizeMode === 'percentage' && originalMeta && (
               <div className="mt-3 space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                 <div className="flex items-center gap-3">
                   <input 
                     type="range" 
                     min="10" 
                     max="100" 
                     step="1" 
                     value={resizePercentage} 
                     onChange={(e) => setResizePercentage(parseInt(e.target.value))} 
                     className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                   />
                   <span className="text-sm font-medium w-12 text-right">{resizePercentage}%</span>
                 </div>
                 <div className="text-[11px] text-gray-500 font-medium flex justify-between px-1">
                   <span>Estimated:</span>
                   <span className="text-blue-600 font-bold">
                     {Math.round((originalMeta.width * resizePercentage / 100) / 2) * 2} x {Math.round((originalMeta.height * resizePercentage / 100) / 2) * 2} px
                   </span>
                 </div>
               </div>
            )}
            
            {resizeMode === 'custom' && (
              <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-gray-500 font-medium font-mono">WIDTH</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={customWidth} 
                      onChange={e => handleWidthChange(e.target.value)} 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                    />
                  </div>
                  
                  <button 
                    onClick={() => setKeepAspectRatio(!keepAspectRatio)}
                    className={`mt-5 p-2 rounded-lg transition-all ${keepAspectRatio ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-400'}`}
                    title={keepAspectRatio ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                  >
                    {keepAspectRatio ? <Link size={16} /> : <Link2Off size={16} />}
                  </button>

                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-gray-500 font-medium font-mono">HEIGHT</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={customHeight} 
                      onChange={e => handleHeightChange(e.target.value)} 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                    />
                  </div>
                </div>
                {keepAspectRatio && originalMeta && (
                  <p className="text-[10px] text-gray-400 text-center italic">
                    Aspect Ratio Locked ({(originalMeta.width / originalMeta.height).toFixed(2)}:1)
                  </p>
                )}
                <p className="text-[10px] text-amber-600 text-center italic">
                  Note: Values will be rounded to nearest even number for compatibility.
                </p>
              </div>
            )}
          </div>

          <button onClick={convertVideo} disabled={isConverting || !file}
            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors focus:ring-4 focus:ring-blue-200 disabled:opacity-70 flex justify-center items-center gap-2 mt-4">
            {isConverting ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : <><Film size={18} /> Convert Video</>}
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

          <div 
            className="w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center p-6 relative"
            style={{ aspectRatio: '16/9' }}
          >
            {isConverting ? (
              <div className="text-center space-y-3">
                <Loader2 size={36} className="animate-spin text-blue-500 mx-auto" />
                <p className="text-sm text-gray-500 max-w-xs text-center">{progress}</p>
              </div>
            ) : resultUrl ? (
              <video controls src={resultUrl} className="max-w-full max-h-[380px] rounded-lg shadow-md" />
            ) : (
              <div className="text-center text-gray-400 space-y-2">
                <Film size={36} className="mx-auto opacity-30" />
                <p className="text-sm">Converted video will appear here</p>
              </div>
            )}
          </div>

          {resultUrl && !isConverting && resultMeta && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="flex flex-wrap gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Dimensions</p>
                  <p className="font-medium text-gray-900">{resultMeta.width}x{resultMeta.height} px</p>
                </div>
                <div className="w-px bg-gray-300 hidden sm:block"></div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Format</p>
                  <p className="font-medium text-gray-900 uppercase">.{resultMeta.format}</p>
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
