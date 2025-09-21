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
  Trash2,
  Move
} from 'lucide-react';

// Combined styles
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
  .timeline-scrollbar:hover {
    scrollbar-color: #7c3aed #f1f5f9;
  }
  .dragging {
    cursor: grabbing !important;
    z-index: 1000;
  }
`;

/* ------------------------------------------------------
   AudioTrack Component
------------------------------------------------------ */
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
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, startTime: 0 });

  // Init WaveSurfer
  useEffect(() => {
    if (!waveformRef.current || !track.url) return;

    if (wavesurferRef.current) {
      try {
        wavesurferRef.current.destroy();
      } catch (e) {}
    }

    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#9ca3af',
      progressColor: '#8b5cf6',
      barWidth: 2,
      barGap: 1,
      height: 60,
      interact: false,
      cursorColor: 'transparent'
    });

    wavesurferRef.current = wavesurfer;
    wavesurfer.load(track.url);

    return () => {
      if (wavesurferRef.current) {
        try {
          wavesurferRef.current.destroy();
        } catch (e) {}
      }
    };
  }, [track.url]);

  // Sync with global playback
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

  // Dragging
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.no-drag')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, startTime: track.startTime });
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

  // Split on double click
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
      {/* Header */}
      <div className="flex items-center justify-between p-2 bg-purple-50 border-b">
        <div className="flex items-center gap-2">
          <Move className="w-4 h-4 text-purple-600" />
          <div className="text-sm font-medium text-purple-700 truncate">{track.name}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-purple-600">{formatTime(track.duration)}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(track.id); }}
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

/* ------------------------------------------------------
   AudioEngine (global playback)
------------------------------------------------------ */
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
      Object.values(audioElementsRef.current).forEach(audio => audio.pause());
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, currentTime, tracks, onTimeUpdate, onPlaybackEnd]);

  return null;
};

/* ------------------------------------------------------
   MainPanel Component
------------------------------------------------------ */
export const MainPanel = ({ audioTracks = [], onRemoveTrack, volume = 75, setVolume, zoom = 1, setZoom }) => {
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

  const totalDuration = tracks.reduce((max, t) => Math.max(max, t.startTime + t.duration), 0);
  const pixelsPerSecond = 100 * zoom;
  const trackHeight = 100;

  const handlePlayPause = () => {
    if (tracks.length === 0) return;
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (newTime) => {
    setCurrentTime(Math.max(0, Math.min(newTime, totalDuration)));
  };

  const handlePlaybackEnd = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const updateTrackPosition = (id, newStartTime) => {
    setTracks(prev => prev.map(t => t.id === id ? { ...t, startTime: Math.max(0, newStartTime) } : t));
  };

  const splitTrack = (id, splitTimeAbsolute) => {
    setTracks(prev => {
      const trackIndex = prev.findIndex(t => t.id === id);
      if (trackIndex === -1) return prev;
      const original = prev[trackIndex];
      const splitPoint = splitTimeAbsolute - original.startTime;
      if (splitPoint <= 1 || splitPoint >= original.duration - 1) return prev;

      const first = { ...original, id: `${id}_1_${Date.now()}`, duration: splitPoint };
      const second = { ...original, id: `${id}_2_${Date.now()}`, startTime: splitTimeAbsolute, duration: original.duration - splitPoint };
      const newTracks = [...prev];
      newTracks.splice(trackIndex, 1, first, second);
      return newTracks;
    });
  };

  const removeTrack = (id) => {
    setTracks(prev => prev.filter(t => t.id !== id));
    onRemoveTrack?.(id);
  };

  const handleTimelineClick = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickTime = Math.max(0, x / pixelsPerSecond);
    handleSeek(clickTime);
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-screen overflow-hidden">
      <style>{styles}</style>

      <AudioEngine
        tracks={tracks}
        isPlaying={isPlaying}
        currentTime={currentTime}
        volume={volume}
        onTimeUpdate={setCurrentTime}
        onPlaybackEnd={handlePlaybackEnd}
      />

      {/* Controls */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => handleSeek(0)} className="p-2 hover:bg-gray-100 rounded">
            <SkipBack className="w-5 h-5" />
          </button>
          <button
            onClick={handlePlayPause}
            disabled={tracks.length === 0}
            className={`w-12 h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center ${tracks.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>
          <button onClick={handleStop} className="p-2 hover:bg-gray-100 rounded">
            <SkipForward className="w-5 h-5" />
          </button>
        </div>
        <div className="text-lg font-mono">
          <span className="text-purple-700 font-bold">{formatTime(currentTime)}</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-gray-600">{formatTime(totalDuration)}</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Volume */}
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-gray-600" />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume?.(parseInt(e.target.value))}
              className="w-24"
            />
          </div>
          {/* Zoom */}
          <div className="flex items-center gap-2">
            <button onClick={() => setZoom?.(Math.max(0.5, zoom - 0.25))} className="p-2 hover:bg-gray-100 rounded">
              <ZoomOut className="w-5 h-5" />
            </button>
            <button onClick={() => setZoom?.(Math.min(5, zoom + 0.25))} className="p-2 hover:bg-gray-100 rounded">
              <ZoomIn className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-auto timeline-scrollbar bg-gray-100"
        onClick={handleTimelineClick}
      >
        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
          style={{ left: `${currentTime * pixelsPerSecond}px` }}
        />

        {/* Tracks */}
        <div style={{ height: `${tracks.length * trackHeight}px`, position: 'relative' }}>
          {tracks.map((track, index) => (
            <AudioTrack
              key={track.id}
              track={track}
              zoom={zoom}
              pixelsPerSecond={pixelsPerSecond}
              currentTime={currentTime}
              isGlobalPlaying={isPlaying}
              onRemove={removeTrack}
              onUpdatePosition={updateTrackPosition}
              onSplit={splitTrack}
              trackHeight={trackHeight}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
