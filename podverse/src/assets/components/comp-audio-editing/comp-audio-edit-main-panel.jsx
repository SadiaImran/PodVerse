import React, { useState, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Settings,
  MoreHorizontal,
  ZoomIn,
  ZoomOut,
  Scissors,
  Move,
  RotateCcw,
  Music
} from 'lucide-react';

// Named export
export const MainPanel = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState('10:08.8');
  const [totalTime, setTotalTime] = useState('17:41.4');
  const [volume, setVolume] = useState(75);
  const [speed, setSpeed] = useState(1);

  const audioTracks = [
    {
      id: 1,
      name: 'Hi-tip-house-no-coffe.mp3',
      startTime: 0,
      duration: 8,
      color: 'bg-purple-500',
      waveform: true
    },
    {
      id: 2,
      name: 'WONDERFULSMILE.mp4',
      startTime: 10,
      duration: 6,
      color: 'bg-purple-500',
      waveform: true
    },
    {
      id: 3,
      name: 'synthwave-memories.mp3',
      startTime: 4,
      duration: 12,
      color: 'bg-purple-600',
      waveform: true
    },
    {
      id: 4,
      name: 'podcast-intro-music.wav',
      startTime: 14,
      duration: 7,
      color: 'bg-purple-600',
      waveform: true
    },
    {
      id: 5,
      name: 'forest-bird-chirping-medium-quiet-ambience.mp3',
      startTime: 8,
      duration: 8,
      color: 'bg-purple-700',
      waveform: true
    }
  ];

  const timeMarkers = ['1m', '2m', '4m', '6m', '8m', '10m', '12m'];

  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-screen">
      {/* Custom CSS for purple theme */}
      <style jsx>{`
        :root {
          --primary: 270 95% 65%;
          --primary-foreground: 0 0% 100%;
          --primary-muted: 270 70% 45%;
        }
      `}</style>

      {/* Top Control Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        {/* Playback Controls */}
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <SkipBack className="w-5 h-5 text-gray-600" />
          </button>
          
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-12 h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center transition-colors"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
          </button>
          
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <SkipForward className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Time Display */}
        <div className="flex items-center gap-2 text-sm font-mono">
          <span className="text-gray-900 font-semibold">{currentTime}</span>
          <span className="text-gray-400">/</span>
          <span className="text-gray-600">{totalTime}</span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-4">
          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-gray-600" />
            <div className="w-20 h-1 bg-gray-200 rounded-full relative">
              <div 
                className="h-full bg-purple-600 rounded-full" 
                style={{ width: `${volume}%` }}
              ></div>
              <div 
                className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 bg-purple-600 rounded-full border-2 border-white shadow-sm"
                style={{ left: `${volume}%`, transform: 'translateX(-50%) translateY(-50%)' }}
              ></div>
            </div>
          </div>

          {/* Speed Control */}
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-600">Speed</span>
          </div>

          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <MoreHorizontal className="w-5 h-5 text-gray-600" />
          </button>

          <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium">
            Background
          </button>
        </div>
      </div>

      {/* Tools Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-gray-600" />
          <span className="text-sm text-gray-700">Split</span>
        </div>
        
        <div className="flex items-center gap-2 ml-auto">
          <button className="p-1.5 hover:bg-gray-100 rounded transition-colors">
            <ZoomOut className="w-4 h-4 text-gray-600" />
          </button>
          <div className="w-24 h-1 bg-gray-200 rounded-full relative mx-2">
            <div className="h-full bg-purple-600 rounded-full w-1/2"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-purple-600 rounded-full border-2 border-white shadow-sm"></div>
          </div>
          <button className="p-1.5 hover:bg-gray-100 rounded transition-colors">
            <ZoomIn className="w-4 h-4 text-gray-600" />
          </button>
          
          <span className="text-sm text-gray-600 ml-2">Fit</span>
        </div>

        <div className="w-6 h-6 bg-gray-300 rounded grid grid-cols-3 gap-0.5 p-1">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="w-1 h-1 bg-gray-600 rounded-full"></div>
          ))}
        </div>
      </div>

      {/* Timeline Area */}
      <div className="flex-1 bg-gray-50 overflow-auto">
        {/* Timeline Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center">
          <div className="flex-1 flex justify-between text-sm text-gray-500 font-mono relative">
            <div className="absolute top-6 left-0 right-0 h-px bg-gray-200"></div>
            {timeMarkers.map((marker, index) => (
              <div key={marker} className="relative">
                <span>{marker}</span>
                <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-px h-4 bg-gray-300"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Audio Tracks Container */}
        <div className="px-6 py-4">
          <div className="relative">
            {/* Playhead */}
            <div className="absolute top-0 bottom-0 left-32 w-0.5 bg-blue-500 z-10">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full"></div>
            </div>

            {/* Track Controls */}
            <div className="space-y-4">
              {audioTracks.map((track, index) => (
                <div key={track.id} className="flex items-center gap-4 min-h-16">
                  {/* Track Handle */}
                  <div className="flex items-center gap-2 w-8">
                    <div className="w-6 h-6 bg-gray-300 rounded grid grid-cols-2 gap-0.5 p-1 cursor-move">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="w-1 h-1 bg-gray-600 rounded-full"></div>
                      ))}
                    </div>
                  </div>

                  {/* Timeline Track */}
                  <div className="flex-1 relative h-16 bg-white rounded-lg border border-gray-200 overflow-hidden">
                    {/* Track Block */}
                    <div 
                      className={`absolute top-2 bottom-2 ${track.color} rounded-md flex items-center justify-between px-3 text-white text-xs cursor-pointer shadow-sm hover:shadow-md transition-shadow`}
                      style={{
                        left: `${(track.startTime / 18) * 100}%`,
                        width: `${(track.duration / 18) * 100}%`,
                        minWidth: '120px'
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Music className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate text-xs opacity-90">{track.name}</span>
                      </div>
                      
                      {/* Waveform representation */}
                      <div className="flex items-center gap-0.5 h-6 opacity-30">
                        {[...Array(20)].map((_, i) => (
                          <div 
                            key={i} 
                            className="w-0.5 bg-white rounded-full"
                            style={{ height: `${Math.random() * 20 + 5}px` }}
                          ></div>
                        ))}
                      </div>
                      
                      </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Also provide default export
export default MainPanel;