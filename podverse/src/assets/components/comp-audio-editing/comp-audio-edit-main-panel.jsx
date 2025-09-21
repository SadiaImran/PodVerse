import React, { useState, useRef, useEffect, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  ZoomIn,
  ZoomOut,
  Music,
  Trash2,
  Move
} from 'lucide-react';

// Simple styles
const styles = `
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
    border-radius: 4px;
  }
  .dragging {
    cursor: grabbing !important;
    z-index: 1000;
  }
`;

// Audio Track Component with WaveSurfer
const AudioTrack = ({ 
  track, 
  zoom, 
  pixelsPerSecond,
  currentTime,
  isGlobalPlaying,
  onRemove, 
  onUpdatePosition,
  onSplit,
  trackHeight = 100
}) => {
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const trackRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, startTime: 0 });

  // Initialize WaveSurfer
  useEffect(() => {
    if (!waveformRef.current || !track.url) return;

    if (wavesurferRef.current) {
      try {
        wavesurferRef.current.destroy();
      } catch (e) {
        console.error("Error destroying wavesurfer:", e);
      }
    }

    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#9ca3af',
      progressColor: '#8b5cf6',
      barWidth: 2,
      barGap: 1,
      height: 60,
      dragToSeek: false,
      backend: 'WebAudio',
      mediaControls: false,
      normalize: true,
      responsive: false,
      interact: false,
      cursorColor: 'transparent'
    });

    wavesurferRef.current = wavesurfer;
    wavesurfer.load(track.url);

    wavesurfer.on('ready', () => {
      console.log(`Track ${track.name} loaded`);
    });

    wavesurfer.on('error', (e) => {
      console.error('WaveSurfer error:', e);
    });

    return () => {
      if (wavesurferRef.current) {
        try {
          wavesurferRef.current.destroy();
        } catch (e) {}
      }
    };
  }, [track.url, track.name]);

  // Update progress
  useEffect(() => {
    if (!wavesurferRef.current) return;

    const trackStart = track.startTime;
    const trackEnd = track.startTime + track.duration;

    if (isGlobalPlaying && currentTime >= trackStart && currentTime < trackEnd) {
      const progress = (currentTime - trackStart) / track.duration;
      wavesurferRef.current.seekTo(Math.max(0, Math.min(1, progress)));
    } else if (!isGlobalPlaying) {
      wavesurferRef.current.seekTo(0);
    }
  }, [currentTime, isGlobalPlaying, track.startTime, track.duration]);

  // Drag handlers
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.no-drag')) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      startTime: track.startTime
    });
    e.preventDefault();
  }, [track.startTime]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaTime = deltaX / pixelsPerSecond;
    const newStartTime = Math.max(0, dragStart.startTime + deltaTime);

    onUpdatePosition(track.id, newStartTime);
  }, [isDragging, dragStart, pixelsPerSecond, onUpdatePosition, track.id]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

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

  // Split handler
  const handleSplit = (e) => {
    const rect = waveformRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const relativePosition = x / rect.width;
    const splitTime = relativePosition * track.duration;
    
    if (splitTime > 1 && splitTime < track.duration - 1) {
      onSplit(track.id, track.startTime + splitTime);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const trackWidth = Math.max(300, track.duration * pixelsPerSecond);
  const trackLeft = track.startTime * pixelsPerSecond;

  return (
    <div 
      ref={trackRef}
      className={`absolute bg-white rounded-lg border-2 border-gray-200 shadow-md overflow-hidden transition-all ${
        isDragging ? 'dragging border-purple-400 shadow-lg' : 'hover:border-purple-300'
      }`}
      style={{ 
        left: `${trackLeft}px`,
        width: `${trackWidth}px`,
        height: `${trackHeight}px`,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Track Header */}
      <div className="flex items-center justify-between p-2 bg-purple-50 border-b">
        <div className="flex items-center gap-2">
          <Move className="w-4 h-4 text-purple-600" />
          <div className="text-sm font-medium text-purple-700 truncate">
            {track.name}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-purple-600">{formatTime(track.duration)}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(track.id);
            }}
            className="no-drag w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Waveform */}
      <div className="p-2">
        <div 
          ref={waveformRef}
          className="w-full bg-gray-50 rounded"
          onDoubleClick={handleSplit}
          style={{ cursor: 'crosshair' }}
        />
      </div>
    </div>
  );
};

