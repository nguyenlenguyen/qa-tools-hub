import { Code,GitCompare, Trash2 } from 'lucide-react';
import React, {useState } from 'react';

const TextDiffChecker = () => {
  const [originalText, setOriginalText] = useState('');
  const [modifiedText, setModifiedText] = useState('');
  const [diffResult, setDiffResult] = useState(null);
  const [diffMode, setDiffMode] = useState('unified'); // 'unified' as default
  const [showUnchanged, setShowUnchanged] = useState(false); // Hide unchanged by default

  // LCS-based diff algorithm for proper insertion/deletion detection
  const computeLCS = (a, b) => {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
    // Backtrack to build diff
    const diffs = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && i > 0 && a[i - 1] === b[j - 1]) {
        diffs.unshift({ type: 'equal', value: a[i - 1], origNum: i, modNum: j });
        i--; j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        diffs.unshift({ type: 'add', value: b[j - 1], modNum: j });
        j--;
      } else {
        diffs.unshift({ type: 'remove', value: a[i - 1], origNum: i });
        i--;
      }
    }
    return diffs;
  };

  const handleCompare = () => {
    if (!originalText && !modifiedText) {
      setDiffResult(null);
      return;
    }

    const lines1 = originalText.split('\n');
    const lines2 = modifiedText.split('\n');
    const lineDiffs = computeLCS(lines1, lines2);

    // Enhanced Pass: For consecutive (remove, add) pairs, compute word-level diff
    const enhancedDiffs = [];
    for (let i = 0; i < lineDiffs.length; i++) {
      const current = lineDiffs[i];
      const next = lineDiffs[i + 1];

      if (current.type === 'remove' && next && next.type === 'add') {
        const words1 = current.value.split(/(\s+|[.,!?;:()])/).filter(Boolean);
        const words2 = next.value.split(/(\s+|[.,!?;:()])/).filter(Boolean);
        const wordLevelDiffs = computeLCS(words1, words2);
        
        enhancedDiffs.push({
          ...current,
          wordDiff: wordLevelDiffs.filter(d => d.type !== 'add')
        });
        enhancedDiffs.push({
          ...next,
          wordDiff: wordLevelDiffs.filter(d => d.type !== 'remove')
        });
        i++; // Skip next
      } else {
        enhancedDiffs.push(current);
      }
    }

    setDiffResult(enhancedDiffs);
  };

  const clearInputs = () => {
    setOriginalText('');
    setModifiedText('');
    setDiffResult(null);
  };

  const renderTextWithHighlights = (diffs, isRemove) => {
    if (!diffs) return null;
    return diffs.map((d, i) => {
      if (d.type === 'equal') return <span key={i}>{d.value}</span>;
      return (
        <span 
          key={i} 
          className={isRemove ? 'bg-red-200/5 text-red-900 px-0.5 rounded-sm line-through' : 'bg-green-300 text-green-950 px-0.5 rounded-sm font-bold'}
        >
          {d.value}
        </span>
      );
    });
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
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Code size={16} className="text-indigo-500" /> Comparison Result
              </h3>
              
              <div className="flex bg-gray-200/60 p-1 rounded-lg shrink-0">
                <button 
                  onClick={() => setDiffMode('split')}
                  className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${diffMode === 'split' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Split
                </button>
                <button 
                  onClick={() => setDiffMode('unified')}
                  className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${diffMode === 'unified' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Unified
                </button>
              </div>

              <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setShowUnchanged(!showUnchanged)}>
                <div className={`w-8 h-4 rounded-full transition-colors relative ${showUnchanged ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${showUnchanged ? 'left-4.5' : 'left-0.5'}`} />
                </div>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Show Unchanged Lines</span>
              </div>
            </div>

            <div className="flex gap-4 text-xs font-medium shrink-0">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-200 border border-red-300"></span> Original (Removed)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-200 border border-green-300"></span> Modified (Added)</span>
            </div>
          </div>

          <div className="p-0 overflow-x-hidden custom-scrollbar max-h-[600px] overflow-y-auto">
            <div className="w-full flex flex-col font-mono text-sm leading-6 text-gray-800">
              {diffResult.map((row, index) => {
                if (!showUnchanged && row.type === 'equal') return null;

                if (diffMode === 'split') {
                  if (row.type === 'equal') {
                    return (
                      <div key={index} className="flex min-w-full border-b border-gray-100 hover:bg-gray-100/30">
                        <div className="flex w-1/2 px-2 border-r border-gray-200 text-gray-700 bg-white">
                          <div className="w-10 shrink-0 text-right pr-3 text-gray-400 select-none border-r border-gray-200 mr-3 text-xs opacity-70 flex flex-col justify-center">{row.origNum}</div>
                          <div className="shrink-0 w-4 select-none flex flex-col justify-center"> </div>
                          <div className="whitespace-pre-wrap flex-1 break-all py-1">{row.value}</div>
                        </div>
                        <div className="flex w-1/2 px-2 text-gray-700 bg-white border-l border-gray-200">
                          <div className="w-10 shrink-0 text-right pr-3 text-gray-400 select-none border-r border-gray-200 mr-3 text-xs opacity-70 flex flex-col justify-center">{row.modNum}</div>
                          <div className="shrink-0 w-4 select-none flex flex-col justify-center"> </div>
                          <div className="whitespace-pre-wrap flex-1 break-all py-1">{row.value}</div>
                        </div>
                      </div>
                    );
                  } else if (row.type === 'remove') {
                    return (
                      <div key={index} className="flex min-w-full border-b border-gray-100">
                        <div className="flex w-1/2 px-2 border-r border-gray-200 bg-red-50/70 text-red-800">
                          <div className="w-10 shrink-0 text-right pr-3 text-red-300 select-none border-r border-gray-200 mr-3 text-xs opacity-70 flex flex-col justify-center">{row.origNum}</div>
                          <div className="shrink-0 w-4 font-bold select-none text-red-600/70 flex flex-col justify-center">-</div>
                          <div className="whitespace-pre-wrap flex-1 break-all py-1">
                            {row.wordDiff ? renderTextWithHighlights(row.wordDiff, true) : row.value}
                          </div>
                        </div>
                        <div className="flex w-1/2 px-2 bg-gray-50/30 border-l border-gray-200">
                          <div className="w-10 shrink-0 text-right pr-3 select-none border-r border-gray-200 mr-3 text-xs opacity-70 flex flex-col justify-center"></div>
                          <div className="shrink-0 w-4 select-none flex flex-col justify-center"> </div>
                          <div className="whitespace-pre-wrap flex-1 break-all py-1"> </div>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div key={index} className="flex min-w-full border-b border-gray-100">
                        <div className="flex w-1/2 px-2 bg-gray-50/30 border-r border-gray-200">
                          <div className="w-10 shrink-0 text-right pr-3 select-none border-r border-gray-200 mr-3 text-xs opacity-70 flex flex-col justify-center"></div>
                          <div className="shrink-0 w-4 select-none flex flex-col justify-center"> </div>
                          <div className="whitespace-pre-wrap flex-1 break-all py-1"> </div>
                        </div>
                        <div className="flex w-1/2 px-2 bg-green-50/70 text-green-800 border-l border-gray-200">
                          <div className="w-10 shrink-0 text-right pr-3 text-green-300 select-none border-r border-gray-200 mr-3 text-xs opacity-70 flex flex-col justify-center">{row.modNum}</div>
                          <div className="shrink-0 w-4 font-bold select-none text-green-600/70 flex flex-col justify-center">+</div>
                          <div className="whitespace-pre-wrap flex-1 break-all py-1">
                            {row.wordDiff ? renderTextWithHighlights(row.wordDiff, false) : row.value}
                          </div>
                        </div>
                      </div>
                    );
                  }
                } else {
                  // Unified Mode
                  if (row.type === 'equal') {
                    return (
                      <div key={index} className="flex min-w-full border-b border-gray-100 hover:bg-gray-100/30 text-gray-700 bg-white">
                        <div className="flex w-11 shrink-0 text-right pr-3 text-gray-400 select-none border-r border-gray-200 text-xs opacity-70 flex flex-col justify-center">{row.origNum}</div>
                        <div className="flex w-11 shrink-0 text-right pr-3 text-gray-400 select-none border-r border-gray-200 text-xs opacity-70 flex flex-col justify-center">{row.modNum}</div>
                        <div className="shrink-0 w-6 select-none flex flex-col justify-center pl-2"> </div>
                        <div className="whitespace-pre-wrap flex-1 break-all py-1 px-2">{row.value}</div>
                      </div>
                    );
                  } else if (row.type === 'remove') {
                    return (
                      <div key={index} className="flex min-w-full border-b border-gray-100 bg-red-50/70 text-red-800">
                        <div className="flex w-11 shrink-0 text-right pr-3 text-red-300 select-none border-r border-red-100 text-xs opacity-70 flex flex-col justify-center">{row.origNum}</div>
                        <div className="flex w-11 shrink-0 text-right pr-3 select-none border-r border-red-100 text-xs opacity-0 flex flex-col justify-center"></div>
                        <div className="shrink-0 w-6 font-bold select-none text-red-600/70 flex flex-col justify-center pl-2">-</div>
                        <div className="whitespace-pre-wrap flex-1 break-all py-1 px-2">
                           {row.wordDiff ? renderTextWithHighlights(row.wordDiff, true) : row.value}
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div key={index} className="flex min-w-full border-b border-gray-100 bg-green-50/70 text-green-800">
                        <div className="flex w-11 shrink-0 text-right pr-3 select-none border-r border-green-100 text-xs opacity-0 flex flex-col justify-center"></div>
                        <div className="flex w-11 shrink-0 text-right pr-3 text-green-300 select-none border-r border-green-100 text-xs opacity-70 flex flex-col justify-center">{row.modNum}</div>
                        <div className="shrink-0 w-6 font-bold select-none text-green-600/70 flex flex-col justify-center pl-2">+</div>
                        <div className="whitespace-pre-wrap flex-1 break-all py-1 px-2">
                           {row.wordDiff ? renderTextWithHighlights(row.wordDiff, false) : row.value}
                        </div>
                      </div>
                    );
                  }
                }
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TextDiffChecker;
