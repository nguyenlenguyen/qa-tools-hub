import { AlertCircle, Check, CheckCircle2,Copy, Maximize2, Minimize2, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useMemo,useState } from 'react';

import { copyTextToClipboard } from '../../utils/helpers.js';

const JsonFormatter = () => {
  const [input, setInput] = useState('{\n  "name": "QA Tools",\n  "status": "active",\n  "features": ["format", "minify", "validate"],\n  "isAwesome": true,\n  "version": 1.0\n}');
  const [output, setOutput] = useState('');
  const [error, setError] = useState(null);
  const [indent, setIndent] = useState(2);
  const [isCopied, setIsCopied] = useState(false);

  const formatJson = useCallback((action) => {
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
  }, [input, indent]);

  useEffect(() => {
    formatJson('format');
  }, [formatJson]);

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

  const syntaxHighlightNodes = useMemo(() => {
    if (!output) return null;
    const regex = /("(?:\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(output)) !== null) {
      // Push text before match
      if (match.index > lastIndex) {
        parts.push(<span key={`t${lastIndex}`}>{output.slice(lastIndex, match.index)}</span>);
      }
      // Determine color class
      let cls = 'text-blue-500';
      if (/^"/.test(match[0])) {
        cls = /:$/.test(match[0]) ? 'text-purple-600 font-medium' : 'text-emerald-600';
      } else if (/true|false/.test(match[0])) {
        cls = 'text-amber-500 font-bold';
      } else if (/null/.test(match[0])) {
        cls = 'text-gray-400 italic';
      }
      parts.push(<span key={`m${match.index}`} className={cls}>{match[0]}</span>);
      lastIndex = regex.lastIndex;
    }
    // Push remaining text
    if (lastIndex < output.length) {
      parts.push(<span key={`t${lastIndex}`}>{output.slice(lastIndex)}</span>);
    }
    return parts;
  }, [output]);

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
          <div className="h-10 px-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
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
          <div className="h-10 px-4 border-b border-gray-100 bg-white/50 flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Output (Formatted)</span>
            {!error && output && (
              <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={12} /> Valid
              </span>
            )}
          </div>
          <div className="flex-1 p-4 overflow-auto custom-scrollbar relative">
            {output ? (
              <pre className="font-mono text-sm leading-relaxed">
                {syntaxHighlightNodes}
              </pre>
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


export default JsonFormatter;
