import React, { useState, useEffect, Suspense } from 'react';
import { Code, Menu, X, ChevronRight, Loader2 } from 'lucide-react';
import { TOOLS_CONFIG } from './config/tools.js';

// ==========================================
// MAIN APP
// ==========================================
export default function App() {
  const [activeToolId, setActiveToolId] = useState(() => {
    const saved = localStorage.getItem('qa-tools-active-tool');
    return TOOLS_CONFIG.find(t => t.id === saved) ? saved : TOOLS_CONFIG[0].id;
  });

  // Track which tools have been loaded to preserve state of inactive tabs
  const [loadedTools, setLoadedTools] = useState(() => {
    return { [TOOLS_CONFIG.find(t => t.id === activeToolId) ? activeToolId : TOOLS_CONFIG[0].id]: true };
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('qa-tools-active-tool', activeToolId);
    setLoadedTools(prev => ({ ...prev, [activeToolId]: true }));
  }, [activeToolId]);

  const activeTool = TOOLS_CONFIG.find(t => t.id === activeToolId) || TOOLS_CONFIG[0];

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-800">

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 flex flex-col
        transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="bg-gray-900 text-white p-1.5 rounded-lg shadow-sm">
              <Code size={20} />
            </div>
            <span className="font-bold text-lg text-gray-900 tracking-tight">QA Tools Hub</span>
          </div>
          <button className="lg:hidden text-gray-500 hover:bg-gray-100 p-1.5 rounded-md" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Tools List */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 mt-2">Tool List</p>

          {TOOLS_CONFIG.map((tool) => {
            const isActive = activeToolId === tool.id;
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => {
                  setActiveToolId(tool.id);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left
                  ${isActive
                    ? `bg-gray-900 text-white shadow-md shadow-gray-900/10`
                    : `text-gray-600 hover:bg-gray-100 hover:text-gray-900`
                  }
                `}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-gray-800 text-white' : tool.bgColor + ' ' + tool.color}`}>
                  <Icon size={18} />
                </div>
                <span className="font-medium text-sm flex-1">{tool.name}</span>
                {isActive && <ChevronRight size={16} className="text-gray-400" />}
              </button>
            )
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-100">
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <p className="text-xs text-gray-500 leading-relaxed font-medium">
              Internal tool platform supporting Software Testing & QA processes.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">

        {/* Top Header (Mobile Only) */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 shrink-0 lg:hidden">
          <button
            className="text-gray-600 hover:bg-gray-100 p-2 rounded-md transition-colors"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
        </header>

        {/* Dynamic Tool Content */}
        <div className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="max-w-[1600px] mx-auto h-full flex flex-col">
            {/* Tool Header */}
            <div className="mb-6 shrink-0">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2.5 rounded-xl ${activeTool.bgColor} ${activeTool.color} shadow-sm border border-white/50`}>
                  <activeTool.icon size={24} />
                </div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">{activeTool.name}</h1>
              </div>
              <p className="text-gray-500 text-base">{activeTool.description}</p>
            </div>

            {/* Render loaded tools, hiding inactive ones to preserve state via "display: none" */}
            {TOOLS_CONFIG.map(tool => {
              const ToolComponent = tool.component;
              if (!loadedTools[tool.id]) return null;

              return (
                <div
                  key={tool.id}
                  className="flex-1"
                  style={{ display: activeToolId === tool.id ? 'block' : 'none' }}
                >
                  <Suspense fallback={
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4 py-20">
                      <Loader2 size={32} className="animate-spin text-blue-500" />
                      <p className="text-sm font-medium">Loading component...</p>
                    </div>
                  }>
                    <ToolComponent />
                  </Suspense>
                </div>
              );
            })}
          </div>
        </div>

      </main>

      {/* CSS Scrollbar */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
      `}} />
    </div>
  );
}