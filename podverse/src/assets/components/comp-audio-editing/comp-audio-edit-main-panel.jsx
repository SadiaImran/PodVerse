import React, { useState, useRef, useEffect, useCallback } from 'react';
import WaveSurfer from "wavesurfer.js";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  ZoomIn,
  ZoomOut,
  Scissors,
  Music,
  Trash2,
  Sliders,
  Clock,
} from 'lucide-react';

import TrackEditPanel from './comp-audio-track-edit-panel';

const API_BASE_URL = 'http://localhost:8000/audio-edit'; 

const stripQueryString = (value = '') => value.split('?')[0];

const extractFileName = (value = '') => {
  const withoutQuery = stripQueryString(value);
  const parts = withoutQuery.split('/');
  return parts[parts.length - 1] || withoutQuery;
};

const sanitizeFileName = (value = '', fallbackPrefix = 'audio') => {
  const extracted = extractFileName(value);
  if (!extracted) {
    return `${fallbackPrefix}_${Date.now()}.wav`;
  }
  const sanitized = extracted.replace(/[^a-zA-Z0-9._-]/g, '_');
  if (sanitized) {
    return sanitized;
  }
  const extensionIndex = extracted.lastIndexOf('.');
  const extension = extensionIndex !== -1 ? extracted.substring(extensionIndex) : '.wav';
  return `${fallbackPrefix}_${Date.now()}${extension}`;
};

const buildSanitizedFileName = (value = '', fallbackPrefix = 'audio') => {
  const base = value && value.includes('.') ? value : `${value || fallbackPrefix}.wav`;
  return sanitizeFileName(base, fallbackPrefix);
};

const getReadableTrackName = (value = '') => {
  const baseName = extractFileName(value);
  if (!baseName) return 'Untitled Track';
  const underscoreIndex = baseName.indexOf('_');
  const friendly = underscoreIndex > 0 ? baseName.slice(0, underscoreIndex) : baseName;
  return friendly || baseName;
};

const getTrackDisplayName = (track) => {
  if (!track) return 'Untitled Track';
  if (track.displayName) return track.displayName;
  return getReadableTrackName(track.name || track.originalName || '');
};

// Enhanced scrollbar styles with modern look
const scrollbarStyles = `
  .timeline-scrollbar::-webkit-scrollbar {
    height: 8px;
    width: 8px;
  }
  .timeline-scrollbar::-webkit-scrollbar-track {
    background: #f8fafc;
    border-radius: 4px;
  }
  .timeline-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    border-radius: 4px;
    border: 1px solid #f8fafc;
  }
  .timeline-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
  }
  .timeline-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #6366f1 #f8fafc;
  }
  .dragging {
    cursor: grabbing !important;
    z-index: 1000 !important;
    transform: scale(1.02);
    box-shadow: 0 12px 40px rgba(99, 102, 241, 0.3);
  }
  .waveform-container {
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    border: 1px solid #e2e8f0;
  }
  .selected-track {
    border: 2px solid #6366f1 !important;
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
  }
`;

// Enhanced Draggable Track Component with functional volume and speed
const DraggableTrackWaveform = ({
  track,
  zoom = 1,
  pixelsPerSecond,
  currentTime,
  isGlobalPlaying,
  isSelected,
  onPlay,
  onRemove,
  onUpdatePosition,
  onSplit,
  onTrackStateChange,
  onSelect
}) => {
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const trackRef = useRef(null);
  const [isTrackPlaying, setIsTrackPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, startTime: 0 });
  const trackLabel = getTrackDisplayName(track);

  // Initialize WaveSurfer with modern styling
  useEffect(() => {
    if (!waveformRef.current || !track.url) return;

    setIsLoading(true);
    setIsTrackPlaying(false);
    setHasPlayed(false);

    if (wavesurferRef.current) {
      try {
        wavesurferRef.current.destroy();
      } catch (e) {
        console.error("Error destroying existing wavesurfer:", e);
      }
    }

    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "#a8a8a8",
      progressColor: "#6366f1",
      barWidth: Math.max(2, Math.min(4, 3 * zoom)),
      barGap: Math.max(1, 1 * zoom),
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
      setIsLoading(false);
      // Apply track settings when ready
      if (wavesurfer.backend && wavesurfer.backend.ac) {
        wavesurfer.setVolume((track.volume || 100) / 100);
        // Don't set playback rate - speed is in the audio file
        wavesurfer.setPlaybackRate(1.0);
      }
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
  }, [track.url, track.id, zoom]);