// Audio Engine for playback
const AudioEngine = ({ tracks, isPlaying, currentTime, volume, onTimeUpdate, onPlaybackEnd }) => {
  const audioElementsRef = useRef({});
  const intervalRef = useRef(null);
  const startTimeRef = useRef(0);

  useEffect(() => {
    tracks.forEach(track => {
      if (!audioElementsRef.current[track.id]) {
        const audio = new Audio(track.url);
        audio.volume = volume / 100;
        audio.preload = 'auto';
        audioElementsRef.current[track.id] = audio;
      }
    });

    Object.keys(audioElementsRef.current).forEach(trackId => {
      if (!tracks.find(t => t.id === trackId)) {
        const audio = audioElementsRef.current[trackId];
        audio.pause();
        audio.src = '';
        delete audioElementsRef.current[trackId];
      }
    });
  }, [tracks, volume]);

  useEffect(() => {
    Object.values(audioElementsRef.current).forEach(audio => {
      audio.volume = volume / 100;
    });
  }, [volume]);

  useEffect(() => {
    if (isPlaying) {
      startTimeRef.current = Date.now() - (currentTime * 1000);
      
      tracks.forEach(track => {
        const audio = audioElementsRef.current[track.id];
        if (!audio) return;

        const trackStart = track.startTime;
        const trackEnd = track.startTime + track.duration;

        if (currentTime >= trackStart && currentTime < trackEnd) {
          const offset = currentTime - trackStart;
          audio.currentTime = offset;
          audio.play().catch(console.error);
        }
      });

      intervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        onTimeUpdate(elapsed);
        
        const maxDuration = Math.max(...tracks.map(t => t.startTime + t.duration));
        if (elapsed >= maxDuration) {
          onPlaybackEnd();
        }
      }, 50);

    } else {
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

// Main Component
export const MainPanel = ({ 
  audioTracks = [], 
  onRemoveTrack, 
  volume = 75, 
  setVolume,
  zoom = 1,
  setZoom
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [tracks, setTracks] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    const newTracks = audioTracks.map((track, index) => ({
      ...track,
      startTime: track.startTime !== undefined ? track.startTime : index * 2
    }));
    setTracks(newTracks);
  }, [audioTracks]);

  const totalDuration = tracks.reduce((max, track) => 
    Math.max(max, track.startTime + track.duration), 0
  );

  const pixelsPerSecond = 100 * zoom;
  const trackHeight = 100;

  const handlePlayPause = useCallback(() => {
    if (tracks.length === 0) return;
    setIsPlaying(!isPlaying);
  }, [isPlaying, tracks.length]);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const handleSeek = useCallback((newTime) => {
    setCurrentTime(Math.max(0, Math.min(newTime, totalDuration)));
  }, [totalDuration]);

  const handlePlaybackEnd = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

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
      const splitPoint = splitTimeAbsolute - originalTrack.startTime;

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
    onRemoveTrack?.(trackId);
  }, [onRemoveTrack]);

  const handleTimelineClick = useCallback((e) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickTime = Math.max(0, x / pixelsPerSecond);
    handleSeek(clickTime);
  }, [pixelsPerSecond, handleSeek]);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-screen overflow-hidden">
      <style>{styles}</style>
      
      {/* Audio Engine */}
      <AudioEngine
        tracks={tracks}
        isPlaying={isPlaying}
        currentTime={currentTime}
        volume={volume}
        onTimeUpdate={setCurrentTime}
        onPlaybackEnd={handlePlaybackEnd}
      />
      
      {/* Control Bar */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => handleSeek(0)}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          
          <button 
            onClick={handlePlayPause}
            disabled={tracks.length === 0}
            className={`w-12 h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center ${
              tracks.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>
          
          <button 
            onClick={handleStop}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        <div className="text-lg font-mono">
          <span className="text-purple-700 font-bold">{formatTime(currentTime)}</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-gray-600">{formatTime(totalDuration)}</span>
          <span className="text-xs text-gray-500 ml-2">
            ({audioTracks.length} track{audioTracks.length !== 1 ? 's' : ''})
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-gray-600" />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume?.(parseInt(e.target.value))}
              className="w-20 accent-purple-600"
            />
            <span className="text-sm w-8">{volume}%</span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setZoom?.(Math.max(0.5, zoom - 0.25))}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button 
              onClick={() => setZoom?.(Math.min(3, zoom + 0.25))}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {tracks.length === 0 ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="text-center">
            <Music className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Audio Files</h3>
            <p className="text-gray-600">Upload audio files to start editing</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <div 
            ref={containerRef}
            className="h-full overflow-auto timeline-scrollbar"
            onClick={handleTimelineClick}
          >
            <div 
              className="relative"
              style={{ 
                width: `${Math.max(1000, totalDuration * pixelsPerSecond + 100)}px`,
                height: `${Math.max(400, tracks.length * 130 + 100)}px`
              }}
            >
              {/* Timeline Ruler */}
              {totalDuration > 0 && (
                <div className="sticky top-0 z-40 bg-white border-b h-12">
                  <div className="relative h-full">
                    {Array.from({ length: Math.ceil(totalDuration / 5) + 1 }, (_, i) => {
                      const time = i * 5;
                      const position = time * pixelsPerSecond;
                      return (
                        <div key={time} className="absolute" style={{ left: `${position}px` }}>
                          <span className="text-sm text-gray-600 bg-white px-2 py-1">
                            {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')}
                          </span>
                          <div className="w-px h-8 bg-gray-300 mt-1" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Playhead */}
              {totalDuration > 0 && (
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none" 
                  style={{ left: `${currentTime * pixelsPerSecond}px` }}
                >
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full" />
                </div>
              )}

              {/* Tracks */}
              <div className="relative pt-4 px-4">
                {tracks.map((track, index) => (
                  <div
                    key={track.id}
                    className="absolute"
                    style={{
                      top: `${index * 130}px`,
                      height: `${trackHeight}px`
                    }}
                  >
                    <AudioTrack
                      track={track}
                      zoom={zoom}
                      pixelsPerSecond={pixelsPerSecond}
                      currentTime={currentTime}
                      isGlobalPlaying={isPlaying}
                      trackHeight={trackHeight}
                      onRemove={removeTrack}
                      onUpdatePosition={updateTrackPosition}
                      onSplit={splitTrack}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainPanel;