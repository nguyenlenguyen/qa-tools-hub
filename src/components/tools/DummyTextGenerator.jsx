import { Check, Copy } from 'lucide-react';
import React, { useCallback, useEffect,useState } from 'react';

import { copyTextToClipboard } from '../../utils/helpers.js';

const DummyTextGenerator = () => {
  const [paragraphs, setParagraphs] = useState(1);
  const [characters, setCharacters] = useState('500');
  const [text, setText] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const generateText = useCallback(() => {
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
  }, [paragraphs, characters]);

  useEffect(() => generateText(), [generateText]);

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


export default DummyTextGenerator;
