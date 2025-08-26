import React, { useState, useRef, useEffect } from 'react';
import { 
  Scissors, Upload, Volume2, Settings ,
  ZoomIn, ZoomOut 
} from 'lucide-react';

import { LuRefreshCcw , LuRedo , LuUndo } from "react-icons/lu";
import BaseLayout from '../components/layouts/BaseLayout';
import AudioHeader from '../components/comp-audio-editing/comp-audio-header';
import Waveform from '../components/comp-audio-editing/comp-audio-waveforms';

// Sidebar Icon Component
const SidebarIcon = ({ icon: Icon }) => (
  <div className="mb-6">
    <Icon size={24} className="text-gray-400" />
  </div>
);

// Timeline Component
const Timeline = ({ currentTime, totalTime, onTimeChange }) => {
  const timeMarkers = ['00:00', '00:05', '00:10', '00:15'];
  
  return (
    <div className="mb-4">
      <TimeMarkers markers={timeMarkers} />
      <TimeRuler 
        currentTime={currentTime} 
        totalTime={totalTime} 
        onTimeChange={onTimeChange} 
      />
    </div>
  );
};

// Time Markers Component
const TimeMarkers = ({ markers }) => (
  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
    {markers.map((marker, index) => (
      <span key={index}>{marker}</span>
    ))}
  </div>
);

// Time Ruler Component
const TimeRuler = ({ currentTime, totalTime, onTimeChange }) => (
  <div className="relative h-8 bg-gray-50 border rounded cursor-pointer" onClick={onTimeChange}>
    {/* Time markers */}
    {[0, 25, 50, 75, 100].map(pos => (
      <div 
        key={pos}
        className="absolute top-0 h-full w-px bg-gray-300"
        style={{ left: `${pos}%` }}
      />
    ))}
    
    <PlayheadIndicator currentTime={currentTime} totalTime={totalTime} />
  </div>
);

// Playhead Indicator Component
const PlayheadIndicator = ({ currentTime, totalTime }) => (
  <div 
    className="absolute top-0 w-px h-full bg-black z-10"
    style={{ left: `${(currentTime / totalTime) * 100}%` }}
  >
    <div className="w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-black -translate-x-1/2"></div>
  </div>
);

