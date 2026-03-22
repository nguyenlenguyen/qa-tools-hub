import { AlignLeft, Trash2 } from 'lucide-react';
import React, {useState } from 'react';

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


export default TextAnalyzer;
