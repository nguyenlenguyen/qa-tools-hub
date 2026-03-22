import { AlertCircle, CheckCircle2, Download, Loader2, Music, Settings, Upload } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { formatBytes } from '../../../utils/helpers.js';

const AudioTab = () => {
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState('mp3');
  
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState('');
  const [originalMeta, setOriginalMeta] = useState(null);
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
    };
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('audio/')) {
        setError('Please select a valid audio file.');
        return;
      }
      setFile(selectedFile);
      setOriginalMeta({
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type
      });
      setError('');
      setResultUrl(null);
      setResultMeta(null);
      setProgress('');
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

  const convertAudio = async () => {
    if (!file) return;
    
    setIsConverting(true);
    setError('');
    
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    setResultUrl(null);
    resultUrlRef.current = null;

    try {
      const { ffmpeg, fetchFile } = await loadFFmpeg();
      
      setProgress('Uploading file to FFmpeg...');
      const inputFileName = `input_${Date.now()}.${file.name.split('.').pop()}`;
      const outputFileName = `output_${Date.now()}.${format}`;
      
      const fileData = await fetchFile(file);
      await ffmpeg.writeFile(inputFileName, fileData);
      
      setProgress('Converting audio...');
      
      const logHandler = ({ message }) => {
        const timeMatch = message.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);
        if (timeMatch) {
          setProgress(`Converting... Time processed: ${timeMatch[1]}`);
        }
      };
      
      ffmpeg.on('log', logHandler);
      
      const codecMap = {
        mp3: ['-c:a', 'libmp3lame', '-q:a', '2'],
        wav: ['-c:a', 'pcm_s16le'],
        ogg: ['-c:a', 'libvorbis', '-q:a', '4'],
        aac: ['-c:a', 'aac', '-b:a', '192k'],
        flac: ['-c:a', 'flac']
      };
      
      const codecArgs = codecMap[format] || codecMap.mp3;
      
      await ffmpeg.exec([
        '-i', inputFileName,
        '-vn', // No video
        ...codecArgs,
        outputFileName
      ]);
      
      ffmpeg.off('log', logHandler);
      setProgress('Finalizing display...');
      
      const data = await ffmpeg.readFile(outputFileName);
      
      try { await ffmpeg.deleteFile(inputFileName); } catch { }
      try { await ffmpeg.deleteFile(outputFileName); } catch { }
      
      const mimeMap = {
        mp3: 'audio/mpeg', 
        wav: 'audio/wav',
        ogg: 'audio/ogg', 
        aac: 'audio/aac', 
        flac: 'audio/flac'
      };
      
      const blob = new Blob([data.buffer], { type: mimeMap[format] || 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      
      setResultUrl(url);
      setResultMeta({ 
        format, 
        size: blob.size,
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
    const originalName = resultMeta.originalName ? resultMeta.originalName.split('.')[0] : 'converted_audio';
    const a = document.createElement('a');
    a.href = resultUrl; 
    a.download = `${originalName}_converted.${format}`;
    document.body.appendChild(a); 
    a.click();
    document.body.removeChild(a);
  };

  const FORMATS = ['mp3', 'wav', 'ogg', 'aac', 'flac'];

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
              <label className="text-sm font-medium text-gray-700">Input Audio</label>
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
              accept="audio/*" 
              className="hidden" 
            />

            {!file ? (
              <div 
                className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={24} className="text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 font-medium">Click to select audio file</p>
              </div>
            ) : (
              <div className="flex gap-4 p-4 border border-gray-200 rounded-xl bg-gray-50 items-center">
                <div className="w-16 h-16 shrink-0 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm">
                  <Music size={24} className="text-blue-500" />
                </div>
                {originalMeta && (
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-medium text-gray-900 truncate" title={originalMeta.name}>{originalMeta.name}</p>
                    <p className="text-xs text-gray-500 uppercase font-semibold">{originalMeta.type.split('/')[1] || 'audio'} • {formatBytes(originalMeta.size)}</p>
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

          <button onClick={convertAudio} disabled={isConverting || !file}
            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors focus:ring-4 focus:ring-blue-200 disabled:opacity-70 flex justify-center items-center gap-2 mt-4">
            {isConverting ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : <><Music size={18} /> Convert Audio</>}
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
            {isConverting ? (
              <div className="text-center space-y-3">
                <Loader2 size={36} className="animate-spin text-blue-500 mx-auto" />
                <p className="text-sm text-gray-500 max-w-xs text-center">{progress}</p>
              </div>
            ) : resultUrl ? (
              <div className="w-full p-4 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center gap-4">
                 <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-2">
                   <Music size={28} className="text-blue-500" />
                 </div>
                 <audio controls src={resultUrl} className="w-full" />
              </div>
            ) : (
              <div className="text-center text-gray-400 space-y-2">
                <Music size={36} className="mx-auto opacity-30" />
                <p className="text-sm">Converted audio will appear here</p>
              </div>
            )}
          </div>

          {resultUrl && !isConverting && resultMeta && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="flex flex-wrap gap-4">
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

export default AudioTab;
