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

// Enhanced scrollbar styles with drag functionality
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

// Enhanced Track Waveform Component with WaveSurfer + Drag + Split
const TrackWaveform = ({ track, audioBuffer, isPlaying, currentTime, onPlay, onRemove, zoom = 1, onTrackStateChange, onUpdatePosition, onSplit, onWaveSurferReady }) => {
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

  useEffect(() => {
    if (!waveformRef.current || !track.url) return;

    // Reset playing state for new tracks
    setIsTrackPlaying(false);
    setHasPlayed(false);
    setIsLoading(true);

    // Destroy existing wavesurfer if it exists
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
      barWidth: Math.max(1, Math.min(6, 2 * zoom)),
      barGap: Math.max(0.5, Math.min(3, 1 * zoom)),
      height: 80,
      dragToSeek: true,
      backend: 'WebAudio',
      mediaControls: false,
      normalize: true,
      responsive: true,
      pixelRatio: 1,
    });

    wavesurferRef.current = wavesurfer;

    // Load the audio using the URL
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

    wavesurfer.on("error", (e) => {
      console.error("WaveSurfer error:", e);
    });

    wavesurfer.on("ready", () => {
      console.log("WaveSurfer ready for track:", track.name);
      setIsLoading(false);
      // Notify parent that this WaveSurfer is ready
      onWaveSurferReady && onWaveSurferReady(track.id, wavesurfer);
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
    const deltaTime = deltaX / (50 * zoom); // pixels per second
    const newStartTime = Math.max(0, dragStart.startTime + deltaTime);

    onUpdatePosition && onUpdatePosition(track.id, newStartTime);
  }, [isDragging, dragStart, zoom, onUpdatePosition, track.id]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Global mouse event listeners for drag
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

  const trackWidth = Math.max(400, track.duration * 50 * zoom);
  const trackLeft = (track.startTime || 0) * 50 * zoom;

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
  const [waveSurferInstances, setWaveSurferInstances] = useState({});
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

  const pixelsPerSecond = 50 * zoom;
  const trackHeight = 140;
  
  // Handle track state changes
  const handleTrackStateChange = (trackId, isPlaying) => {
    setTrackStates(prev => ({
      ...prev,
      [trackId]: isPlaying
    }));
  };

  // Handle WaveSurfer ready
  const handleWaveSurferReady = useCallback((trackId, wavesurfer) => {
    setWaveSurferInstances(prev => ({
      ...prev,
      [trackId]: wavesurfer
    }));
  }, []);

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
    // Clean up WaveSurfer instance
    setWaveSurferInstances(prev => {
      const newInstances = { ...prev };
      delete newInstances[trackId];
      return newInstances;
    });
    // Clean up track state
    setTrackStates(prev => {
      const newStates = { ...prev };
      delete newStates[trackId];
      return newStates;
    });
    onRemoveTrack && onRemoveTrack(trackId);
  }, [onRemoveTrack]);

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
      {/* Inject custom scrollbar styles */}
      <style>{scrollbarStyles}</style>
      
      {/* Top Control Bar - Fixed Height */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        {/* Playback Controls */}
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-purple-50 rounded-lg transition-colors">
            <SkipBack className="w-4 h-4 text-gray-600" />
          </button>
          
          <button 
            onClick={() => {
              if (setIsPlaying) {
                // Check if any track is currently playing using our state
                const anyTrackPlaying = Object.values(trackStates).some(isPlaying => isPlaying);
                
                if (anyTrackPlaying) {
                  // If any track is playing, stop all tracks
                  setIsPlaying(false);
                  setTrackStates({}); // Reset all track states
                  // Stop all WaveSurfer instances directly
                  Object.values(waveSurferInstances).forEach(wavesurfer => {
                    if (wavesurfer && wavesurfer.isPlaying()) {
                      wavesurfer.pause();
                    }
                  });
                } else {
                  // If no track is playing, start all tracks
                  setIsPlaying(true);
                  // Start all WaveSurfer instances directly
                  Object.values(waveSurferInstances).forEach(wavesurfer => {
                    if (wavesurfer && !wavesurfer.isPlaying()) {
                      wavesurfer.play();
                    }
                  });
                }
              }
            }}
            className={`w-10 h-10 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center transition-colors shadow-sm ${tracks.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={tracks.length === 0}
          >
            {Object.values(trackStates).some(isPlaying => isPlaying) ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          
          <button className="p-2 hover:bg-purple-50 rounded-lg transition-colors">
            <SkipForward className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Time Display */}
        <div className="flex items-center gap-2 text-sm font-mono">
          <span className="text-gray-900 font-semibold">{formatTime(currentTime || 0)}</span>
          <span className="text-gray-400">/</span>
          <span className="text-gray-600">{formatTime(dynamicTotalDuration)}</span>
          <span className="text-xs text-gray-500 ml-2">
            ({tracks.length} track{tracks.length !== 1 ? 's' : ''})
          </span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-gray-600" />
            <div className="w-16 h-1 bg-gray-200 rounded-full relative">
              <div 
                className="h-full bg-purple-600 rounded-full" 
                style={{ width: `${volume}%` }}
              ></div>
              <div 
                className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 bg-purple-600 rounded-full border-2 border-white shadow-sm cursor-pointer"
                style={{ left: `${volume}%`, transform: 'translateX(-50%) translateY(-50%)' }}
                onClick={(e) => {
                  const rect = e.currentTarget.parentElement.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const newVolume = Math.max(0, Math.min(100, (x / rect.width) * 100));
                  setVolume && setVolume(newVolume);
                }}
              ></div>
            </div>
          </div>

          {/* Speed Control */}
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-600">1.0x</span>
          </div>

          <button className="p-2 hover:bg-purple-50 rounded-lg transition-colors">
            <MoreHorizontal className="w-4 h-4 text-gray-600" />
          </button>

          <button className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors text-sm font-medium">
            Export
          </button>
        </div>
      </div>

      {/* Tools Bar - Fixed Height */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-purple-600" />
          <span className="text-sm text-gray-700">Split</span>
        </div>
        
        <div className="flex items-center gap-2 ml-auto">
          <button 
            onClick={() => setZoom && setZoom(Math.max(0.1, zoom - 0.2))}
            className="p-1.5 hover:bg-purple-50 rounded transition-colors"
            disabled={zoom <= 0.1}
          >
            <ZoomOut className="w-4 h-4 text-gray-600" />
          </button>
          <div className="w-20 h-1 bg-gray-200 rounded-full relative mx-2">
            <div 
              className="h-full bg-purple-600 rounded-full transition-all duration-200" 
              style={{ width: `${Math.min((zoom / 3) * 100, 100)}%` }}
            ></div>
            <div 
              className="absolute top-1/2 w-3 h-3 bg-purple-600 rounded-full border-2 border-white shadow-sm cursor-pointer"
              style={{ 
                left: `${Math.min((zoom / 3) * 100, 100)}%`, 
                transform: 'translateX(-50%) translateY(-50%)' 
              }}
              onClick={(e) => {
                const rect = e.currentTarget.parentElement.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const newZoom = Math.max(0.1, Math.min(3, (x / rect.width) * 3));
                setZoom && setZoom(newZoom);
              }}
            ></div>
          </div>
          <button 
            onClick={() => setZoom && setZoom(Math.min(3, zoom + 0.2))}
            className="p-1.5 hover:bg-purple-50 rounded transition-colors"
            disabled={zoom >= 3}
          >
            <ZoomIn className="w-4 h-4 text-gray-600" />
          </button>
          
          <button 
            onClick={() => {
              if (audioTracks.length > 0 && setZoom) {
                const maxDuration = Math.max(...audioTracks.map(track => track.duration));
                const containerWidth = 800; // Account for padding
                const fitZoom = containerWidth / (maxDuration * 50);
                const finalZoom = Math.max(0.1, Math.min(3, fitZoom));
                setZoom(finalZoom);
              }
            }}
            className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors text-sm font-medium"
          >
            Fit
          </button>
          
          <span className="text-sm text-gray-600 ml-2">{Math.round(zoom * 100)}%</span>
        </div>
      </div>

      {/* Content Area */}
      {tracks.length === 0 ? (
        // Centered Empty State when no tracks
        <div className="flex-1 bg-gray-50 flex justify-center mt-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Music className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No audio files uploaded</h3>
            <p className="text-gray-500 mb-4">Upload audio files from the sidebar to start editing</p>
            <div className="w-full max-w-md h-12 border-2 border-dashed border-purple-300 rounded-lg text-purple-500 flex items-center justify-center gap-2 mx-auto">
              <Music className="w-4 h-4" />
              <span className="text-sm">Your audio tracks will appear here</span>
            </div>
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
                      data-track-id={track.id}
                      style={{
                        marginBottom: '20px',
                        height: `${trackHeight}px`
                      }}
                    >
                      <TrackWaveform
                        track={track}
                        audioBuffer={audioBuffers[track.id]}
                        isPlaying={isPlaying}
                        currentTime={currentTime}
                        zoom={zoom}
                        onPlay={(trackId) => console.log('Playing track:', trackId)}
                        onRemove={removeTrack}
                        onUpdatePosition={updateTrackPosition}
                        onSplit={splitTrack}
                        onTrackStateChange={handleTrackStateChange}
                        onWaveSurferReady={handleWaveSurferReady}
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

// Also provide default export
export default MainPanel;