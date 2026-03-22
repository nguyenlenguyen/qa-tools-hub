import { Film, Image as ImageIcon, Music, ShieldCheck } from 'lucide-react';
import React, { useState } from 'react';

import AudioTab from './AudioTab';
import ImageTab from './ImageTab';
import VideoTab from './VideoTab';

const MediaConverter = () => {
  const [activeTab, setActiveTab] = useState('image');

  const tabs = [
    { id: 'image', label: 'Image', icon: ImageIcon },
    { id: 'audio', label: 'Audio', icon: Music },
    { id: 'video', label: 'Video', icon: Film },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Tab switcher */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Local Processing Notice */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-green-50/50 border border-green-100 rounded-xl text-green-800 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="p-1.5 bg-white rounded-lg shadow-sm border border-green-100">
            <ShieldCheck size={18} className="text-green-600" />
          </div>
          <div className="text-sm leading-tight">
            <p className="font-bold text-green-900">Privacy & Security</p>
            <p className="text-green-700/90 text-xs">All files are processed 100% locally on your browser. We guarantee no data is uploaded to our servers.</p>
          </div>
        </div>
      </div>

      <div style={{ display: activeTab === 'image' ? 'block' : 'none' }}><ImageTab /></div>
      <div style={{ display: activeTab === 'audio' ? 'block' : 'none' }}><AudioTab /></div>
      <div style={{ display: activeTab === 'video' ? 'block' : 'none' }}><VideoTab /></div>
    </div>
  );
};

export default MediaConverter;
