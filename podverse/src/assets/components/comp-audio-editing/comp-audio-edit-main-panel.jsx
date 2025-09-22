import React, { useState, useRef, useEffect, useCallback } from 'react';
import WaveSurfer from "wavesurfer.js";
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
  Music,
  Trash2,
  Move
} from 'lucide-react';

// Enhanced scrollbar styles
const scrollbarStyles = `
  .timeline-scrollbar::-webkit-scrollbar {
    height: 12px;
    width: 12px;
  }
  .timeline-scrollbar::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 6px;
  }
  .timeline-scrollbar::-webkit-scrollbar-thumb {
    background: #8b5cf6;
    border-radius: 6px;
    border: 2px solid #f1f5f9;
  }
  .timeline-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #7c3aed;
  }
  .timeline-scrollbar::-webkit-scrollbar-corner {
    background: #f1f5f9;
  }
  .timeline-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #8b5cf6 #f1f5f9;
  }
  .dragging {
    cursor: grabbing !important;
    z-index: 1000 !important;
    transform: scale(1.02);
    box-shadow: 0 8px 32px rgba(139, 92, 246, 0.3);
  }
  .split-indicator {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: linear-gradient(180deg, #ef4444, #dc2626);
    z-index: 10;
    pointer-events: none;
    box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
  }
`;

