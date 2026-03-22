import { AlertCircle, CheckCircle2, Download, Image as ImageIcon, Link, Link2Off, Settings, Upload } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { formatBytes } from '../../../utils/helpers.js';

const ImageTab = () => {
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState('png');
  const [quality, setQuality] = useState(0.9);
  const [resizeMode, setResizeMode] = useState('original');
  const [resizePercentage, setResizePercentage] = useState(100);
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);

  const [previewUrl, setPreviewUrl] = useState(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState(null);
  const [originalMeta, setOriginalMeta] = useState(null);
  const [resultMeta, setResultMeta] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState('');

  const previewUrlRef = useRef(null);
  const originalPreviewUrlRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (originalPreviewUrlRef.current) URL.revokeObjectURL(originalPreviewUrlRef.current);
    };
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        setError('Please select a valid image file.');
        return;
      }
      setFile(selectedFile);
      setError('');
      setPreviewUrl(null);
      setResultMeta(null);

      const img = new Image();
      const objUrl = URL.createObjectURL(selectedFile);

      if (originalPreviewUrlRef.current) URL.revokeObjectURL(originalPreviewUrlRef.current);
      originalPreviewUrlRef.current = objUrl;
      setOriginalPreviewUrl(objUrl);

      img.onload = () => {
        setOriginalMeta({
          width: img.width,
          height: img.height,
          size: selectedFile.size,
          type: selectedFile.type,
          name: selectedFile.name
        });
        setCustomWidth(img.width);
        setCustomHeight(img.height);
      };
      img.src = objUrl;
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

  const convertImage = () => {
    if (!file) return;
    setIsConverting(true);
    setError('');

    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      img.onload = () => {
        let targetWidth = img.width;
        let targetHeight = img.height;
        
        if (resizeMode === 'percentage') {
          const ratio = resizePercentage / 100;
          targetWidth = Math.max(1, Math.round(img.width * ratio));
          targetHeight = Math.max(1, Math.round(img.height * ratio));
        } else if (resizeMode === 'custom') {
          targetWidth = Math.max(1, parseInt(customWidth) || img.width);
          targetHeight = Math.max(1, parseInt(customHeight) || img.height);
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const mimeType = `image/${format === 'jpg' ? 'jpeg' : format}`;
        
        canvas.toBlob((blob) => {
          if (!blob) {
            setError('Cannot convert image. Please try again.');
            setIsConverting(false);
            return;
          }

          if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
          const newUrl = URL.createObjectURL(blob);
          previewUrlRef.current = newUrl;
          setPreviewUrl(newUrl);
          
          setResultMeta({ 
            width: canvas.width, 
            height: canvas.height, 
            format, 
            size: blob.size 
          });
          
          setIsConverting(false);
        }, mimeType, parseFloat(quality));
        
        URL.revokeObjectURL(objectUrl);
      };
      
      img.onerror = () => {
        setError('Error loading the image for conversion.');
        setIsConverting(false);
        URL.revokeObjectURL(objectUrl);
      };
      
      img.src = objectUrl;

    } catch (err) {
      setError('An error occurred during image conversion.');
      setIsConverting(false);
    }
  };

  const handleDownload = () => {
    if (!previewUrl) return;
    const originalName = originalMeta?.name ? originalMeta.name.split('.')[0] : 'converted_image';
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = `${originalName}_converted.${format}`;
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
            Conversion Settings
          </h2>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-700">Input Image</label>
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
              accept="image/*" 
              className="hidden" 
            />

            {!file ? (
              <div 
                className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={24} className="text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 font-medium">Click to select image</p>
              </div>
            ) : (
              <div className="flex gap-4 p-4 border border-gray-200 rounded-xl bg-gray-50 items-center">
                <div className="w-28 aspect-video shrink-0 bg-white border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                  {originalPreviewUrl && (
                    <img src={originalPreviewUrl} alt="Original" className="w-full h-full object-contain" />
                  )}
                </div>
                {originalMeta && (
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-medium text-gray-900 truncate" title={originalMeta.name}>{originalMeta.name}</p>
                    <p className="text-xs text-gray-500">Size: {formatBytes(originalMeta.size)}</p>
                    <p className="text-xs text-gray-500">Dimensions: {originalMeta.width}x{originalMeta.height} px</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Target Format</label>
            <div className="grid grid-cols-3 gap-2">
              {['png', 'jpg', 'webp'].map(fmt => (
                <button 
                  key={fmt} 
                  onClick={() => setFormat(fmt)} 
                  className={`py-2 px-3 text-sm font-medium rounded-lg border transition-colors ${format === fmt ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {fmt.toUpperCase()}
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
            
            {resizeMode === 'percentage' && (
               <div className="mt-3 flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
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
              </div>
            )}
          </div>

          {(format === 'jpg' || format === 'webp') && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">Quality</label>
                <span className="text-xs text-gray-500">{Math.round(quality * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0.1" 
                max="1.0" 
                step="0.1" 
                value={quality} 
                onChange={(e) => setQuality(parseFloat(e.target.value))} 
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
              />
            </div>
          )}

          <button 
            onClick={convertImage} 
            disabled={isConverting || !file} 
            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors focus:ring-4 focus:ring-blue-200 disabled:opacity-70 flex justify-center items-center gap-2 mt-4"
          >
            <ImageIcon size={18} />
            {isConverting ? 'Converting...' : 'Convert Image'}
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

          <div 
            className="w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl overflow-hidden flex flex-col items-center justify-center p-4 relative"
            style={{ aspectRatio: '16/9' }}
          >
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
              <p className="text-gray-400">Converted image will appear here</p>
            )}
          </div>

          {previewUrl && resultMeta && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="flex flex-wrap gap-4 w-full sm:w-auto">
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
                  <p className="font-medium text-gray-900">
                    {formatBytes(resultMeta.size)}
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
export default ImageTab;
