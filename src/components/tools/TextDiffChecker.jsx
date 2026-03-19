import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Trash2, GitCompare, Code } from 'lucide-react';

const TextDiffChecker = () => {
  const [originalText, setOriginalText] = useState('');
  const [modifiedText, setModifiedText] = useState('');
  const [diffResult, setDiffResult] = useState(null);

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
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
        diffs.unshift({ type: 'equal', orig: a[i - 1], mod: b[j - 1], origNum: i, modNum: j });
        i--; j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        diffs.unshift({ type: 'add', mod: b[j - 1], modNum: j });
        j--;
      } else {
        diffs.unshift({ type: 'remove', orig: a[i - 1], origNum: i });
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
    const diffs = computeLCS(lines1, lines2);
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
                if (row.type === 'equal') {
                  return (
                    <div key={index} className="flex w-full border-b border-gray-100 hover:bg-gray-100/30">
                      <div className="flex w-1/2 px-2 border-r border-gray-200 text-gray-700">
                        <div className="w-10 shrink-0 text-right pr-3 text-gray-400 select-none border-r border-gray-200 mr-3 text-xs opacity-70 flex flex-col justify-center">{row.origNum}</div>
                        <div className="shrink-0 w-4 select-none flex flex-col justify-center"> </div>
                        <div className="whitespace-pre-wrap flex-1 break-all py-1">{row.orig}</div>
                      </div>
                      <div className="flex w-1/2 px-2 text-gray-700">
                        <div className="w-10 shrink-0 text-right pr-3 text-gray-400 select-none border-r border-gray-200 mr-3 text-xs opacity-70 flex flex-col justify-center">{row.modNum}</div>
                        <div className="shrink-0 w-4 select-none flex flex-col justify-center"> </div>
                        <div className="whitespace-pre-wrap flex-1 break-all py-1">{row.mod}</div>
                      </div>
                    </div>
                  );
                } else if (row.type === 'remove') {
                  return (
                    <div key={index} className="flex w-full border-b border-gray-100">
                      <div className="flex w-1/2 px-2 border-r border-gray-200 bg-red-50/70 text-red-800">
                        <div className="w-10 shrink-0 text-right pr-3 text-gray-400 select-none border-r border-gray-200 mr-3 text-xs opacity-70 flex flex-col justify-center">{row.origNum}</div>
                        <div className="shrink-0 w-4 font-bold select-none text-red-600/70 flex flex-col justify-center">-</div>
                        <div className="whitespace-pre-wrap flex-1 break-all py-1">{row.orig}</div>
                      </div>
                      <div className="flex w-1/2 px-2 text-gray-300">
                        <div className="w-10 shrink-0 text-right pr-3 select-none border-r border-gray-200 mr-3 text-xs opacity-70 flex flex-col justify-center"></div>
                        <div className="shrink-0 w-4 select-none flex flex-col justify-center"> </div>
                        <div className="whitespace-pre-wrap flex-1 break-all py-1"> </div>
                      </div>
                    </div>
                  );
                } else {
                  // type === 'add'
                  return (
                    <div key={index} className="flex w-full border-b border-gray-100">
                      <div className="flex w-1/2 px-2 border-r border-gray-200 text-gray-300">
                        <div className="w-10 shrink-0 text-right pr-3 select-none border-r border-gray-200 mr-3 text-xs opacity-70 flex flex-col justify-center"></div>
                        <div className="shrink-0 w-4 select-none flex flex-col justify-center"> </div>
                        <div className="whitespace-pre-wrap flex-1 break-all py-1"> </div>
                      </div>
                      <div className="flex w-1/2 px-2 bg-green-50/70 text-green-800">
                        <div className="w-10 shrink-0 text-right pr-3 text-gray-400 select-none border-r border-gray-200 mr-3 text-xs opacity-70 flex flex-col justify-center">{row.modNum}</div>
                        <div className="shrink-0 w-4 font-bold select-none text-green-600/70 flex flex-col justify-center">+</div>
                        <div className="whitespace-pre-wrap flex-1 break-all py-1">{row.mod}</div>
                      </div>
                    </div>
                  );
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
