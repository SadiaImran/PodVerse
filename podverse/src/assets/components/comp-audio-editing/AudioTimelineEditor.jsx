import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Pause, Scissors, Copy, Trash2, ZoomIn, ZoomOut, Grip } from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';

/**
 * Audio Timeline Editor Component
 * 
 * A professional audio editing interface similar to video editor with:
 * - Timeline with drag-and-drop tracks
 * - Trim handles (resize start/end)
 * - Split/splice functionality
 * - Context menu for actions
 * - Professional UI matching video editor style
 */

// Audio Track Item Component with Trim Handles
const AudioTrackItem = ({
  track,
  totalDuration,
  pixelsPerSecond,
  isSelected,
  isDragging,
  currentTime,
  onSelect,
  onDragStart,
  onResizeStart,
  onResizeEnd,
  onDelete,
  onDuplicate,
  onSplit,
  onContextMenuChange,
  zoomScale = 1
}) => {
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const itemRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResizing, setIsResizing] = useState(false);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!waveformRef.current || !track.url) return;

    setIsLoading(true);

    if (wavesurferRef.current) {
      try {
        wavesurferRef.current.destroy();
      } catch (e) {
        console.error("Error destroying wavesurfer:", e);
      }
    }

    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "#a8a8a8",
      progressColor: "#6366f1",
      barWidth: Math.max(2, Math.min(4, 3 * zoomScale)),
      barGap: Math.max(1, 1 * zoomScale),
      height: 60,
      dragToSeek: false,
      backend: 'WebAudio',
      mediaControls: false,
      normalize: true,
      responsive: true,
      pixelRatio: window.devicePixelRatio || 1,
      interact: false,
      hideScrollbar: true,
      autoCenter: true,
      fillParent: true,
      minPxPerSec: 50,
      barRadius: 2
    });

    wavesurferRef.current = wavesurfer;
    wavesurfer.load(track.url);

    wavesurfer.on("ready", () => {
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
  }, [track.url, zoomScale]);

  // Update progress
  useEffect(() => {
    if (!wavesurferRef.current || !wavesurferRef.current.isReady) return;

    const trackStart = track.startTime || 0;
    const trackEnd = trackStart + track.duration;

    if (currentTime >= trackStart && currentTime < trackEnd) {
      const progress = (currentTime - trackStart) / track.duration;
      const clampedProgress = Math.max(0, Math.min(1, progress));
      wavesurferRef.current.seekTo(clampedProgress);
    } else {
      wavesurferRef.current.seekTo(0);
    }
  }, [currentTime, track.startTime, track.duration]);

  const itemLeft = ((track.startTime || 0) / totalDuration) * 100;
  const itemWidth = (track.duration / totalDuration) * 100;

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenuChange(true, { x: e.clientX, y: e.clientY });
  };

  return (
    <div
      ref={itemRef}
      className={`absolute inset-y-[2px] rounded-md shadow-md cursor-grab group
        ${isDragging ? 'opacity-50' : ''}
        ${isSelected ? 'border-2 border-indigo-500' : 'border border-gray-300'}
        bg-gradient-to-r from-indigo-50 to-purple-50
        select-none pointer-events-auto overflow-hidden
        hover:shadow-lg transition-all`}
      style={{
        left: `${itemLeft}%`,
        width: `${itemWidth}%`,
        zIndex: isDragging ? 1 : isSelected ? 35 : 30,
      }}
      onMouseDown={(e) => {
        if (!e.target.closest('.resize-handle')) {
          onSelect(track.id);
          onDragStart('move', e);
        }
      }}
      onContextMenu={handleContextMenu}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(track.id);
      }}
    >
      {/* Track Label */}
      <div className="absolute top-1 left-2 z-10">
        <div className="text-xs font-semibold text-gray-800 bg-white/80 px-2 py-0.5 rounded">
          {track.name}
        </div>
      </div>

      {/* Waveform */}
      <div className="absolute inset-0 pt-8">
        <div
          ref={waveformRef}
          className="w-full h-full"
          style={{ minHeight: '50px' }}
        />
      </div>

      {/* Trim Handle - Left */}
      <div
        className="resize-handle absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-50
          bg-gray-400/20 backdrop-blur-sm
          hover:bg-indigo-400/40 opacity-0 group-hover:opacity-100
          transition-all duration-200 ease-in-out
          border-r border-indigo-400/30"
        onMouseDown={(e) => {
          e.stopPropagation();
          onSelect(track.id);
          setIsResizing(true);
          onResizeStart(e, track.id);
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="space-x-0.5 flex">
            <div className="w-[1px] h-4 bg-indigo-600/90 rounded-full" />
            <div className="w-[1px] h-4 bg-indigo-600/90 rounded-full" />
          </div>
        </div>
      </div>

      {/* Trim Handle - Right */}
      <div
        className="resize-handle absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-50
          bg-gray-400/20 backdrop-blur-sm
          hover:bg-indigo-400/40 opacity-0 group-hover:opacity-100
          transition-all duration-200 ease-in-out
          border-l border-indigo-400/30"
        onMouseDown={(e) => {
          e.stopPropagation();
          onSelect(track.id);
          setIsResizing(true);
          onResizeEnd(e, track.id);
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="space-x-0.5 flex">
            <div className="w-[1px] h-4 bg-indigo-600/90 rounded-full" />
            <div className="w-[1px] h-4 bg-indigo-600/90 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

// Context Menu Component
const AudioTrackContextMenu = ({
  isOpen,
  position,
  onClose,
  onDelete,
  onDuplicate,
  onSplit,
  trackId
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-[150px]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="py-1">
        <button
          onClick={() => {
            onSplit(trackId);
            onClose();
          }}
          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
        >
          <Scissors className="w-4 h-4" />
          Split
        </button>
        <button
          onClick={() => {
            onDuplicate(trackId);
            onClose();
          }}
          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
        >
          <Copy className="w-4 h-4" />
          Duplicate
        </button>
        <button
          onClick={() => {
            onDelete(trackId);
            onClose();
          }}
          className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>
    </div>
  );
};

// Main Audio Timeline Editor Component
const AudioTimelineEditor = ({
  tracks = [],
  onTracksChange,
  isPlaying = false,
  currentTime = 0,
  onTimeChange,
  onPlayPause,
  totalDuration = 0
}) => {
  const [internalSelectedTrackId, setInternalSelectedTrackId] = useState(null);
  const selectedTrackId = externalSelectedTrackId !== undefined ? externalSelectedTrackId : internalSelectedTrackId;
  const setSelectedTrackId = onTrackSelect || setInternalSelectedTrackId;
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTrack, setDraggedTrack] = useState(null);
  const [dragAction, setDragAction] = useState(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [contextMenu, setContextMenu] = useState({ isOpen: false, position: { x: 0, y: 0 } });
  const timelineRef = useRef(null);
  const dragInfoRef = useRef(null);

  const dynamicTotalDuration = tracks.length > 0
    ? Math.max(...tracks.map(t => (t.startTime || 0) + t.duration), totalDuration)
    : totalDuration || 10;

  // Handle drag start
  const handleDragStart = useCallback((action, e, trackId = null) => {
    const track = trackId ? tracks.find(t => t.id === trackId) : draggedTrack;
    if (!track) return;

    setIsDragging(true);
    setDraggedTrack(track);
    setDragAction(action);

    const startX = e.clientX;
    const startY = e.clientY;
    const startTime = track.startTime || 0;
    const startDuration = track.duration;

    dragInfoRef.current = {
      trackId: track.id,
      action,
      startX,
      startY,
      startTime,
      startDuration,
    };

    const handleMouseMove = (moveEvent) => {
      if (!dragInfoRef.current || !timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const deltaX = moveEvent.clientX - dragInfoRef.current.startX;
      const pixelsPerSecond = (rect.width / dynamicTotalDuration) * zoomScale;
      const deltaTime = deltaX / pixelsPerSecond;

      const updatedTracks = tracks.map(t => {
        if (t.id !== dragInfoRef.current.trackId) return t;

        let newStartTime = dragInfoRef.current.startTime;
        let newDuration = dragInfoRef.current.startDuration;

        if (dragInfoRef.current.action === 'move') {
          newStartTime = Math.max(0, dragInfoRef.current.startTime + deltaTime);
        } else if (dragInfoRef.current.action === 'resize-start') {
          const newStart = Math.max(0, dragInfoRef.current.startTime + deltaTime);
          const newDur = dragInfoRef.current.startDuration - deltaTime;
          if (newDur > 0.1 && newStart >= 0) {
            newStartTime = newStart;
            newDuration = newDur;
          }
        } else if (dragInfoRef.current.action === 'resize-end') {
          const newDur = Math.max(0.1, dragInfoRef.current.startDuration + deltaTime);
          newDuration = newDur;
        }

        return {
          ...t,
          startTime: newStartTime,
          duration: newDuration,
        };
      });

      onTracksChange(updatedTracks);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDraggedTrack(null);
      setDragAction(null);
      dragInfoRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [tracks, draggedTrack, dynamicTotalDuration, zoomScale, onTracksChange]);

  // Handle resize start
  const handleResizeStart = useCallback((e, trackId) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;
    handleDragStart('resize-start', e, trackId);
  }, [tracks, handleDragStart]);

  // Handle resize end
  const handleResizeEnd = useCallback((e, trackId) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;
    handleDragStart('resize-end', e, trackId);
  }, [tracks, handleDragStart]);

  // Handle split
  const handleSplit = useCallback((trackId) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    const trackStart = track.startTime || 0;
    const trackEnd = trackStart + track.duration;

    if (currentTime <= trackStart || currentTime >= trackEnd) {
      alert(`Playhead must be within the track to split. Track: ${trackStart.toFixed(1)}s - ${trackEnd.toFixed(1)}s, Playhead: ${currentTime.toFixed(1)}s`);
      return;
    }

    const splitPoint = currentTime - trackStart;

    if (splitPoint <= 0.5 || splitPoint >= track.duration - 0.5) {
      alert("Cannot split too close to the beginning or end. Leave at least 0.5 seconds on each side.");
      return;
    }

    const firstPart = {
      ...track,
      id: `${trackId}_${Date.now()}_1`,
      name: `${track.name} (Part 1)`,
      duration: splitPoint,
    };

    const secondPart = {
      ...track,
      id: `${trackId}_${Date.now()}_2`,
      name: `${track.name} (Part 2)`,
      startTime: currentTime,
      duration: track.duration - splitPoint,
    };

    const updatedTracks = tracks.map(t => t.id === trackId ? firstPart : t);
    const insertIndex = updatedTracks.findIndex(t => t.id === firstPart.id) + 1;
    updatedTracks.splice(insertIndex, 0, secondPart);

    onTracksChange(updatedTracks);
    if (setSelectedTrackId) {
      setSelectedTrackId(null);
    }
  }, [tracks, currentTime, onTracksChange, setSelectedTrackId]);

  // Handle duplicate
  const handleDuplicate = useCallback((trackId) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    const duplicated = {
      ...track,
      id: `${trackId}_duplicate_${Date.now()}`,
      name: `${track.name} (Copy)`,
      startTime: (track.startTime || 0) + track.duration + 1,
    };

    onTracksChange([...tracks, duplicated]);
  }, [tracks, onTracksChange]);

  // Handle delete
  const handleDelete = useCallback((trackId) => {
    if (window.confirm('Are you sure you want to delete this track?')) {
      onTracksChange(tracks.filter(t => t.id !== trackId));
      if (selectedTrackId === trackId) {
        setSelectedTrackId(null);
      }
    }
  }, [tracks, selectedTrackId, onTracksChange, setSelectedTrackId]);

  // Handle timeline click
  const handleTimelineClick = useCallback((e) => {
    if (!timelineRef.current) return;
    if (e.target.closest('.resize-handle')) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pixelsPerSecond = (rect.width / dynamicTotalDuration) * zoomScale;
    const clickTime = Math.max(0, Math.min(dynamicTotalDuration, x / pixelsPerSecond));
    onTimeChange(clickTime);
  }, [dynamicTotalDuration, zoomScale, onTimeChange]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.isOpen) {
        setContextMenu({ isOpen: false, position: { x: 0, y: 0 } });
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu.isOpen]);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Controls Bar */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onPlayPause}
            className="w-10 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center transition-colors"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          <div className="flex items-center gap-1 font-mono text-sm">
            <span className="font-bold">{formatTime(currentTime)}</span>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600">{formatTime(dynamicTotalDuration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoomScale(Math.max(0.1, zoomScale - 0.2))}
            disabled={zoomScale <= 0.1}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600 min-w-16 text-center">{Math.round(zoomScale * 100)}%</span>
          <button
            onClick={() => setZoomScale(Math.min(3, zoomScale + 0.2))}
            disabled={zoomScale >= 3}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Timeline Area */}
      <div
        ref={timelineRef}
        className="flex-1 relative overflow-x-auto overflow-y-auto bg-gray-50 dark:bg-gray-950"
        onClick={handleTimelineClick}
        style={{
          scrollbarWidth: "thin",
        }}
      >
        <div
          className="relative"
          style={{
            minWidth: '100%',
            width: `${dynamicTotalDuration * 50 * zoomScale}px`,
            height: `${Math.max(400, tracks.length * 100 + 100)}px`,
          }}
        >
          {/* Time Ruler */}
          <div className="sticky top-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-300 dark:border-gray-700">
            <div className="relative h-12 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
              {Array.from({ length: Math.ceil(dynamicTotalDuration / 5) + 1 }, (_, i) => {
                const time = i * 5;
                const position = (time / dynamicTotalDuration) * 100;
                const isMajorMarker = time % 10 === 0;
                return (
                  <div key={time} className="absolute" style={{ left: `${position}%` }}>
                    <span className="absolute top-1 left-1/2 transform -translate-x-1/2 text-xs text-gray-800 dark:text-gray-200 font-bold whitespace-nowrap bg-white dark:bg-gray-800 px-2 py-0.5 rounded shadow-sm border border-gray-200 dark:border-gray-700">
                      {time < 60 ? `${time}s` : `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`}
                    </span>
                    <div className={`absolute top-8 left-1/2 transform -translate-x-1/2 ${isMajorMarker ? 'w-0.5 h-4 bg-gray-600 dark:bg-gray-400' : 'w-px h-2 bg-gray-400 dark:bg-gray-600'} rounded-full`}></div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Playhead */}
          {dynamicTotalDuration > 0 && (
            <div
              className="absolute top-0 bottom-0 z-20 pointer-events-none"
              style={{ left: `${(currentTime / dynamicTotalDuration) * 100}%` }}
            >
              <div className="absolute top-10 left-1/2 transform -translate-x-1/2">
                <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[12px] border-l-transparent border-r-transparent border-b-red-500 shadow-lg"></div>
              </div>
              <div className="w-0.5 h-full bg-red-500 shadow-lg"></div>
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded-md shadow-lg whitespace-nowrap font-bold">
                {formatTime(currentTime)}
              </div>
            </div>
          )}

          {/* Tracks */}
          <div className="relative px-4 py-4" style={{ paddingTop: '60px' }}>
            {tracks.map((track, index) => (
              <div
                key={track.id}
                className="relative mb-4"
                style={{ height: '80px' }}
              >
                <AudioTrackItem
                  track={track}
                  totalDuration={dynamicTotalDuration}
                  pixelsPerSecond={50 * zoomScale}
                  isSelected={selectedTrackId === track.id}
                  isDragging={isDragging && draggedTrack?.id === track.id}
                  currentTime={currentTime}
                  onSelect={setSelectedTrackId}
                  onDragStart={(action, e) => handleDragStart(action, e, track.id)}
                  onResizeStart={(e) => {
                    e.stopPropagation();
                    handleResizeStart(e, track.id);
                  }}
                  onResizeEnd={(e) => {
                    e.stopPropagation();
                    handleResizeEnd(e, track.id);
                  }}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                  onSplit={handleSplit}
                  onContextMenuChange={(isOpen, position) => {
                    if (isOpen && position) {
                      setContextMenu({
                        isOpen: true,
                        position: position,
                      });
                    } else if (!isOpen) {
                      setContextMenu({ isOpen: false, position: { x: 0, y: 0 } });
                    }
                  }}
                  zoomScale={zoomScale}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Context Menu */}
      <AudioTrackContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        onClose={() => setContextMenu({ isOpen: false, position: { x: 0, y: 0 } })}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onSplit={handleSplit}
        trackId={selectedTrackId}
      />
    </div>
  );
};

export default AudioTimelineEditor;

