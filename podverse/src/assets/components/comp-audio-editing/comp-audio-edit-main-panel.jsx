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

  // Initialize WaveSurfer
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
      barWidth: Math.max(2, Math.min(4, 3 * zoom)),
      barGap: Math.max(1, Math.min(2, 1 * zoom)),
      height: 80,
      dragToSeek: false, // Disable for custom drag
      backend: 'WebAudio',
      mediaControls: false,
      normalize: true,
      responsive: false,
      pixelRatio: 1,
      interact: false // Disable default interactions
    });

    wavesurferRef.current = wavesurfer;
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
      console.log("WaveSurfer ready for track:", track.name);
      setIsLoading(false);
    });

    wavesurfer.on("error", (e) => {
      console.error("WaveSurfer error:", e);
      setIsLoading(false);
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
  }, [track.url, track.id, zoom, hasPlayed]);

  // Update WaveSurfer progress based on global timeline
  useEffect(() => {
    if (!wavesurferRef.current) return;

    const trackStart = track.startTime || 0;
    const trackEnd = trackStart + track.duration;

    if (isGlobalPlaying && currentTime >= trackStart && currentTime < trackEnd) {
      const progress = (currentTime - trackStart) / track.duration;
      wavesurferRef.current.seekTo(Math.max(0, Math.min(1, progress)));
      
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
    if (wavesurferRef.current && !isLoading) {
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

  const trackWidth = Math.max(400, track.duration * pixelsPerSecond); // Longer waveforms
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
        height: '140px',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Track Header */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-purple-100 border-b border-purple-200">
        <div className="flex items-center gap-3">
          <Move className="w-4 h-4 text-purple-600" />
          <button 
            onClick={handlePlay}
            disabled={isLoading}
            className={`no-drag w-8 h-8 ${isLoading ? 'bg-gray-400' : 'bg-purple-600 hover:bg-purple-700'} text-white rounded-full flex items-center justify-center shadow-sm transition-all duration-200`}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
            ) : isTrackPlaying ? (
              <Pause className="w-3 h-3" />
            ) : (
              <Play className="w-3 h-3 ml-0.5" />
            )}
          </button>
          <div className="text-sm text-purple-700 font-semibold truncate max-w-48">
            {track.name}
          </div>
          {isTrackPlaying && (
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-purple-600 font-medium bg-purple-100 px-2 py-1 rounded">
            {formatTime(track.duration)}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove && onRemove(track.id);
            }}
            className="no-drag w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Waveform Container */}
      <div className="relative p-3">
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
            minHeight: '80px',
            cursor: 'crosshair'
          }}
        />
        
        {/* Split Indicator */}
        {showSplitIndicator && splitPosition && (
          <div 
            className="split-indicator"
            style={{ left: `${splitPosition + 12}px` }}
          />
        )}
        
        {/* Split Tooltip */}
        {showSplitIndicator && splitPosition && (
          <div 
            className="absolute -top-2 bg-red-500 text-white text-xs px-2 py-1 rounded shadow-lg font-medium"
            style={{ left: `${Math.max(0, splitPosition - 20)}px` }}
          >
            Double-click to split
          </div>
        )}
      </div>
    </div>
  );
};

// Multi-track Audio Engine
const MultiTrackAudioEngine = ({ tracks, isPlaying, currentTime, volume, onTimeUpdate, onPlaybackEnd }) => {
  const audioElementsRef = useRef({});
  const intervalRef = useRef(null);
  const startTimeRef = useRef(0);

  // Create and manage audio elements
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
        audio.src = '';
        delete audioElementsRef.current[trackId];
      }
    });
  }, [tracks, volume]);

  // Update volume for all tracks
  useEffect(() => {
    Object.values(audioElementsRef.current).forEach(audio => {
      audio.volume = volume / 100;
    });
  }, [volume]);

  // Handle playback
  useEffect(() => {
    if (isPlaying) {
      startTimeRef.current = Date.now() - (currentTime * 1000);
      
      // Play tracks that should be active at current time
      tracks.forEach(track => {
        const audio = audioElementsRef.current[track.id];
        if (!audio) return;

        const trackStart = track.startTime || 0;
        const trackEnd = trackStart + track.duration;

        if (currentTime >= trackStart && currentTime < trackEnd) {
          const offset = currentTime - trackStart;
          audio.currentTime = offset;
          audio.play().catch(console.error);
        }
      });

      // Time update loop
      intervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        onTimeUpdate(elapsed);
        
        // Check if playback should end
        const maxDuration = Math.max(...tracks.map(t => (t.startTime || 0) + t.duration));
        if (elapsed >= maxDuration) {
          onPlaybackEnd();
        }
      }, 50);

    } else {
      // Pause all audio
      Object.values(audioElementsRef.current).forEach(audio => {
        audio.pause();
      });
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, currentTime, tracks, onTimeUpdate, onPlaybackEnd]);

  return null;
};

// Main Panel Component
export const MainPanel = ({ 
  audioTracks = [], 
  audioBuffers = {}, 
  onRemoveTrack, 
  isPlaying, 
  setIsPlaying, 
  currentTime, 
  setCurrentTime,
  totalDuration = 0, 
  volume, 
  setVolume,
  zoom = 1,
  setZoom
}) => {
  const [tracks, setTracks] = useState([]);
  const [trackStates, setTrackStates] = useState({});
  const containerRef = useRef(null);

  // Convert audioTracks to positioned tracks
  useEffect(() => {
    const newTracks = audioTracks.map((track, index) => ({
      ...track,
      startTime: track.startTime !== undefined ? track.startTime : index * 3 // 3 second spacing
    }));
    setTracks(newTracks);
  }, [audioTracks]);

  // Calculate dynamic total duration
  const dynamicTotalDuration = tracks.reduce((max, track) => 
    Math.max(max, (track.startTime || 0) + track.duration), totalDuration
  );

  const pixelsPerSecond = 80 * zoom; // Enhanced pixels per second for better waveforms
  const trackHeight = 140;

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
    const x = e.clientX - rect.left;
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
                  const containerWidth = 800;
                  const fitZoom = containerWidth / (maxDuration * 80);
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
        <span className="text-sm text-gray-600 ml-2">{Math.round(zoom * 100)}%</span>
      </div>

      {/* Content Area */}
      {tracks.length === 0 ? (
        <div className="flex-1 bg-gray-50 flex justify-center mt-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Music className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No audio files uploaded</h3>
            <p className="text-gray-500 mb-4">Upload audio files from the sidebar to start editing</p>
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
                  <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
                    <div className="relative h-12">
                      {Array.from({ length: Math.ceil(dynamicTotalDuration / 5) + 1 }, (_, i) => {
                        const time = i * 5;
                        const position = time * pixelsPerSecond;
                        const isMajorMarker = time % 10 === 0;
                        return (
                          <div key={time} className="absolute" style={{ left: `${position}px` }}>
                            <span className="absolute top-1 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 font-semibold whitespace-nowrap bg-white px-1 rounded">
                              {time < 60 ? `${time}s` : `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`}
                            </span>
                            <div className={`absolute top-7 left-1/2 transform -translate-x-1/2 w-px ${isMajorMarker ? 'h-5 bg-gray-400' : 'h-3 bg-gray-300'}`}></div>
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
                    style={{ left: `${currentTime * pixelsPerSecond}px` }}
                  >
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full shadow-lg border-2 border-white"></div>
                  </div>
                )}

                {/* Tracks */}
                <div className="relative px-4 py-4" style={{ paddingTop: '60px' }}>
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
    </div>
  );
};

export default MainPanel;