// Drop Zone Component
const DropZone = ({ onFileDrop, onFileSelect }) => (
  <div className="mb-6 p-4">
    <div 
      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500 hover:border-gray-400 transition-colors cursor-pointer"
      onDrop={onFileDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <Upload size={32} className="mx-auto mb-3 text-gray-400" />
      <p>Drag and drop media here or</p>
      <input
        type="file"
        accept="audio/*"
        onChange={onFileSelect}
        className="mt-2"
      />
    </div>
  </div>
);

// Audio Track Component
const AudioTrack = ({ clips, onRemoveClip }) => (
  <div className="px-4">
    <div className="flex items-center mb-2">
      <Volume2 size={16} className="text-gray-600 mr-2" />
      <span className="text-sm text-gray-700">Audio Track</span>
    </div>
    <div
      className="bg-gray-50 border rounded-lg p-4 flex gap-4 items-center overflow-x-auto flex-nowrap w-full"
      style={{ minHeight: "70px" }}
    >
      {clips.map((clip, idx) => (
        <AudioClip key={idx} clipData={clip} onRemove={() => onRemoveClip(idx)} />
      ))}
    </div>
  </div>
);

// Audio Clip Component
const AudioClip = ({ clipData, onRemove }) => (
  <div 
    className="relative bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg px-3 py-2 text-white text-sm font-medium inline-block group hover:shadow-lg transition-all duration-200"
    style={{ width: '200px' }}
  >
    {/* Remove button */}
    <button
      onClick={onRemove}
      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-100 transition-opacity duration-200 text-xs font-bold shadow-md"
      title="Remove clip"
    >
      ×
    </button>
    
    <ClipInfo name={clipData.name} duration={clipData.duration} />
    <div className="flex items-center h-4 mt-1 gap-px">
      {Array.from({ length: 40 }, (_, i) => (
        <div
          key={i}
          className="w-1 bg-white/80 rounded"
          style={{ height: `${Math.random() * 16 + 4}px` }}
        />
      ))}
    </div>
  </div>
);

// Clip Info Component
const ClipInfo = ({ name, duration }) => (
  <div className="flex items-center gap-2">
    <span>{name}</span>
    <span className="text-xs opacity-75">{duration}</span>
  </div>
);


// Waveform Editor Component
const WaveformEditor = ({ zoom, setZoom, waveformData, currentTime, totalTime }) => (
  <div className="mb-6">
    <WaveformHeader zoom={zoom} setZoom={setZoom} />
    <WaveformDisplay 
      waveformData={waveformData} 
      currentTime={currentTime} 
      totalTime={totalTime}
      zoom={zoom}
    />
  </div>
);

// Waveform Header Component
const WaveformHeader = ({ zoom, setZoom }) => (
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-semibold text-gray-800">Waveform</h3>
    <ZoomControls zoom={zoom} setZoom={setZoom} />
  </div>
);

// Zoom Controls Component
const ZoomControls = ({ zoom, setZoom }) => (
  <div className="flex items-center gap-2">
    <button 
      onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
      className="p-2 rounded hover:bg-gray-100"
    >
      <ZoomOut size={16} className="text-gray-600" />
    </button>
    
    <span className="text-sm text-gray-600 min-w-[50px] text-center">
      {Math.round(zoom * 100)}%
    </span>
    
    <button 
      onClick={() => setZoom(Math.min(3, zoom + 0.25))}
      className="p-2 rounded hover:bg-gray-100"
    >
      <ZoomIn size={16} className="text-gray-600" />
    </button>
  </div>
);

// Waveform Display Component
const WaveformDisplay = ({ waveformData, currentTime, totalTime, zoom }) => (
  <div className="relative flex-1 h-32 bg-gray-100 rounded-lg overflow-hidden border">
    <WaveformBars 
      waveformData={waveformData} 
      currentTime={currentTime} 
      totalTime={totalTime}
      zoom={zoom}
    />
    <PlayheadIndicator currentTime={currentTime} totalTime={totalTime} />
    <SelectionArea />
  </div>
);

// Waveform Bars Component
const WaveformBars = ({ waveformData, currentTime, totalTime, zoom }) => (
  <div className="flex items-center h-full px-2">
    {waveformData.slice(0, Math.floor(800 * zoom)).map((bar, index) => (
      <div
        key={index}
        className="w-px mx-px"
        style={{
          height: `${bar.amplitude * 100}%`,
          backgroundColor: index < (currentTime / totalTime) * waveformData.length 
            ? '#22d3ee' 
            : '#94a3b8'
        }}
      />
    ))}
  </div>
);

// Selection Area Component
const SelectionArea = () => (
  <div 
    className="absolute top-0 h-full bg-blue-200 opacity-30 border border-blue-400"
    style={{ left: '30%', width: '25%' }}
  >
    <div className="absolute left-0 top-0 w-2 h-full bg-blue-500 cursor-w-resize"></div>
    <div className="absolute right-0 top-0 w-2 h-full bg-blue-500 cursor-e-resize"></div>
  </div>
);

// Bottom Controls Component
const BottomControls = ({ onSave, onCancel }) => (
  <div className="flex items-center justify-between">
    <ActionButtons />
    <SaveButtons onSave={onSave} onCancel={onCancel} />
  </div>
);

// Action Buttons Component
const ActionButtons = () => {
  const actions = [
    { icon : Scissors, label: 'Slip at 00:20:20', style: 'text-blue-600 hover:text-blue-700' },
    { icon : Scissors, label: 'Trim clip', style: 'text-blue-600 hover:text-blue-700' },
    { icon : LuRefreshCcw, label: 'Revert to original', style: 'text-gray-600 hover:text-gray-700' },
    { icon : LuUndo  ,label: 'Undo', style: 'text-gray-600 hover:text-gray-700' },
    { icon : LuRedo,label: 'Redo', style: 'text-gray-600 hover:text-gray-700' }
  ];

  return (
    <div className="flex items-center gap-4">
      {actions.map((action, index) => (
        <button key={index} className={`text-sm ${action.style} flex items-center gap-3`}>
         <action.icon size={20} className="text-gray-700" />
          {action.label}
          
        </button>
      ))}
    </div>
  );
};

// Save Buttons Component
const SaveButtons = ({ onSave, onCancel }) => (
  <div className="flex items-center gap-3">
    <button 
      onClick={onCancel}
      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
    >
      Cancel
    </button>
    
    <button 
      onClick={onSave}
      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
    >
      Save changes
    </button>
  </div>
);

// ============= MAIN COMPONENT =============

const AudioEditor = () => {
  const [currentTime, setCurrentTime] = useState(0); // Start at 0
  const [totalTime, setTotalTime] = useState(305);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioClips, setAudioClips] = useState([]);

  // Drag & drop handler
  const handleFileDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      audio.onloadedmetadata = () => {
        if(audioUrl == ""){
          setAudioUrl(url);
        }
        setAudioClips(prev => [
          ...prev,
          {
            name: file.name,
            url,
            duration: formatDuration(audio.duration),
            durationSeconds: audio.duration // <-- add this
          }
        ]);
      };
    }
  };

  // File select handler
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      audio.onloadedmetadata = () => {
         if(audioUrl == ""){
          setAudioUrl(url);
        }
        setAudioClips(prev => [
          ...prev,
          {
            name: file.name,
            url,
            duration: formatDuration(audio.duration),
            durationSeconds: audio.duration // <-- add this
          }
        ]);
      };
    }
  };

  const handleRemoveClip = (idx) => {
    setAudioClips(prev => prev.filter((_, i) => i !== idx));
  };

  // Helper to format duration as mm:ss
  function formatDuration(seconds) {
    const min = Math.floor(seconds / 60).toString().padStart(2, "0");
    const sec = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${min}:${sec}`;
  }

  const handleSave = () => {
    console.log('Saving changes...');
  };

  const handleCancel = () => {
    console.log('Cancelling changes...');
  };

  return (
    <BaseLayout>
      <main className="p-6 bg-gray-50 flex flex-col">
        {/* Heading Line */}
        <div className="text-3xl font-headingPoppins font-bold text-light-purple mb-6">🎶 Shape Your Sound, Your Way</div>
        
        {/* Main Content Editing */}
        <div className="border-2 mt-6 mb-6 rounded-2xl shadow-md overflow-hidden">
          <AudioHeader />
          <DropZone onFileDrop={handleFileDrop} onFileSelect={handleFileSelect} />
          <AudioTrack clips={audioClips} onRemoveClip={handleRemoveClip}/>
          <div className="flex-1  p-6">
            {audioClips.length > 0 && (
              <div className="flex gap-2 overflow-x-auto w-full">
                {audioClips.map((clip, idx) => {
                  // Calculate start time for each waveform (for future use)
                  const startTime = audioClips
                    .slice(0, idx)
                    .reduce((sum, c) => sum + (c.durationSeconds || 0), 0);

                  return (
                    <Waveform
                      key={clip.url}
                      url={clip.url}
                      duration={clip.durationSeconds}
                      // startTime={startTime} // If you want to use for advanced features
                    />
                  );
                })}
              </div>
            )}
            <BottomControls onSave={handleSave} onCancel={handleCancel} />
          </div>
        </div>
      </main>
    </BaseLayout>
  );
};
export default AudioEditor;