// Enhanced Draggable Track Component with WaveSurfer
const DraggableTrackWaveform = ({ 
  track, 
  zoom = 1,
  pixelsPerSecond,
  currentTime,
  isGlobalPlaying,
  onPlay, 
  onRemove, 
  onUpdatePosition,
  onSplit,
  onTrackStateChange 
}) => {
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const trackRef = useRef(null);
  const [isTrackPlaying, setIsTrackPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, startTime: 0 });
  const [splitPosition, setSplitPosition] = useState(null);
  const [showSplitIndicator, setShowSplitIndicator] = useState(false);

  // Initialize WaveSurfer with better audio settings
  useEffect(() => {
    if (!waveformRef.current || !track.url) return;

    setIsLoading(true);
    setIsTrackPlaying(false);
    setHasPlayed(false);

    // Destroy existing wavesurfer
    if (wavesurferRef.current) {
      try {
        wavesurferRef.current.destroy();
      } catch (e) {
        console.error("Error destroying existing wavesurfer:", e);
      }
    }

    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: hasPlayed ? "#8b5cf6" : "#9ca3af",
      progressColor: "#a855f7",
      barWidth: Math.max(1, Math.min(3, 2 * zoom)),
      barGap: Math.max(1, 1 * zoom),
      height: 80,
      dragToSeek: false,
      backend: 'WebAudio',
      mediaControls: false,
      normalize: true,
      responsive: true,
      pixelRatio: window.devicePixelRatio || 1,
      interact: false,
      // Better audio quality settings
      audioContext: null, // Let WaveSurfer create its own
      sampleRate: 44100,
      audioRate: 1,
      hideScrollbar: true,
      autoCenter: true,
      fillParent: true,
      minPxPerSec: 50
    });

    wavesurferRef.current = wavesurfer;

    // Load with better error handling
    wavesurfer.load(track.url);

    wavesurfer.on("play", () => {
      setIsTrackPlaying(true);
      setHasPlayed(true);
      onTrackStateChange && onTrackStateChange(track.id, true);
    });

    wavesurfer.on("pause", () => {
      setIsTrackPlaying(false);
      onTrackStateChange && onTrackStateChange(track.id, false);
    });

    wavesurfer.on("ready", () => {
      console.log("WaveSurfer ready for track:", track.name, "Duration:", wavesurfer.getDuration());
      setIsLoading(false);
    });

    wavesurfer.on("error", (e) => {
      console.error("WaveSurfer error for track", track.name, ":", e);
      setIsLoading(false);
    });

    wavesurfer.on("loading", (percent) => {
      console.log(`Loading ${track.name}: ${percent}%`);
    });

    return () => {
      try {
        if (wavesurferRef.current) {
          wavesurferRef.current.destroy();
        }
      } catch (e) {
        console.error("Error destroying wavesurfer:", e);
      }
    };
  }, [track.url, track.id, zoom]);

  // Update WaveSurfer progress based on global timeline with better sync
  useEffect(() => {
    if (!wavesurferRef.current || !wavesurferRef.current.isReady) return;

    const trackStart = track.startTime || 0;
    const trackEnd = trackStart + track.duration;

    if (isGlobalPlaying && currentTime >= trackStart && currentTime < trackEnd) {
      const progress = (currentTime - trackStart) / track.duration;
      const clampedProgress = Math.max(0, Math.min(1, progress));
      
      // Update WaveSurfer progress to match the red playhead
      wavesurferRef.current.seekTo(clampedProgress);
      
      if (!isTrackPlaying) {
        setIsTrackPlaying(true);
        onTrackStateChange && onTrackStateChange(track.id, true);
      }
    } else {
      if (isTrackPlaying && !isDragging) {
        setIsTrackPlaying(false);
        onTrackStateChange && onTrackStateChange(track.id, false);
      }
      if (!isGlobalPlaying) {
        wavesurferRef.current.seekTo(0);
      }
    }
  }, [currentTime, isGlobalPlaying, track.startTime, track.duration, isTrackPlaying, isDragging, onTrackStateChange, track.id]);

  // Drag handlers
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.no-drag')) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      startTime: track.startTime || 0
    });
    e.preventDefault();
  }, [track.startTime]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaTime = deltaX / pixelsPerSecond;
    const newStartTime = Math.max(0, dragStart.startTime + deltaTime);

    onUpdatePosition && onUpdatePosition(track.id, newStartTime);
  }, [isDragging, dragStart, pixelsPerSecond, onUpdatePosition, track.id]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Split functionality
  const handleWaveformMouseMove = (e) => {
    if (isDragging) return;
    
    const rect = waveformRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setSplitPosition(x);
  };

  const handleSplit = (e) => {
    e.stopPropagation();
    if (!splitPosition) return;

    const rect = waveformRef.current.getBoundingClientRect();
    const relativePosition = splitPosition / rect.width;
    const splitTime = relativePosition * track.duration;
    
    if (splitTime > 1 && splitTime < track.duration - 1) {
      onSplit && onSplit(track.id, (track.startTime || 0) + splitTime);
    }
  };

  const handlePlay = () => {
    if (wavesurferRef.current && !isLoading && wavesurferRef.current.isReady) {
      wavesurferRef.current.playPause();
      onPlay && onPlay(track.id);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const trackWidth = track.duration * pixelsPerSecond; // Exact match with timeline
  const trackLeft = (track.startTime || 0) * pixelsPerSecond;

  return (
    <div 
      ref={trackRef}
      className={`absolute bg-white rounded-lg border-2 overflow-hidden shadow-lg transition-all duration-200 ${
        isDragging 
          ? 'dragging border-purple-400' 
          : 'border-gray-200 hover:border-purple-300'
      }`}
      style={{ 
        left: `${trackLeft}px`,
        width: `${trackWidth}px`,
        height: '120px', // Reduced height
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Track Header */}
      <div className="flex items-center justify-between p-2 bg-gradient-to-r from-purple-50 to-purple-100 border-b border-purple-200 min-h-[50px]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Move className="w-4 h-4 text-purple-600 flex-shrink-0" />
          <button 
            onClick={handlePlay}
            disabled={isLoading}
            className={`no-drag w-7 h-7 flex-shrink-0 ${isLoading ? 'bg-gray-400' : 'bg-purple-600 hover:bg-purple-700'} text-white rounded-full flex items-center justify-center shadow-sm transition-all duration-200`}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-2.5 w-2.5 border-b-2 border-white"></div>
            ) : isTrackPlaying ? (
              <Pause className="w-2.5 h-2.5" />
            ) : (
              <Play className="w-2.5 h-2.5 ml-0.5" />
            )}
          </button>
          <div className="text-xs text-purple-700 font-semibold truncate">
            {track.name}
          </div>
          {isTrackPlaying && (
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {trackWidth > 150 && (
            <div className="text-xs text-purple-600 font-medium bg-purple-100 px-1.5 py-0.5 rounded">
              {formatTime(track.duration)}
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove && onRemove(track.id);
            }}
            className="no-drag w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-sm flex-shrink-0"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Waveform Container */}
      <div className="relative p-2">
        <div 
          ref={waveformRef} 
          className="rounded-lg overflow-hidden bg-gray-50 relative"
          onMouseMove={handleWaveformMouseMove}
          onMouseEnter={() => setShowSplitIndicator(true)}
          onMouseLeave={() => {
            setShowSplitIndicator(false);
            setSplitPosition(null);
          }}
          onDoubleClick={handleSplit}
          style={{ 
            minHeight: '60px',
            cursor: 'crosshair'
          }}
        />
        
        {/* Split Indicator */}
        {showSplitIndicator && splitPosition && trackWidth > 100 && (
          <div 
            className="split-indicator"
            style={{ left: `${splitPosition + 8}px` }}
          />
        )}
        
        {/* Split Tooltip */}
        {showSplitIndicator && splitPosition && trackWidth > 100 && (
          <div 
            className="absolute -top-2 bg-red-500 text-white text-xs px-2 py-1 rounded shadow-lg font-medium"
            style={{ left: `${Math.max(0, splitPosition - 20)}px` }}
          >
            Split
          </div>
        )}
      </div>
    </div>
  );
};

// Simplified Multi-track Audio Engine
const MultiTrackAudioEngine = ({ tracks, isPlaying, currentTime, volume, onTimeUpdate, onPlaybackEnd }) => {
  const audioElementsRef = useRef({});
  const intervalRef = useRef(null);
  const startTimeRef = useRef(0);

  // Create audio elements
  useEffect(() => {
    tracks.forEach(track => {
      if (!audioElementsRef.current[track.id]) {
        const audio = new Audio(track.url);
        audio.volume = volume / 100;
        audio.preload = 'auto';
        audioElementsRef.current[track.id] = audio;
      }
    });

    // Clean up removed tracks
    Object.keys(audioElementsRef.current).forEach(trackId => {
      if (!tracks.find(t => t.id === trackId)) {
        const audio = audioElementsRef.current[trackId];
        audio.pause();
        URL.revokeObjectURL(audio.src);
        delete audioElementsRef.current[trackId];
      }
    });
  }, [tracks]);

  // Update volume
  useEffect(() => {
    Object.values(audioElementsRef.current).forEach(audio => {
      audio.volume = volume / 100;
    });
  }, [volume]);

  // Handle playback with corrected timing
  useEffect(() => {
    if (isPlaying) {
      startTimeRef.current = performance.now() - (currentTime * 1000);
      
      intervalRef.current = setInterval(() => {
        const elapsed = (performance.now() - startTimeRef.current) / 1000;
        onTimeUpdate(elapsed);
        
        // Manage track playback
        tracks.forEach(track => {
          const audio = audioElementsRef.current[track.id];
          if (!audio) return;

          const trackStart = track.startTime || 0;
          const trackEnd = trackStart + track.duration;

          if (elapsed >= trackStart && elapsed < trackEnd) {
            const trackTime = elapsed - trackStart;
            if (audio.paused) {
              audio.currentTime = trackTime;
              audio.play().catch(console.error);
            }
          } else if (!audio.paused) {
            audio.pause();
          }
        });
        
        // Check end
        const maxDuration = Math.max(...tracks.map(t => (t.startTime || 0) + t.duration));
        if (elapsed >= maxDuration) {
          onPlaybackEnd();
        }
      }, 50); // Slower updates to match audio better

    } else {
      Object.values(audioElementsRef.current).forEach(audio => audio.pause());
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, tracks, onTimeUpdate, onPlaybackEnd]);

  return null;
};

// Generate a simple audio tone for demonstration
const generateAudioTone = (frequency, duration, sampleRate = 44100) => {
  const samples = duration * sampleRate;
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  
  // WAV header
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples * 2, true);
  
  // Generate tone
  for (let i = 0; i < samples; i++) {
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
    view.setInt16(44 + i * 2, sample * 32767, true);
  }
  
  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
};

// Sample data for demonstration
const generateSampleTracks = () => [
  {
    id: 'track1',
    name: 'Demo Tone A (440Hz)',
    duration: 15,
    startTime: 0,
    url: generateAudioTone(440, 15)
  },
  {
    id: 'track2',
    name: 'Demo Tone C (261Hz)',
    duration: 12,
    startTime: 5,
    url: generateAudioTone(261, 12)
  }
];

// Main Panel Component
export const MainPanel = ({ 
  audioTracks = generateSampleTracks(), 
  audioBuffers = {}, 
  onRemoveTrack, 
  isPlaying: externalIsPlaying, 
  setIsPlaying: externalSetIsPlaying, 
  currentTime: externalCurrentTime, 
  setCurrentTime: externalSetCurrentTime,
  totalDuration = 0, 
  volume: externalVolume = 75, 
  setVolume: externalSetVolume,
  zoom: externalZoom = 1,
  setZoom: externalSetZoom
}) => {
  // Internal state with fallbacks
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  const [internalCurrentTime, setInternalCurrentTime] = useState(0);
  const [internalVolume, setInternalVolume] = useState(75);
  const [internalZoom, setInternalZoom] = useState(1);
  
  const [tracks, setTracks] = useState([]);
  const [trackStates, setTrackStates] = useState({});
  const containerRef = useRef(null);

  // Use external props if provided, otherwise use internal state
  const isPlaying = externalIsPlaying !== undefined ? externalIsPlaying : internalIsPlaying;
  const setIsPlaying = externalSetIsPlaying || setInternalIsPlaying;
  const currentTime = externalCurrentTime !== undefined ? externalCurrentTime : internalCurrentTime;
  const setCurrentTime = externalSetCurrentTime || setInternalCurrentTime;
  const volume = externalVolume !== undefined ? externalVolume : internalVolume;
  const setVolume = externalSetVolume || setInternalVolume;
  const zoom = externalZoom !== undefined ? externalZoom : internalZoom;
  const setZoom = externalSetZoom || setInternalZoom;

  // Convert audioTracks to positioned tracks
  useEffect(() => {
    const newTracks = audioTracks.map((track, index) => ({
      ...track,
      startTime: track.startTime !== undefined ? track.startTime : index * 5 // 5 second spacing
    }));
    setTracks(newTracks);
  }, [audioTracks]);

  // Calculate dynamic total duration
  const dynamicTotalDuration = tracks.reduce((max, track) => 
    Math.max(max, (track.startTime || 0) + track.duration), totalDuration
  );

  const pixelsPerSecond = 50 * zoom;
  const trackHeight = 120; // Reduced to match component

  // Handle track state changes
  const handleTrackStateChange = useCallback((trackId, isPlaying) => {
    setTrackStates(prev => ({
      ...prev,
      [trackId]: isPlaying
    }));
  }, []);

  // Handle playback end
  const handlePlaybackEnd = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setTrackStates({});
  }, [setIsPlaying, setCurrentTime]);

  // Track management functions
  const updateTrackPosition = useCallback((trackId, newStartTime) => {
    setTracks(prev => prev.map(track => 
      track.id === trackId 
        ? { ...track, startTime: Math.max(0, newStartTime) }
        : track
    ));
  }, []);

  const splitTrack = useCallback((trackId, splitTimeAbsolute) => {
    setTracks(prev => {
      const trackIndex = prev.findIndex(t => t.id === trackId);
      if (trackIndex === -1) return prev;

      const originalTrack = prev[trackIndex];
      const splitPoint = splitTimeAbsolute - (originalTrack.startTime || 0);

      if (splitPoint <= 1 || splitPoint >= originalTrack.duration - 1) {
        return prev;
      }

      const firstTrack = {
        ...originalTrack,
        id: `${trackId}_${Date.now()}_1`,
        duration: splitPoint,
        name: `${originalTrack.name} (1)`
      };

      const secondTrack = {
        ...originalTrack,
        id: `${trackId}_${Date.now()}_2`,
        startTime: splitTimeAbsolute,
        duration: originalTrack.duration - splitPoint,
        name: `${originalTrack.name} (2)`
      };

      const newTracks = [...prev];
      newTracks.splice(trackIndex, 1, firstTrack, secondTrack);
      return newTracks;
    });
  }, []);

  const removeTrack = useCallback((trackId) => {
    setTracks(prev => prev.filter(track => track.id !== trackId));
    onRemoveTrack && onRemoveTrack(trackId);
  }, [onRemoveTrack]);

  // Master playback control
  const handleMasterPlayPause = () => {
    const anyTrackPlaying = Object.values(trackStates).some(isPlaying => isPlaying);
    
    if (anyTrackPlaying || isPlaying) {
      setIsPlaying(false);
      setTrackStates({});
    } else {
      setIsPlaying(true);
    }
  };

  // Timeline click handler
  const handleTimelineClick = (e) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 10; // Adjust for offset
    const clickTime = Math.max(0, x / pixelsPerSecond);
    setCurrentTime(Math.min(clickTime, dynamicTotalDuration));
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "00:00.0";
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
  };

  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-screen overflow-hidden">
      <style>{scrollbarStyles}</style>
      
      {/* Multi-track Audio Engine */}
      <MultiTrackAudioEngine
        tracks={tracks}
        isPlaying={isPlaying}
        currentTime={currentTime}
        volume={volume}
        onTimeUpdate={setCurrentTime}
        onPlaybackEnd={handlePlaybackEnd}
      />
      
      {/* Top Control Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setCurrentTime(0)}
            className="p-2 hover:bg-purple-50 rounded-lg transition-colors"
          >
            <SkipBack className="w-4 h-4 text-gray-600" />
          </button>
          
          <button 
            onClick={handleMasterPlayPause}
            className={`w-10 h-10 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center transition-colors shadow-sm ${tracks.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={tracks.length === 0}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          
          <button 
            onClick={() => {
              setIsPlaying(false);
              setCurrentTime(0);
              setTrackStates({});
            }}
            className="p-2 hover:bg-purple-50 rounded-lg transition-colors"
          >
            <SkipForward className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm font-mono">
          <span className="text-gray-900 font-semibold">{formatTime(currentTime || 0)}</span>
          <span className="text-gray-400">/</span>
          <span className="text-gray-600">{formatTime(dynamicTotalDuration)}</span>
          <span className="text-xs text-gray-500 ml-2">
            ({tracks.length} track{tracks.length !== 1 ? 's' : ''})
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-gray-600" />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume && setVolume(parseInt(e.target.value))}
              className="w-16 accent-purple-600"
            />
            <span className="text-sm w-8">{volume}%</span>
          </div>

          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-600">1.0x</span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setZoom && setZoom(Math.max(0.1, zoom - 0.2))}
              className="p-1.5 hover:bg-purple-50 rounded transition-colors"
              disabled={zoom <= 0.1}
            >
              <ZoomOut className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-sm text-gray-600 min-w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button 
              onClick={() => setZoom && setZoom(Math.min(3, zoom + 0.2))}
              className="p-1.5 hover:bg-purple-50 rounded transition-colors"
              disabled={zoom >= 3}
            >
              <ZoomIn className="w-4 h-4 text-gray-600" />
            </button>
            
            <button 
              onClick={() => {
                if (tracks.length > 0 && setZoom) {
                  const maxDuration = Math.max(...tracks.map(track => track.duration));
                  const containerWidth = 600; // Smaller fit width
                  const fitZoom = containerWidth / (maxDuration * 50);
                  const finalZoom = Math.max(0.1, Math.min(3, fitZoom));
                  setZoom(finalZoom);
                }
              }}
              className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors text-sm font-medium"
            >
              Fit
            </button>
          </div>

          <button className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors text-sm font-medium">
            Export
          </button>
        </div>
      </div>

      {/* Tools Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-purple-600" />
          <span className="text-sm text-gray-700">Double-click waveform to split</span>
        </div>
        <span className="text-sm text-gray-600 ml-auto">Zoom: {Math.round(zoom * 100)}%</span>
      </div>

      {/* Content Area */}
      {tracks.length === 0 ? (
        <div className="flex-1 bg-gray-50 flex justify-center mt-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Music className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Multi-Track Audio Editor</h3>
            <p className="text-gray-500 mb-4">Click play to start editing - drag tracks to reposition, double-click to split</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-gray-50 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <div 
              ref={containerRef}
              className="h-full overflow-x-auto overflow-y-auto timeline-scrollbar cursor-crosshair"
              onClick={handleTimelineClick}
            >
              <div 
                className="relative" 
                style={{ 
                  width: `${Math.max(1200, dynamicTotalDuration * pixelsPerSecond + 200)}px`,
                  height: `${Math.max(500, tracks.length * (trackHeight + 20) + 120)}px`
                }}
              >
                {/* Timeline Ruler */}
                {dynamicTotalDuration > 0 && (
                  <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200">
                    <div className="relative h-12">
                      {Array.from({ length: Math.ceil(dynamicTotalDuration / 5) + 1 }, (_, i) => {
                        const time = i * 5;
                        const position = time * pixelsPerSecond;
                        const isMajorMarker = time % 10 === 0;
                        return (
                          <div key={time} className="absolute" style={{ left: `${position + 10}px` }}>
                            <span className="absolute top-1 left-1/2 transform -translate-x-1/2 text-xs text-gray-700 font-semibold whitespace-nowrap bg-white px-2 py-0.5 rounded shadow-sm">
                              {time < 60 ? `${time}s` : `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`}
                            </span>
                            <div className={`absolute top-8 left-1/2 transform -translate-x-1/2 w-px ${isMajorMarker ? 'h-4 bg-gray-500' : 'h-2 bg-gray-300'}`}></div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Playhead */}
                {dynamicTotalDuration > 0 && (
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none shadow-lg" 
                    style={{ left: `${currentTime * pixelsPerSecond + 10}px` }}
                  >
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full shadow-lg border-2 border-white"></div>
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                      {formatTime(currentTime)}
                    </div>
                  </div>
                )}

                {/* Tracks */}
                <div className="relative px-4 py-4" style={{ paddingTop: '80px', paddingLeft: '14px' }}>
                  {tracks.map((track, index) => (
                    <div
                      key={track.id}
                      className="relative"
                      style={{
                        marginBottom: '20px',
                        height: `${trackHeight}px`
                      }}
                    >
                      <DraggableTrackWaveform
                        track={track}
                        zoom={zoom}
                        pixelsPerSecond={pixelsPerSecond}
                        currentTime={currentTime}
                        isGlobalPlaying={isPlaying}
                        onPlay={(trackId) => console.log('Playing track:', trackId)}
                        onRemove={removeTrack}
                        onUpdatePosition={updateTrackPosition}
                        onSplit={splitTrack}
                        onTrackStateChange={handleTrackStateChange}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-between text-sm text-gray-600 flex-shrink-0">
        <div className="flex items-center gap-4">
          <span>Tracks: {tracks.length}</span>
          <span>•</span>
          <span>Duration: {formatTime(dynamicTotalDuration)}</span>
        </div>
        <div className="flex items-center gap-4">
          {isPlaying && (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Playing</span>
            </>
          )}
          <span>Ready</span>
        </div>
      </div>
    </div>
  );
};

export default MainPanel;