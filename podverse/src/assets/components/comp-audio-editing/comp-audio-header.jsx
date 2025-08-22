import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, Square, RotateCcw, RotateCw, Scissors, Download, 
  Upload, Volume2, VolumeX, Mic, FileText, Folder, Settings,
  SkipBack, SkipForward, ZoomIn, ZoomOut, Move, Copy, Trash2
} from 'lucide-react';

// Playback Controls Component
const PlaybackControls = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="flex items-center gap-4">
      <button className="p-2 rounded-lg hover:bg-gray-100">
        <SkipBack size={20} className="text-gray-700" />
      </button>
      
      <button 
        onClick={() => setIsPlaying(!isPlaying)}
        className="bg-black text-white p-3 rounded-full hover:bg-gray-800 transition-colors"
      >
        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
      </button>
      
      <button className="p-2 rounded-lg hover:bg-gray-100">
        <SkipForward size={20} className="text-gray-700" />
      </button>
      
      <div className="text-sm font-mono text-gray-900 mx-4">
        00:00 |  12:00
      </div>
    </div>
  );
};

// Left Toolbar Component
const ToolBar = () => {
  const tools = [
    { id: 'cursor', icon: Move, label: 'Select' },
    { id: 'delete', icon: Trash2, label: 'Delete' },
    { id: 'folder', icon: Folder, label: 'Folder' },
    { id: 'download', icon: Download, label: 'Export' }
  ];

  return (
    <div className="flex items-center gap-3">
      {tools.map((tool) => (
        <button 
          key={tool.id}
          className={`p-2 rounded-lg transition-colors `}
          title={tool.label}
        >
          <tool.icon size={20} className="text-gray-700" />
        </button>
      ))}
    </div>
  );
};

const AudioHeader = () => {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <ToolBar  />
        <PlaybackControls 
        />
        <button className="p-2 rounded-lg hover:bg-gray-100">
          <Settings size={20} className="text-gray-700" />
        </button>
      </div>
    </div>
  );
};
export default AudioHeader;

