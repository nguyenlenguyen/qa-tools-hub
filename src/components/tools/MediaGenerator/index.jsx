import React, { useState } from 'react';
import { Image as ImageIcon, Music, Film } from 'lucide-react';
import ImageTab from './ImageTab';
import AudioTab from './AudioTab';
import VideoTab from './VideoTab';

const MediaGenerator = () => {
  const [activeTab, setActiveTab] = useState('image');

  const tabs = [
    { id: 'image', label: 'Image', icon: ImageIcon },
    { id: 'audio', label: 'Audio', icon: Music },
    { id: 'video', label: 'Video', icon: Film },
  ];

  return (
    <div className="space-y-6">
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

      {/* Keep all tabs mounted to prevent cancelling ongoing generation */}
      <div style={{ display: activeTab === 'image' ? 'block' : 'none' }}><ImageTab /></div>
      <div style={{ display: activeTab === 'audio' ? 'block' : 'none' }}><AudioTab /></div>
      <div style={{ display: activeTab === 'video' ? 'block' : 'none' }}><VideoTab /></div>
    </div>
  );
};

export default MediaGenerator;
