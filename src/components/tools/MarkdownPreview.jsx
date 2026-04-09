import { BookOpen, Check, Code, Copy, Download, Eye, Trash2 } from 'lucide-react';
import { marked } from 'marked';
import React, { useCallback, useMemo, useState } from 'react';

import { copyTextToClipboard } from '../../utils/helpers.js';

const DEFAULT_MARKDOWN = `# Markdown Preview

## Features Support

### Text Formatting
- **Bold text** and *italic text*
- ~~Strikethrough~~ and ==highlighted==
- \`inline code\` and [links](https://example.com)

### Lists
1. First item
2. Second item
3. Third item

### Code Blocks
\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
console.log(greet('World'));
\`\`\`

### Blockquote
> "The best way to predict the future is to create it."
> — Peter Drucker

### Table
| Feature | Status | Priority |
|---------|--------|----------|
| Headings | ✅ | High |
| Lists | ✅ | High |
| Code | ✅ | Medium |
| Tables | ✅ | Medium |

### Horizontal Rule
---

### Task List
- [x] Completed task
- [ ] Pending task
- [ ] Another task
`;

const MarkdownPreview = () => {
  const [input, setInput] = useState(DEFAULT_MARKDOWN);
  const [isCopied, setIsCopied] = useState(false);
  const [viewMode, setViewMode] = useState('split'); // 'split', 'preview', 'editor'

  const htmlOutput = useMemo(() => {
    if (!input.trim()) return '';
    return marked.parse(input);
  }, [input]);

  const handleCopyHtml = useCallback(() => {
    if (htmlOutput) {
      copyTextToClipboard(htmlOutput);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  }, [htmlOutput]);

  const handleDownloadHtml = useCallback(() => {
    if (!htmlOutput) return;
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Export</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #333; }
    pre { background: #f5f5f5; padding: 16px; border-radius: 8px; overflow-x: auto; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-family: 'Courier New', monospace; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #ddd; margin: 0; padding: 8px 20px; color: #666; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
    img { max-width: 100%; }
  </style>
</head>
<body>
${htmlOutput}
</body>
</html>`;
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'markdown-export.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [htmlOutput]);

  const clearInput = () => {
    setInput('');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[500px] xl:h-[calc(100vh-16rem)]">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={clearInput} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 size={16} /> <span className="hidden sm:inline">Clear</span>
          </button>
          <div className="w-px h-5 bg-gray-300 mx-2 hidden sm:block"></div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <button
              onClick={() => setViewMode('editor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'editor' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Code size={14} /> <span className="hidden sm:inline">Editor</span>
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'split' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <BookOpen size={14} /> <span className="hidden sm:inline">Split</span>
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'preview' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Eye size={14} /> <span className="hidden sm:inline">Preview</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyHtml}
            disabled={!htmlOutput}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white rounded-lg shadow-sm transition-all duration-200 ${
              isCopied ? 'bg-green-600' : 'bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed'
            }`}
          >
            {isCopied ? <Check size={16} /> : <Copy size={16} />}
            <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Copy HTML'}</span>
          </button>
          <button
            onClick={handleDownloadHtml}
            disabled={!htmlOutput}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Download</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col xl:flex-row min-h-0">
        {/* Editor Panel */}
        <div
          className={`flex flex-col border-b xl:border-b-0 xl:border-r border-gray-200 bg-white relative min-h-[250px] xl:min-h-0 ${
            viewMode === 'preview' ? 'hidden xl:hidden' : 'flex'
          } ${viewMode === 'editor' ? 'xl:flex-1' : 'xl:flex-1'}`}
        >
          <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Markdown Input</span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your Markdown here..."
            className="flex-1 w-full p-4 resize-none outline-none font-mono text-sm leading-relaxed text-gray-800 bg-transparent h-full"
            spellCheck="false"
          />
        </div>

        {/* Preview Panel */}
        <div
          className={`flex flex-col bg-[#fafafa] relative min-h-[250px] xl:min-h-0 ${
            viewMode === 'editor' ? 'hidden xl:hidden' : 'flex'
          } ${viewMode === 'preview' ? 'xl:flex-1' : 'xl:flex-1'}`}
        >
          <div className="px-4 py-2 border-b border-gray-100 bg-white/50 flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Preview</span>
          </div>
          <div className="flex-1 p-4 overflow-auto custom-scrollbar">
            {htmlOutput ? (
              <div
                className="markdown-preview prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: htmlOutput }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                No markdown to preview
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Markdown Preview Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .markdown-preview h1 { font-size: 2em; font-weight: 700; margin: 0.67em 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3em; }
        .markdown-preview h2 { font-size: 1.5em; font-weight: 600; margin: 0.83em 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3em; }
        .markdown-preview h3 { font-size: 1.25em; font-weight: 600; margin: 1em 0; }
        .markdown-preview h4 { font-size: 1em; font-weight: 600; margin: 1.33em 0; }
        .markdown-preview p { margin: 1em 0; line-height: 1.7; }
        .markdown-preview a { color: #3b82f6; text-decoration: underline; }
        .markdown-preview a:hover { color: #2563eb; }
        .markdown-preview strong { font-weight: 700; }
        .markdown-preview em { font-style: italic; }
        .markdown-preview code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: 'Courier New', Courier, monospace; font-size: 0.9em; }
        .markdown-preview pre { background: #1f2937; color: #f9fafb; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 1em 0; }
        .markdown-preview pre code { background: none; padding: 0; color: inherit; }
        .markdown-preview blockquote { border-left: 4px solid #d1d5db; margin: 1em 0; padding: 8px 20px; color: #6b7280; background: #f9fafb; }
        .markdown-preview ul, .markdown-preview ol { margin: 1em 0; padding-left: 2em; }
        .markdown-preview li { margin: 0.5em 0; line-height: 1.6; }
        .markdown-preview table { border-collapse: collapse; width: 100%; margin: 1em 0; }
        .markdown-preview th, .markdown-preview td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; }
        .markdown-preview th { background: #f3f4f6; font-weight: 600; }
        .markdown-preview tr:nth-child(even) { background: #f9fafb; }
        .markdown-preview hr { border: 0; border-top: 2px solid #d1d5db; margin: 2em 0; }
        .markdown-preview img { max-width: 100%; height: auto; margin: 1em 0; }
        .markdown-preview input[type="checkbox"] { margin-right: 8px; }
        .markdown-preview ul:has(input[type="checkbox"]) { list-style: none; margin-left: 0; padding-left: 0; }
      `}} />
    </div>
  );
};

export default MarkdownPreview;
