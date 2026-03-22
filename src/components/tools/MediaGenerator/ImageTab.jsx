import { AlertCircle, CheckCircle2, Download,Image as ImageIcon, Settings } from 'lucide-react';
import React, { useEffect, useRef,useState } from 'react';

import { formatBytes } from '../../../utils/helpers.js';

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
  const [resultMeta, setResultMeta] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const canvasRef = useRef(null);
  const previewUrlRef = useRef(null);

  // Cleanup Object URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

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
            // Note: appended padding makes the file technically invalid for strict format parsers,
            // but most image viewers will still display it correctly.
          } else if (targetBytes < blob.size) {
            setError(`Warning: Original size (${formatBytes(blob.size)}) is already larger than target size.`);
          }
        }

        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        const newUrl = URL.createObjectURL(finalBlob);
        previewUrlRef.current = newUrl;
        setPreviewUrl(newUrl);
        setActualSize(finalBlob.size);
        setResultMeta({ width: canvas.width, height: canvas.height, format, size: finalBlob.size, hasTargetSize: !!(targetSize && parseFloat(targetSize) > 0) });
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
                <input type="number" value={targetSize} onChange={(e) => setTargetSize(e.target.value)} className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" />
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
                  <p className={`font-medium ${resultMeta.hasTargetSize ? 'text-blue-600' : 'text-gray-900'}`}>
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
