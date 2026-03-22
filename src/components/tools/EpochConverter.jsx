import { ArrowRightLeft, CalendarDays, Check, Clock, Copy, RefreshCw } from 'lucide-react';
import React, { useEffect,useState } from 'react';

import { copyTextToClipboard } from '../../utils/helpers.js';

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


export default EpochConverter;