// Apply volume and speed changes
useEffect(() => {
  if (wavesurferRef.current && wavesurferRef.current.isReady) {
    try {
      wavesurferRef.current.setVolume((track.volume || 100) / 100);

      if (wavesurferRef.current.setPlaybackRate) {
        wavesurferRef.current.setPlaybackRate(track.speed || 1.0);
      }
    } catch (e) {
      console.error("Error applying track settings:", e);
    }
  }
}, [track.volume, track.speed, track.url]); // Add track.url as dependency

  // Update WaveSurfer progress
  useEffect(() => {
    if (!wavesurferRef.current || !wavesurferRef.current.isReady) return;

    const trackStart = track.startTime || 0;
    const trackEnd = trackStart + track.duration;

    if (isGlobalPlaying && currentTime >= trackStart && currentTime < trackEnd) {
      const progress = (currentTime - trackStart) / track.duration;
      const clampedProgress = Math.max(0, Math.min(1, progress));
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

  const handlePlay = () => {
    if (wavesurferRef.current && !isLoading && wavesurferRef.current.isReady) {
      wavesurferRef.current.playPause();
      onPlay && onPlay(track.id);
    }
  };

  const handleTrackClick = (e) => {
    if (!isDragging && !e.target.closest('.no-drag')) {
      onSelect && onSelect(track.id);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const trackWidth = track.duration * pixelsPerSecond;
  const trackLeft = (track.startTime || 0) * pixelsPerSecond;

  return (
    <div
      ref={trackRef}
      className={`absolute bg-white rounded-xl border-2 overflow-hidden shadow-lg transition-all duration-300 ${isDragging
        ? 'dragging border-indigo-400'
        : isSelected
          ? 'selected-track border-indigo-500'
          : 'border-gray-200 hover:border-indigo-300'
        }`}
      style={{
        left: `${trackLeft}px`,
        width: `${trackWidth}px`,
        height: '110px',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
      onClick={handleTrackClick}
    >
      {/* Track Header with gradient */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 border-b border-gray-100 min-h-[50px]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={handlePlay}
            disabled={isLoading}
            className={`no-drag w-8 h-8 flex-shrink-0 ${isLoading
              ? 'bg-gray-400'
              : 'bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700'
              } text-white rounded-lg flex items-center justify-center shadow-md transition-all duration-200 hover:scale-105`}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
            ) : isTrackPlaying ? (
              <Pause className="w-3 h-3" />
            ) : (
              <Play className="w-3 h-3 ml-0.5" />
            )}
          </button>
          <div className="text-sm text-gray-800 font-semibold truncate">
            {trackLabel}
          </div>
          {isTrackPlaying && (
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse flex-shrink-0 shadow-sm" />
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {trackWidth > 150 && (
            <div className="text-xs text-indigo-700 font-semibold bg-indigo-100 px-2 py-1 rounded-md shadow-sm">
              {formatTime(track.duration)}
            </div>
          )}
          {track.volume !== 100 && (
            <div className="text-xs text-blue-600 font-semibold bg-blue-50 px-1 py-0.5 rounded">
              {track.volume}%
            </div>
          )}
          {track.speed !== 1.0 && (
            <div className="text-xs text-purple-600 font-semibold bg-purple-50 px-1 py-0.5 rounded">
              {track.speed.toFixed(2)}x
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove && onRemove(track.id);
            }}
            className="no-drag w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-md flex-shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Waveform Container with enhanced styling */}
      <div className="relative p-3">
        <div
          ref={waveformRef}
          className="waveform-container rounded-lg overflow-hidden shadow-inner"
          style={{
            minHeight: '50px',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
          }}
        />
      </div>
    </div>
  );
};

// Enhanced Multi-track Audio Engine with volume and speed support
const MultiTrackAudioEngine = ({ tracks, isPlaying, currentTime, volume, onTimeUpdate, onPlaybackEnd }) => {
  const audioElementsRef = useRef({});
  const intervalRef = useRef(null);
  const startTimeRef = useRef(0);
  const audioContextRef = useRef(null);

  // Initialize Web Audio API for better control
  useEffect(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        console.warn("Web Audio API not supported, using basic audio elements");
      }
    }
  }, []);

  useEffect(() => {
    tracks.forEach(track => {
      if (!audioElementsRef.current[track.id]) {
        const audio = new Audio(track.url);
        audio.volume = (track.volume || 100) / 100 * (volume / 100);
        audio.playbackRate = track.speed || 1.0;
        audio.preload = 'auto';
        audioElementsRef.current[track.id] = audio;
      } else {
        // Update existing audio properties
        const audio = audioElementsRef.current[track.id];
        audio.volume = (track.volume || 100) / 100 * (volume / 100);
        audio.playbackRate = track.speed || 1.0;
      }
    });

  }, [tracks, volume]);

  useEffect(() => {
    if (isPlaying) {
      startTimeRef.current = performance.now() - (currentTime * 1000);

      intervalRef.current = setInterval(() => {
        const elapsed = (performance.now() - startTimeRef.current) / 1000;
        onTimeUpdate(elapsed);

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

        const maxDuration = Math.max(...tracks.map(t => (t.startTime || 0) + t.duration));
        if (elapsed >= maxDuration) {
          onPlaybackEnd();
        }
      }, 50);

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

// Generate sample tracks
const generateAudioTone = (frequency, duration, sampleRate = 44100) => {
  const samples = duration * sampleRate;
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);

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

  for (let i = 0; i < samples; i++) {
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
    view.setInt16(44 + i * 2, sample * 32767, true);
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
};

const downloadAudioAsBlob = async (url) => {
  const response = await fetch(url);
  const blob = await response.blob();
  return blob;
};

const uploadAudioToBackend = async (blob, filename, endpoint, formData = {}) => {
  const safeFilename = sanitizeFileName(filename);
  const file = new File([blob], safeFilename, { type: blob.type || 'audio/wav' });
  const form = new FormData();
  form.append('file', file);
  
  Object.entries(formData).forEach(([key, value]) => {
    form.append(key, value);
  });
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    body: form,
  });
  
  if (!response.ok) {
    throw new Error(`Backend error: ${response.statusText}`);
  }
  
  return response.blob();
};

const mergeAudioTracks = async (audioBlobs, filenames) => {
  const form = new FormData();
  
  audioBlobs.forEach((blob, index) => {
    const filename = filenames[index] || `track_${index}.wav`;
    const file = new File([blob], filename, { type: blob.type });
    form.append('files', file);
  });
  
  const response = await fetch(`${API_BASE_URL}/merge_audio`, {
    method: 'POST',
    body: form,
  });
  
  if (!response.ok) {
    throw new Error(`Backend error: ${response.statusText}`);
  }
  
  return response.blob();
};

const generateSampleTracks = () => [
  {
    id: 'track1',
    name: 'Bass Line (80Hz)',
    duration: 18,
    startTime: 0,
    volume: 100,
    speed: 1.0,
    url: generateAudioTone(80, 18)
  },
  {
    id: 'track2',
    name: 'Melody (440Hz)',
    duration: 15,
    startTime: 3,
    volume: 100,
    speed: 1.0,
    url: generateAudioTone(440, 15)
  },
  {
    id: 'track3',
    name: 'Harmony (660Hz)',
    duration: 12,
    startTime: 6,
    volume: 100,
    speed: 1.0,
    url: generateAudioTone(660, 12)
  }
];

// Main Component
export const MainPanel = ({
  audioTracks = generateSampleTracks(),
  onRemoveTrack,
  onTracksChange,
  isPlaying: externalIsPlaying,
  setIsPlaying: externalSetIsPlaying,
  currentTime: externalCurrentTime,
  setCurrentTime: externalSetCurrentTime,
  totalDuration = 0,
  volume: externalVolume = 75,
  setVolume: externalSetVolume,
  zoom: externalZoom = 1,
  setZoom: externalSetZoom,
  onFinalizeAudio,
  isFinalizing = false,
  canFinalize = false,
  onRemoveSilence
}) => {
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  const [internalCurrentTime, setInternalCurrentTime] = useState(0);
  const [internalVolume, setInternalVolume] = useState(75);
  const [internalZoom, setInternalZoom] = useState(1);

  const [tracks, setTracks] = useState([]);
  const [trackStates, setTrackStates] = useState({});
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
  const containerRef = useRef(null);

  const updateTracks = useCallback((updater) => {
    setTracks(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (onTracksChange) {
        Promise.resolve().then(() => onTracksChange(next));
      }
      return next;
    });
  }, [onTracksChange]);

  const isPlaying = externalIsPlaying !== undefined ? externalIsPlaying : internalIsPlaying;
  const setIsPlaying = externalSetIsPlaying || setInternalIsPlaying;
  const currentTime = externalCurrentTime !== undefined ? externalCurrentTime : internalCurrentTime;
  const setCurrentTime = externalSetCurrentTime || setInternalCurrentTime;
  const volume = externalVolume !== undefined ? externalVolume : internalVolume;
  const setVolume = externalSetVolume || setInternalVolume;
  const zoom = externalZoom !== undefined ? externalZoom : internalZoom;
  const setZoom = externalSetZoom || setInternalZoom;

  useEffect(() => {
    const newTracks = audioTracks.map((track, index) => {
      const inferredNameSource = track.displayName || track.name || track.originalName || track.file?.name || track.url || `Track ${index + 1}`;
      const displayName = track.displayName || getReadableTrackName(inferredNameSource);
      const originalName = track.originalName || track.name || extractFileName(track.url || inferredNameSource);
      return {
        ...track,
        name: track.name || originalName || displayName,
        displayName,
        originalName,
        startTime: track.startTime !== undefined ? track.startTime : index * 5,
        volume: track.volume !== undefined ? track.volume : 100,
        speed: track.speed !== undefined ? track.speed : 1.0
      };
    });
    setTracks(newTracks);
  }, [audioTracks]);

  const dynamicTotalDuration = tracks.reduce((max, track) =>
    Math.max(max, (track.startTime || 0) + track.duration), totalDuration
  );

  const pixelsPerSecond = 50 * zoom;
  const trackHeight = 110;

  // Track management functions
  const handleTrackStateChange = useCallback((trackId, isPlaying) => {
    setTrackStates(prev => ({ ...prev, [trackId]: isPlaying }));
  }, []);

  const handlePlaybackEnd = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setTrackStates({});
  }, [setIsPlaying, setCurrentTime]);

  const updateTrackPosition = useCallback((trackId, newStartTime) => {
    updateTracks(prev => prev.map(track =>
      track.id === trackId
        ? { ...track, startTime: Math.max(0, newStartTime) }
        : track
    ));
  }, [updateTracks]);

  // Enhanced splitting function
  const splitTrackAtPlayhead = useCallback(async () => {
    if (!selectedTrackId) return;
  
    const selectedTrack = tracks.find(t => t.id === selectedTrackId);
    if (!selectedTrack) return;
  
    const trackStart = selectedTrack.startTime || 0;
    const trackEnd = trackStart + selectedTrack.duration;
  
    if (currentTime <= trackStart || currentTime >= trackEnd) {
      alert(`Playhead must be within the selected track to split. Track runs from ${trackStart.toFixed(1)}s to ${trackEnd.toFixed(1)}s, but playhead is at ${currentTime.toFixed(1)}s.`);
      return;
    }
  
    const splitPoint = currentTime - trackStart;
  
    if (splitPoint <= 0.5 || splitPoint >= selectedTrack.duration - 0.5) {
      alert("Cannot split too close to the beginning or end of the track. Leave at least 0.5 seconds on each side.");
      return;
    }
  
    try {
      const friendlyBaseName = getTrackDisplayName(selectedTrack);
      const fallbackPrefix = friendlyBaseName.replace(/\s+/g, '_').toLowerCase() || 'track';

      // Show loading notification
      const loadingNotif = document.createElement('div');
      loadingNotif.textContent = 'Splitting track...';
      loadingNotif.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      document.body.appendChild(loadingNotif);
  
      // Download audio blob
      const audioBlob = await downloadAudioAsBlob(selectedTrack.url);
      
      // Split into two parts using backend
      const firstPartBlob = await uploadAudioToBackend(
        audioBlob,
        buildSanitizedFileName(`${friendlyBaseName}_part1.wav`, fallbackPrefix),
        '/split',
        { start_time: 0, duration: splitPoint }
      );
      
      const secondPartBlob = await uploadAudioToBackend(
        audioBlob,
        buildSanitizedFileName(`${friendlyBaseName}_part2.wav`, fallbackPrefix),
        '/split',
        { start_time: splitPoint, duration: selectedTrack.duration - splitPoint }
      );
  
      // Create URLs for the split parts
      const firstPartUrl = URL.createObjectURL(firstPartBlob);
      const secondPartUrl = URL.createObjectURL(secondPartBlob);
  
      // Create new track segments
      const firstTrack = {
        id: `${selectedTrackId}_${Date.now()}_1`,
        name: `${friendlyBaseName} (Part 1)`,
        displayName: `${friendlyBaseName} (Part 1)`,
        originalName: `${friendlyBaseName} (Part 1)`,
        duration: splitPoint,
        startTime: selectedTrack.startTime,
        volume: selectedTrack.volume,
        speed: selectedTrack.speed,
        url: firstPartUrl  // New URL for first part
      };

      const secondTrack = {
        id: `${selectedTrackId}_${Date.now()}_2`,
        name: `${friendlyBaseName} (Part 2)`,
        displayName: `${friendlyBaseName} (Part 2)`,
        originalName: `${friendlyBaseName} (Part 2)`,
        startTime: currentTime,
        duration: selectedTrack.duration - splitPoint,
        volume: selectedTrack.volume,
        speed: selectedTrack.speed,
        url: secondPartUrl  // New URL for second part
      };
    
      updateTracks(prev => {
        const trackIndex = prev.findIndex(t => t.id === selectedTrackId);
        const newTracks = [...prev];
        newTracks.splice(trackIndex, 1, firstTrack, secondTrack);
        return newTracks;
      });
  
      setSelectedTrackId(null);
      setIsEditPanelOpen(false);
  
      // Remove loading and show success
      document.body.removeChild(loadingNotif);
      const notification = document.createElement('div');
      notification.textContent = `Track "${friendlyBaseName}" split successfully at ${currentTime.toFixed(1)}s`;
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      document.body.appendChild(notification);
      setTimeout(() => document.body.removeChild(notification), 3000);
  
    } catch (error) {
      console.error('Split error:', error);
      alert('Failed to split track. Please try again.');
    }
  }, [selectedTrackId, tracks, currentTime, updateTracks]);

  const removeTrack = useCallback((trackId) => {
    updateTracks(prev => prev.filter(track => track.id !== trackId));
    if (selectedTrackId === trackId) {
      setSelectedTrackId(null);
      setIsEditPanelOpen(false);
    }
    onRemoveTrack && onRemoveTrack(trackId);
  }, [onRemoveTrack, selectedTrackId, updateTracks]);

  const handleTrackSelect = useCallback((trackId) => {
    setSelectedTrackId(trackId);
    setIsEditPanelOpen(true);
  }, []);

  const handleEditPanelClose = useCallback(() => {
    setIsEditPanelOpen(false);
    setSelectedTrackId(null);
  }, []);

  const handleTrackUpdate = useCallback((trackId, settings) => {
    updateTracks(prev => prev.map(track =>
      track.id === trackId
        ? { ...track, ...settings }
        : track
    ));
  }, [updateTracks]);

  // Track action handlers
  const handleDuplicateTrack = useCallback((trackId) => {
    const trackToDuplicate = tracks.find(t => t.id === trackId);
    if (!trackToDuplicate) return;

    const baseLabel = getTrackDisplayName(trackToDuplicate);
    const duplicateLabel = `${baseLabel} (Copy)`;
    const duplicatedTrack = {
      ...trackToDuplicate,
      id: `${trackId}_duplicate_${Date.now()}`,
      name: duplicateLabel,
      displayName: duplicateLabel,
      originalName: trackToDuplicate.originalName || baseLabel,
      startTime: (trackToDuplicate.startTime || 0) + trackToDuplicate.duration + 1
    };

    updateTracks(prev => [...prev, duplicatedTrack]);

    // Show notification
    const notification = document.createElement('div');
    notification.textContent = `Track duplicated: ${duplicatedTrack.name}`;
    notification.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    document.body.appendChild(notification);
    setTimeout(() => document.body.removeChild(notification), 3000);
  }, [tracks, updateTracks]);

  const handleExportTrack = useCallback(async (trackId) => {
    const trackToExport = tracks.find(t => t.id === trackId);
    if (!trackToExport) return;
  
    try {
      const friendlyName = getTrackDisplayName(trackToExport);
      const fallbackPrefix = friendlyName.replace(/\s+/g, '_').toLowerCase() || 'track';

      const loadingNotif = document.createElement('div');
      loadingNotif.textContent = `Exporting: ${friendlyName}...`;
      loadingNotif.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      document.body.appendChild(loadingNotif);
  
      // Download audio blob
      const audioBlob = await downloadAudioAsBlob(trackToExport.url);
      
      // Export using backend
      const exportedBlob = await uploadAudioToBackend(
        audioBlob,
        buildSanitizedFileName(`${friendlyName}.wav`, fallbackPrefix),
        '/export',
        { format: 'wav' }
      );
  
      // Create download link
      const url = URL.createObjectURL(exportedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = buildSanitizedFileName(`${friendlyName}_exported.wav`, fallbackPrefix);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  
      document.body.removeChild(loadingNotif);
      const notification = document.createElement('div');
      notification.textContent = `Exported: ${friendlyName}`;
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      document.body.appendChild(notification);
      setTimeout(() => document.body.removeChild(notification), 3000);
  
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  }, [tracks]);

  const handleMergeTracks = useCallback(async () => {
    if (!selectedTrackId) {
      alert('Please select at least 2 tracks to merge');
      return;
    }
  
    // For now, merge all tracks (you can modify this to work with multi-select)
    if (tracks.length < 2) {
      alert('Need at least 2 tracks to merge');
      return;
    }
  
    try {
      const loadingNotif = document.createElement('div');
      loadingNotif.textContent = 'Merging tracks...';
      loadingNotif.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      document.body.appendChild(loadingNotif);
  
      // Sort tracks by start time
      const sortedTracks = [...tracks].sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
  
      // Download all audio blobs
      const audioBlobs = await Promise.all(
        sortedTracks.map(track => downloadAudioAsBlob(track.url))
      );
  
      const filenames = sortedTracks.map((track, index) => {
        const label = getTrackDisplayName(track) || `track_${index + 1}`;
        const fallback = label.replace(/\s+/g, '_').toLowerCase() || `track_${index + 1}`;
        return buildSanitizedFileName(`${label}.wav`, fallback);
      });
  
      // Merge using backend
      const mergedBlob = await mergeAudioTracks(audioBlobs, filenames);
  
      // Calculate merged track properties
      const totalDuration = sortedTracks.reduce((sum, t) => sum + t.duration, 0);
  
      const mergedTrack = {
        id: `merged_${Date.now()}`,
        name: `Merged (${sortedTracks.length} tracks)`,
        displayName: `Merged (${sortedTracks.length} tracks)`,
        originalName: `Merged (${sortedTracks.length} tracks)`,
        duration: totalDuration,
        startTime: sortedTracks[0].startTime || 0,
        volume: 100,
        speed: 1.0,
        url: URL.createObjectURL(mergedBlob)
      };
  
      // Replace all tracks with merged track
      updateTracks([mergedTrack]);
      setSelectedTrackId(null);
      setIsEditPanelOpen(false);
  
      document.body.removeChild(loadingNotif);
      const notification = document.createElement('div');
      notification.textContent = `Successfully merged ${sortedTracks.length} tracks!`;
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      document.body.appendChild(notification);
      setTimeout(() => document.body.removeChild(notification), 3000);
  
    } catch (error) {
      console.error('Merge failed:', error);
      alert('Merge failed. Please try again.');
    }
  }, [tracks, selectedTrackId, updateTracks]);

  const handleResetTrack = useCallback((trackId, resetSettings) => {
    updateTracks(prev => prev.map(track =>
      track.id === trackId
        ? { ...track, ...resetSettings }
        : track
    ));

    // Show notification
    const notification = document.createElement('div');
    notification.textContent = 'Track settings reset to defaults';
    notification.className = 'fixed top-4 right-4 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    document.body.appendChild(notification);
    setTimeout(() => document.body.removeChild(notification), 3000);
  }, [updateTracks]);

  const handleMasterPlayPause = () => {
    const anyTrackPlaying = Object.values(trackStates).some(isPlaying => isPlaying);

    if (anyTrackPlaying || isPlaying) {
      setIsPlaying(false);
      setTrackStates({});
    } else {
      setIsPlaying(true);
    }
  };

  const handleTimelineClick = (e) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 10;
    const clickTime = Math.max(0, x / pixelsPerSecond);
    setCurrentTime(Math.min(clickTime, dynamicTotalDuration));
  };

  const handleMasterExport = async () => {
    if (tracks.length === 0) {
      alert('No tracks to export');
      return;
    }
  
    try {
      const loadingNotif = document.createElement('div');
      loadingNotif.textContent = `Exporting ${tracks.length} track(s)...`;
      loadingNotif.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      document.body.appendChild(loadingNotif);
  
      // Export each track individually
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        const trackLabel = getTrackDisplayName(track);
        const fallbackPrefix = trackLabel.replace(/\s+/g, '_').toLowerCase() || `track_${i + 1}`;
        
        // Download audio blob
        const audioBlob = await downloadAudioAsBlob(track.url);
        
        // Export using backend
        const exportedBlob = await uploadAudioToBackend(
          audioBlob,
          buildSanitizedFileName(`${trackLabel}.wav`, fallbackPrefix),
          '/export',
          { format: 'wav' }
        );
  
        // Create download link
        const url = URL.createObjectURL(exportedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = buildSanitizedFileName(`${trackLabel}_exported.wav`, fallbackPrefix);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
  
        // Small delay between downloads to prevent browser blocking
        await new Promise(resolve => setTimeout(resolve, 500));
      }
  
      document.body.removeChild(loadingNotif);
      const notification = document.createElement('div');
      notification.textContent = `Successfully exported ${tracks.length} track(s) as WAV!`;
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      document.body.appendChild(notification);
      setTimeout(() => document.body.removeChild(notification), 3000);
  
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "00:00.0";
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
  };

  const selectedTrack = tracks.find(t => t.id === selectedTrackId);
  const selectedTrackDisplayName = selectedTrack ? getTrackDisplayName(selectedTrack) : '';

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden min-h-0">
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

      {/* Track Edit Panel */}
      <TrackEditPanel
        track={selectedTrack}
        isVisible={isEditPanelOpen}
        onClose={handleEditPanelClose}
        onUpdate={handleTrackUpdate}
        onDuplicate={handleDuplicateTrack}
        onDelete={removeTrack}
        onExport={handleExportTrack}
        onReset={handleResetTrack}
        onRemoveSilence={onRemoveSilence}
      />

      {/* Main Content */}
      <div className="flex-1 w-full flex flex-col min-w-0 min-h-0">
        {/* Top Control Bar */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button
              onClick={() => setCurrentTime(0)}
              className="p-2.5 hover:bg-gray-50 rounded-xl transition-colors group"
              title="Reset to beginning"
            >
              <SkipBack className="w-5 h-5 text-gray-600 group-hover:text-gray-800" />
            </button>

            <button
              onClick={handleMasterPlayPause}
              className={`w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-2xl flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 ${tracks.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={tracks.length === 0}
              title={isPlaying ? "Pause all tracks" : "Play all tracks"}
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentTime(0);
                setTrackStates({});
              }}
              className="p-2.5 hover:bg-gray-50 rounded-xl transition-colors group"
              title="Stop and reset"
            >
              <SkipForward className="w-5 h-5 text-gray-600 group-hover:text-gray-800" />
            </button>
            {/* Split and Merge Buttons - Horizontal Layout */}
            <div className="ml-4 pl-4 border-l border-gray-200 flex items-center gap-2">
              <button
                onClick={splitTrackAtPlayhead}
                disabled={!selectedTrackId}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${selectedTrackId
                  ? 'bg-orange-100 hover:bg-orange-200 text-orange-700 shadow-sm hover:shadow-md'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                title={selectedTrackId ? "Split selected track at playhead position" : "Select a track to enable splitting"}
              >
                <Scissors className="w-4 h-4" />
                Split Track
              </button>
              
              <button
                onClick={handleMergeTracks}
                disabled={tracks.length < 2}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${tracks.length >= 2
                  ? 'bg-purple-100 hover:bg-purple-200 text-purple-700 shadow-sm hover:shadow-md'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                title={tracks.length >= 2 ? "Merge all tracks into one" : "Need at least 2 tracks to merge"}
              >
                <Music className="w-4 h-4" />
                Merge Tracks
              </button>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3 font-mono">
            <span className="text-xl font-bold text-gray-900">{formatTime(currentTime || 0)}</span>
            <span className="text-gray-400">/</span>
            <span className="text-lg text-gray-600">{formatTime(dynamicTotalDuration)}</span>
            <div className="ml-4 px-3 py-1 bg-indigo-50 rounded-lg">
              <span className="text-sm text-indigo-700 font-medium">
                {tracks.length} track{tracks.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-gray-600" />
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume && setVolume(parseInt(e.target.value))}
                className="w-20 accent-indigo-600"
                title="Master volume"
              />
              <span className="text-sm font-medium w-10">{volume}%</span>
            </div>

            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <button
                onClick={() => setZoom && setZoom(Math.max(0.1, zoom - 0.2))}
                className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
                disabled={zoom <= 0.1}
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4 text-gray-600" />
              </button>
              <span className="text-sm text-gray-600 min-w-16 text-center font-medium">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom && setZoom(Math.min(3, zoom + 0.2))}
                className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
                disabled={zoom >= 3}
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4 text-gray-600" />
              </button>

              <button
                onClick={() => {
                  if (tracks.length > 0 && setZoom) {
                    const totalDurationSeconds = Math.max(1, dynamicTotalDuration);
                    const containerWidthPx = (containerRef.current?.clientWidth || 800) - 40;
                    const fitZoom = containerWidthPx / (totalDurationSeconds * 50);
                    const finalZoom = Math.max(0.1, Math.min(3, fitZoom));
                    setZoom(finalZoom);
                  }
                }}
                className="px-3 sm:px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition-colors font-medium"
                title="Fit all tracks to view"
              >
                Fit
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <button 
                onClick={handleMasterExport}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                title="Export entire project"
              >
                Export Project
              </button>
              {onFinalizeAudio && (
                <button
                  onClick={onFinalizeAudio}
                  disabled={isFinalizing || !canFinalize}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-md ${
                    isFinalizing || !canFinalize
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 hover:shadow-lg'
                  }`}
                  title="Finalize this edit and move forward"
                >
                  {isFinalizing ? 'Finalizing...' : 'Finalize Audio'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tools & Status Bar */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span className="text-sm text-gray-700">
                {selectedTrackId ? 'Click Split Track to cut at playhead position' : 'Select a track to enable splitting'}
              </span>
            </div>
            {selectedTrackId && (
              <div className="flex items-center gap-2 text-sm text-indigo-700 bg-indigo-100 px-3 py-1 rounded-lg">
                <Sliders className="w-4 h-4" />
                <span>Selected: {selectedTrackDisplayName}</span>
              </div>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-4 text-sm text-gray-600">
            {isPlaying && (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-700 font-medium">Playing</span>
              </>
            )}
            <span>Zoom: {Math.round(zoom * 100)}%</span>
            <span className="text-indigo-600 font-medium">Ready</span>
          </div>
        </div>

        {/* Main Timeline Area */}
        {tracks.length === 0 ? (
          <div className="flex-1 w-full h-full flex items-center justify-center">
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center px-4 sm:px-6">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Music className="w-10 h-10 text-indigo-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Professional Multi-Track Editor</h3>
                <p className="text-gray-500 max-w-2xl mx-auto">
                  Start editing by loading your audio tracks. Drag to reposition, select tracks to edit properties, and use the split tool for precise editing.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 w-full bg-gradient-to-br from-gray-50 to-slate-100 overflow-hidden min-h-0">
            <div
              ref={containerRef}
              className="h-full w-full overflow-x-auto overflow-y-auto timeline-scrollbar"
              onClick={handleTimelineClick}
            >
              <div
                className="relative"
                style={{
                  minWidth: '100%',
                  width: `${dynamicTotalDuration * pixelsPerSecond}px`,
                  height: `${Math.max(400, tracks.length * (trackHeight + 25) + 150)}px`
                }}
              >
                {/* Enhanced Timeline Ruler */}
                {dynamicTotalDuration > 0 && (
                  <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-300 shadow-sm">
                    <div className="relative h-16 bg-gradient-to-b from-gray-50 to-gray-100">
                      {Array.from({ length: Math.ceil(dynamicTotalDuration / 5) + 1 }, (_, i) => {
                        const time = i * 5;
                        const position = time * pixelsPerSecond;
                        const isMajorMarker = time % 10 === 0;
                        return (
                          <div key={time} className="absolute" style={{ left: `${position + 15}px` }}>
                            <span className="absolute top-2 left-1/2 transform -translate-x-1/2 text-sm text-gray-800 font-bold whitespace-nowrap bg-white px-3 py-1 rounded-lg shadow-sm border border-gray-200">
                              {time < 60 ? `${time}s` : `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`}
                            </span>
                            <div className={`absolute top-10 left-1/2 transform -translate-x-1/2 ${isMajorMarker ? 'w-0.5 h-6 bg-gray-600' : 'w-px h-3 bg-gray-400'} rounded-full`}></div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Enhanced Playhead with Arrow */}
                {dynamicTotalDuration > 0 && (
                  <div
                    className="absolute top-0 bottom-0 z-20 pointer-events-none"
                    style={{ left: `${currentTime * pixelsPerSecond + 15}px` }}
                  >
                    {/* Arrow at top */}
                    <div className="absolute top-12 left-1/2 transform -translate-x-1/2">
                      <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[12px] border-l-transparent border-r-transparent border-b-red-500 shadow-lg"></div>
                    </div>
                    {/* Main line */}
                    <div className="w-0.5 h-full bg-red-500 shadow-lg"></div>
                    {/* Time indicator */}
                    <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded-md shadow-lg whitespace-nowrap font-bold">
                      {formatTime(currentTime)}
                    </div>
                  </div>
                )}

                {/* Tracks Container */}
                <div className="relative px-6 py-6" style={{ paddingTop: '100px', paddingLeft: '20px' }}>
                  {tracks.map((track, index) => (
                    <div
                      key={track.id}
                      className="relative"
                      style={{
                        marginBottom: '25px',
                        height: `${trackHeight}px`
                      }}
                    >
                      <DraggableTrackWaveform
                        track={track}
                        zoom={zoom}
                        pixelsPerSecond={pixelsPerSecond}
                        currentTime={currentTime}
                        isGlobalPlaying={isPlaying}
                        isSelected={selectedTrackId === track.id}
                        onPlay={(trackId) => console.log('Playing track:', trackId)}
                        onRemove={removeTrack}
                        onUpdatePosition={updateTrackPosition}
                        onTrackStateChange={handleTrackStateChange}
                        onSelect={handleTrackSelect}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Status Bar */}
        <div className="bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between text-sm flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
              <span className="font-medium">Tracks: {tracks.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span>Duration: {formatTime(dynamicTotalDuration)}</span>
            </div>
            {selectedTrackId && (
              <div className="flex items-center gap-2 text-indigo-600">
                <Sliders className="w-4 h-4" />
                <span className="font-medium">Editing: {selectedTrackDisplayName}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Playhead: {formatTime(currentTime)}</span>
            </div>
          </div>
          <div className="flex items-center gap-6 text-gray-600">
            {isPlaying && (
              <div className="flex items-center gap-2 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Playing</span>
              </div>
            )}
            <span>Sample Rate: 44.1kHz</span>
            <span className="font-medium text-indigo-600">Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainPanel;