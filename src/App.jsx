import React, { useState, useEffect, useRef } from 'react';
import {
  Download, Image as ImageIcon, Settings, AlertCircle, CheckCircle2,
  Menu, X, Type, Code, FileJson, ChevronRight, Copy, Trash2,
  Maximize2, Minimize2, Check, Clock, CalendarDays, RefreshCw, ArrowRightLeft, Palette,
  Binary, AlignLeft, GitCompare, Network, Search
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
// TOOL 1: IMAGE GENERATOR
// ==========================================
const ImageGenerator = () => {
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
      ctx.fillText(`${canvas.width} x ${canvas.height}`, canvas.width / 2, canvas.height / 2 + fontSize / 2);

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

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 flex justify-between">
              <span>Force File Size (Optional)</span>
              <span className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded">Padding Trick</span>
            </label>
            <div className="flex gap-2">
              <input type="number" placeholder="Empty = original" value={targetSize} onChange={(e) => setTargetSize(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" />
              <select value={sizeUnit} onChange={(e) => setSizeUnit(e.target.value)} className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-shadow">
                <option value="KB">KB</option>
                <option value="MB">MB</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Background</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="h-10 w-10 p-1 border border-gray-300 rounded-lg cursor-pointer" />
                <span className="text-sm text-gray-500 uppercase">{bgColor}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Text Color</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="h-10 w-10 p-1 border border-gray-300 rounded-lg cursor-pointer" />
                <span className="text-sm text-gray-500 uppercase">{textColor}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
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
// TOOL 9: HTTP STATUS CODES CHEAT SHEET (NEW)
// ==========================================
const HTTP_STATUS_CODES = [
  // 1xx
  { code: 100, name: "Continue", cat: "1xx - Informational", desc: "The client should continue the request or ignore the response if the request is already finished." },
  { code: 101, name: "Switching Protocols", cat: "1xx - Informational", desc: "The server has understood the request and is switching to a different protocol." },
  // 2xx
  { code: 200, name: "OK", cat: "2xx - Success", desc: "Standard response for successful HTTP requests. The actual response will depend on the request method used." },
  { code: 201, name: "Created", cat: "2xx - Success", desc: "The request has been fulfilled, resulting in the creation of a new resource." },
  { code: 202, name: "Accepted", cat: "2xx - Success", desc: "The request has been accepted for processing, but the processing has not been completed." },
  { code: 204, name: "No Content", cat: "2xx - Success", desc: "The server successfully processed the request and is not returning any content." },
  // 3xx
  { code: 301, name: "Moved Permanently", cat: "3xx - Redirection", desc: "This and all future requests should be directed to the given URI." },
  { code: 302, name: "Found", cat: "3xx - Redirection", desc: "Tells the client to look at (browse to) another URL. 302 has been superseded by 303 and 307." },
  { code: 304, name: "Not Modified", cat: "3xx - Redirection", desc: "Indicates that the resource has not been modified since the version specified by the request headers." },
  // 4xx
  { code: 400, name: "Bad Request", cat: "4xx - Client Error", desc: "The server cannot or will not process the request due to an apparent client error (e.g., malformed syntax)." },
  { code: 401, name: "Unauthorized", cat: "4xx - Client Error", desc: "Similar to 403 Forbidden, but specifically for use when authentication is required and has failed." },
  { code: 403, name: "Forbidden", cat: "4xx - Client Error", desc: "The request contained valid data and was understood by the server, but the server is refusing action (no permission)." },
  { code: 404, name: "Not Found", cat: "4xx - Client Error", desc: "The requested resource could not be found but may be available in the future. Subsequent requests are permissible." },
  { code: 405, name: "Method Not Allowed", cat: "4xx - Client Error", desc: "A request method is not supported for the requested resource (e.g., a GET request on a form that requires POST)." },
  { code: 408, name: "Request Timeout", cat: "4xx - Client Error", desc: "The server timed out waiting for the request. According to HTTP specifications: 'The client did not produce a request within the time that the server was prepared to wait.'" },
  { code: 409, name: "Conflict", cat: "4xx - Client Error", desc: "Indicates that the request could not be processed because of conflict in the current state of the resource." },
  { code: 422, name: "Unprocessable Entity", cat: "4xx - Client Error", desc: "The request was well-formed but was unable to be followed due to semantic errors." },
  { code: 429, name: "Too Many Requests", cat: "4xx - Client Error", desc: "The user has sent too many requests in a given amount of time. Intended for use with rate-limiting schemes." },
  // 5xx
  { code: 500, name: "Internal Server Error", cat: "5xx - Server Error", desc: "A generic error message, given when an unexpected condition was encountered and no more specific message is suitable." },
  { code: 501, name: "Not Implemented", cat: "5xx - Server Error", desc: "The server either does not recognize the request method, or it lacks the ability to fulfill the request." },
  { code: 502, name: "Bad Gateway", cat: "5xx - Server Error", desc: "The server was acting as a gateway or proxy and received an invalid response from the upstream server." },
  { code: 503, name: "Service Unavailable", cat: "5xx - Server Error", desc: "The server cannot handle the request (because it is overloaded or down for maintenance)." },
  { code: 504, name: "Gateway Timeout", cat: "5xx - Server Error", desc: "The server was acting as a gateway or proxy and did not receive a timely response from the upstream server." },
];

const HttpStatusCodes = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCodes = HTTP_STATUS_CODES.filter(item =>
    item.code.toString().includes(searchTerm) ||
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getBadgeColor = (category) => {
    if (category.startsWith('2')) return 'bg-green-100 text-green-800 border-green-200';
    if (category.startsWith('3')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (category.startsWith('4')) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (category.startsWith('5')) return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search size={20} className="text-gray-400" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by code (e.g. 404) or name (e.g. Not Found)..."
          className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500 transition-shadow text-gray-800"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCodes.length > 0 ? (
          filteredCodes.map((item) => (
            <div key={item.code} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow flex flex-col group">
              <div className="flex justify-between items-start mb-3">
                <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wide rounded border ${getBadgeColor(item.cat)}`}>
                  {item.cat}
                </span>
                <span className="text-2xl font-black font-mono text-gray-300 group-hover:text-gray-400 transition-colors">
                  {item.code}
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                {item.code} {item.name}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed flex-1">
                {item.desc}
              </p>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
            <Network size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No matching status codes found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// CONFIG: TOOLS LIST MANAGEMENT
// ==========================================
const TOOLS_CONFIG = [
  {
    id: 'image-generator',
    name: 'Image Generator',
    description: 'Generate test images with custom dimensions, formats, and size padding.',
    icon: ImageIcon,
    component: ImageGenerator,
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
  },
  {
    id: 'http-status-codes',
    name: 'HTTP Status Codes',
    description: 'Cheat sheet for API HTTP status codes and their meanings.',
    icon: Network,
    component: HttpStatusCodes,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50'
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