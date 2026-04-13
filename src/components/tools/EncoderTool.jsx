import { AlertCircle, Binary, Check, CheckCircle2, Copy, Eye, EyeOff, Loader2, Lock,Settings, Trash2 } from 'lucide-react';
import React, { useEffect,useState } from 'react';

import { copyTextToClipboard } from '../../utils/helpers.js';


// --- Tab: Base64 ---
const Base64Tab = () => {
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[500px] xl:h-[calc(100vh-20rem)]">
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={clearInput} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 size={16} /> <span className="hidden sm:inline">Clear</span>
          </button>
          <div className="w-px h-5 bg-gray-300 mx-2 hidden sm:block"></div>
          <div className="flex bg-white rounded-lg border border-gray-300 overflow-hidden p-0.5">
            <button onClick={() => setMode('encode')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === 'encode' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>Encode</button>
            <button onClick={() => setMode('decode')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === 'decode' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>Decode</button>
          </div>
        </div>
        <button onClick={handleCopy} disabled={!!error || !output}
          className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white rounded-lg shadow-sm transition-all duration-200 ${isCopied ? 'bg-green-600' : 'bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed'}`}>
          {isCopied ? <Check size={16} /> : <Copy size={16} />}
          <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Copy'}</span>
        </button>
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
          <div className="h-10 px-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Input ({mode === 'encode' ? 'Text' : 'Base64'})</span>
          </div>
          <textarea value={input} onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'encode' ? "Enter text to encode (supports Unicode)..." : "Enter Base64 string to decode..."}
            className="flex-1 w-full p-4 resize-none outline-none font-mono text-sm leading-relaxed text-gray-800 bg-transparent h-full"
            spellCheck="false" />
        </div>
        <div className="flex-1 flex flex-col bg-[#fafafa] relative min-h-[250px] xl:min-h-0">
          <div className="h-10 px-4 border-b border-gray-100 bg-white/50 flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Output ({mode === 'encode' ? 'Base64' : 'Text'})</span>
            {!error && output && (
              <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={12} /> Success
              </span>
            )}
          </div>
          <div className="flex-1 p-4 overflow-auto custom-scrollbar">
            {output ? (
              <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-gray-800 break-all">{output}</pre>
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

// --- Tab: AES ---
const AesTab = () => {
  const [mode, setMode] = useState('encrypt');
  const [inputText, setInputText] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [aesMode, setAesMode] = useState('GCM');
  const [library, setLibrary] = useState('webcrypto');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // ── Web Crypto helpers ──────────────────────────────────────
  const getKeyMaterial = async (key) => {
    return crypto.subtle.importKey('raw', new TextEncoder().encode(key), 'PBKDF2', false, ['deriveKey']);
  };
  const deriveKey = async (keyMaterial, salt, alg) => {
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: `AES-${alg}`, length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  };
  const toHex = (buf) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  const fromHex = (hex) => new Uint8Array(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)));

  const processWebCrypto = async () => {
    const keyMaterial = await getKeyMaterial(secretKey);
    if (mode === 'encrypt') {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(aesMode === 'GCM' ? 12 : 16));
      const key = await deriveKey(keyMaterial, salt, aesMode);
      const encrypted = await crypto.subtle.encrypt(
        aesMode === 'GCM' ? { name: 'AES-GCM', iv } : { name: 'AES-CBC', iv },
        key, new TextEncoder().encode(inputText)
      );
      return `${toHex(salt)}:${toHex(iv)}:${toHex(encrypted)}`;
    } else {
      const parts = inputText.trim().split(':');
      if (parts.length !== 3) throw new Error('Invalid format. Expected salt:iv:ciphertext (hex).');
      const salt = fromHex(parts[0]);
      const iv = fromHex(parts[1]);
      const ciphertext = fromHex(parts[2]);
      const key = await deriveKey(keyMaterial, salt, aesMode);
      const decrypted = await crypto.subtle.decrypt(
        aesMode === 'GCM' ? { name: 'AES-GCM', iv } : { name: 'AES-CBC', iv },
        key, ciphertext
      );
      return new TextDecoder().decode(decrypted);
    }
  };

  // ── Crypto-JS helpers ──────────────────────────────────────
  const loadCryptoJS = async () => {
    if (window.CryptoJS) return window.CryptoJS;
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js';
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
    return window.CryptoJS;
  };

  const processCryptoJS = async () => {
    const CryptoJS = await loadCryptoJS();
    // CryptoJS does not support AES-GCM natively; both modes use CBC
    const selectedMode = CryptoJS.mode.CBC;

    if (mode === 'encrypt') {
      const encrypted = CryptoJS.AES.encrypt(inputText, secretKey, {
        mode: selectedMode,
        padding: CryptoJS.pad.Pkcs7,
      });
      return encrypted.toString(); // produces "U2FsdGVkX1..." format
    } else {
      try {
        const decrypted = CryptoJS.AES.decrypt(inputText.trim(), secretKey, {
          mode: selectedMode,
          padding: CryptoJS.pad.Pkcs7,
        });
        const result = decrypted.toString(CryptoJS.enc.Utf8);
        if (!result) throw new Error('Empty result');
        return result;
      } catch {
        throw new Error('Decryption failed. Check your key and input format.');
      }
    }
  };

  const handleProcess = async () => {
    if (!inputText.trim()) { setError('Please enter text to process.'); return; }
    if (!secretKey.trim()) { setError('Please enter a secret key.'); return; }
    setError(''); setOutput(''); setIsProcessing(true);
    try {
      const result = library === 'webcrypto'
        ? await processWebCrypto()
        : await processCryptoJS();
      setOutput(result);
    } catch (err) {
      setError(mode === 'decrypt'
        ? 'Decryption failed. Check your key, algorithm, and input format.'
        : 'Encryption failed: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    if (output) { copyTextToClipboard(output); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); }
  };
  const clear = () => { setInputText(''); setOutput(''); setError(''); };

  const inputPlaceholder = mode === 'encrypt'
    ? 'Enter text to encrypt...'
    : library === 'webcrypto'
      ? 'Paste encrypted string (salt:iv:ciphertext in hex)...'
      : 'Paste encrypted string (U2FsdGVkX1... format)...';

  const outputFormatNote = mode === 'encrypt' && (
    <p className="text-xs text-gray-400 px-1">
      {library === 'webcrypto'
        ? <>Output format: <span className="font-mono">salt:iv:ciphertext</span> — hex encoded.</>
        : <>Output format: <span className="font-mono">U2FsdGVkX1...</span> — Crypto-JS standard Base64.</>}
    </p>
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <div className="xl:col-span-4 space-y-5">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 space-y-5">
          <h2 className="text-lg font-semibold flex items-center gap-2 border-b pb-3">
            <Settings size={18} className="text-gray-400" />
            AES Settings
          </h2>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Library</label>
            <div className="flex gap-2">
              {[
                { id: 'webcrypto', label: 'Web Crypto' },
                { id: 'cryptojs', label: 'Crypto-JS' },
              ].map(l => (
                <button key={l.id} onClick={() => {
                  setLibrary(l.id);
                  if (l.id === 'cryptojs') setAesMode('CBC');
                  setOutput(''); setError('');
                }}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg border transition-colors ${library === l.id ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {l.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400">
              {library === 'webcrypto' ? 'Native browser API — PBKDF2 key derivation, hex output' : 'Crypto-JS library — compatible with CryptoJS.AES, Base64 output'}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Mode</label>
            <div className="flex gap-2">
              {['encrypt', 'decrypt'].map(m => (
                <button key={m} onClick={() => { setMode(m); setOutput(''); setError(''); }}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg border capitalize transition-colors ${mode === m ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Algorithm</label>
            <div className="flex gap-2">
              {['GCM', 'CBC'].map(m => {
                const disabled = library === 'cryptojs' && m === 'GCM';
                return (
                  <button key={m} onClick={() => !disabled && setAesMode(m)} disabled={disabled}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg border transition-colors
                      ${disabled ? 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed' :
                        aesMode === m ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    AES-256-{m}
                  </button>
                );
              })}
            </div>
            {<p className="text-xs text-gray-400">{aesMode === 'GCM' ? 'GCM — recommended, includes authentication tag' : 'CBC — widely compatible, no authentication'}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Secret Key</label>
            <div className="relative">
              <input type={showKey ? 'text' : 'password'} value={secretKey}
                onChange={e => setSecretKey(e.target.value)}
                placeholder="Enter passphrase..."
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm" />
              <button onClick={() => setShowKey(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button onClick={handleProcess} disabled={isProcessing}
            className="w-full py-3 px-4 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors focus:ring-4 focus:ring-indigo-200 disabled:opacity-70 flex justify-center items-center gap-2">
            {isProcessing
              ? <><Loader2 size={18} className="animate-spin" /> Processing...</>
              : <><Binary size={18} /> {mode === 'encrypt' ? 'Encrypt' : 'Decrypt'}</>}
          </button>
        </div>
      </div>

      <div className="xl:col-span-8 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-xl flex items-start gap-2 text-sm border border-red-100">
            <AlertCircle size={16} className="mt-0.5 shrink-0" /><p>{error}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {mode === 'encrypt' ? 'Plaintext Input' : 'Encrypted Input'}
            </span>
            <button onClick={clear} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors">
              <Trash2 size={13} /> Clear
            </button>
          </div>
          <textarea value={inputText} onChange={e => setInputText(e.target.value)}
            placeholder={inputPlaceholder}
            className="w-full h-36 p-4 resize-none outline-none font-mono text-sm text-gray-800"
            spellCheck="false" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {mode === 'encrypt' ? 'Encrypted Output' : 'Decrypted Output'}
            </span>
            {output && (
              <button onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-colors ${isCopied ? 'text-green-700 bg-green-50' : 'text-gray-600 hover:bg-gray-100'}`}>
                {isCopied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
              </button>
            )}
          </div>
          <div className="h-36 p-4 overflow-auto custom-scrollbar">
            {output ? (
              <pre className="font-mono text-sm text-gray-800 whitespace-pre-wrap break-all">{output}</pre>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                {isProcessing ? 'Processing...' : 'Output will appear here'}
              </div>
            )}
          </div>
        </div>

        {outputFormatNote}
      </div>
    </div>
  );
};

// --- Encoder Tool wrapper ---
const EncoderTool = () => {
  const [activeTab, setActiveTab] = useState('base64');
  const tabs = [
    { id: 'base64', label: 'Base64 Encode / Decode', icon: Binary },
    { id: 'aes', label: 'AES Encrypt / Decrypt', icon: Lock },
  ];
  return (
    <div className="space-y-6">
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <Icon size={16} />{tab.label}
            </button>
          );
        })}
      </div>
      <div style={{ display: activeTab === 'base64' ? 'block' : 'none' }}><Base64Tab /></div>
      <div style={{ display: activeTab === 'aes' ? 'block' : 'none' }}><AesTab /></div>
    </div>
  );
};


export default EncoderTool;
