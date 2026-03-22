import { Check, Copy, Palette } from 'lucide-react';
import React, {useState } from 'react';

import { copyTextToClipboard } from '../../utils/helpers.js';

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


export default ColorConverter;
