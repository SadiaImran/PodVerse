import React, { useState, useRef, useCallback, useEffect } from 'react';
import AudioTimelineEditor from './AudioTimelineEditor';
import TrackEditPanel from './comp-audio-track-edit-panel';
import { Volume2 } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000/audio-edit';

// Multi-track Audio Engine
const MultiTrackAudioEngine = ({ tracks, isPlaying, currentTime, volume, onTimeUpdate, onPlaybackEnd }) => {
  const audioElementsRef = useRef({});
  const intervalRef = useRef(null);
  const startTimeRef = useRef(0);

  useEffect(() => {
    tracks.forEach(track => {
      if (!audioElementsRef.current[track.id]) {
        const audio = new Audio(track.url);
        audio.volume = (track.volume || 100) / 100 * (volume / 100);
        audio.playbackRate = track.speed || 1.0;
        audio.preload = 'auto';
        audioElementsRef.current[track.id] = audio;
      } else {
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

/**
 * Audio Edit Timeline Wrapper
 * 
 * Wraps the AudioTimelineEditor with audio playback engine and track management
 */
const AudioEditTimelineWrapper = ({
  audioTracks = [],
  onRemoveTrack,
  isPlaying: externalIsPlaying,
  setIsPlaying: externalSetIsPlaying,
  currentTime: externalCurrentTime,
  setCurrentTime: externalSetCurrentTime,
  totalDuration = 0,
  volume: externalVolume = 75,
  setVolume: externalSetVolume,
}) => {
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  const [internalCurrentTime, setInternalCurrentTime] = useState(0);
  const [internalVolume, setInternalVolume] = useState(75);
  const [tracks, setTracks] = useState([]);
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);

  const isPlaying = externalIsPlaying !== undefined ? externalIsPlaying : internalIsPlaying;
  const setIsPlaying = externalSetIsPlaying || setInternalIsPlaying;
  const currentTime = externalCurrentTime !== undefined ? externalCurrentTime : internalCurrentTime;
  const setCurrentTime = externalSetCurrentTime || setInternalCurrentTime;
  const volume = externalVolume !== undefined ? externalVolume : internalVolume;
  const setVolume = externalSetVolume || setInternalVolume;

  useEffect(() => {
    const newTracks = audioTracks.map((track, index) => ({
      ...track,
      startTime: track.startTime !== undefined ? track.startTime : index * 5,
      volume: track.volume !== undefined ? track.volume : 100,
      speed: track.speed !== undefined ? track.speed : 1.0
    }));
    setTracks(newTracks);
  }, [audioTracks]);

  const dynamicTotalDuration = tracks.length > 0
    ? Math.max(...tracks.map(t => (t.startTime || 0) + t.duration), totalDuration)
    : totalDuration || 10;

  const handlePlaybackEnd = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, [setIsPlaying, setCurrentTime]);

  const handleTracksChange = useCallback((updatedTracks) => {
    setTracks(updatedTracks);
  }, []);

  const handleTrackSelect = useCallback((trackId) => {
    setSelectedTrackId(trackId);
    setIsEditPanelOpen(true);
  }, []);

  const handleEditPanelClose = useCallback(() => {
    setIsEditPanelOpen(false);
    setSelectedTrackId(null);
  }, []);

  const handleTrackUpdate = useCallback((trackId, settings) => {
    setTracks(prev => prev.map(track =>
      track.id === trackId
        ? { ...track, ...settings }
        : track
    ));
  }, []);

  const handleDuplicateTrack = useCallback((trackId) => {
    const trackToDuplicate = tracks.find(t => t.id === trackId);
    if (!trackToDuplicate) return;

    const duplicatedTrack = {
      ...trackToDuplicate,
      id: `${trackId}_duplicate_${Date.now()}`,
      name: `${trackToDuplicate.name} (Copy)`,
      startTime: (trackToDuplicate.startTime || 0) + trackToDuplicate.duration + 1
    };

    setTracks(prev => [...prev, duplicatedTrack]);
  }, [tracks]);

  const removeTrack = useCallback((trackId) => {
    setTracks(prev => prev.filter(track => track.id !== trackId));
    if (selectedTrackId === trackId) {
      setSelectedTrackId(null);
      setIsEditPanelOpen(false);
    }
    onRemoveTrack && onRemoveTrack(trackId);
  }, [onRemoveTrack, selectedTrackId]);

  const handleResetTrack = useCallback((trackId, resetSettings) => {
    setTracks(prev => prev.map(track =>
      track.id === trackId
        ? { ...track, ...resetSettings }
        : track
    ));
  }, []);

  const handleExportTrack = useCallback(async (trackId) => {
    const trackToExport = tracks.find(t => t.id === trackId);
    if (!trackToExport) return;

    try {
      const loadingNotif = document.createElement('div');
      loadingNotif.textContent = `Exporting: ${trackToExport.name}...`;
      loadingNotif.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      document.body.appendChild(loadingNotif);

      const response = await fetch(trackToExport.url);
      const audioBlob = await response.blob();
      
      const file = new File([audioBlob], trackToExport.name, { type: audioBlob.type });
      const form = new FormData();
      form.append('file', file);
      
      const exportResponse = await fetch(`${API_BASE_URL}/export`, {
        method: 'POST',
        body: form,
      });

      if (!exportResponse.ok) {
        throw new Error(`Backend error: ${exportResponse.statusText}`);
      }

      const exportedBlob = await exportResponse.blob();
      const url = URL.createObjectURL(exportedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${trackToExport.name}_exported.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      document.body.removeChild(loadingNotif);
      const notification = document.createElement('div');
      notification.textContent = 'Export successful!';
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      document.body.appendChild(notification);
      setTimeout(() => document.body.removeChild(notification), 3000);
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    }
  }, [tracks]);

  const selectedTrack = tracks.find(t => t.id === selectedTrackId);

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden">
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
      />

      {/* Main Timeline Editor */}
      <div className="flex-1 w-full flex flex-col min-w-0 min-h-0">
        {/* Volume Control Bar */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-end gap-3 flex-shrink-0">
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
        </div>

        {/* Audio Timeline Editor */}
        <div className="flex-1 min-h-0">
          <AudioTimelineEditor
            tracks={tracks}
            onTracksChange={handleTracksChange}
            isPlaying={isPlaying}
            currentTime={currentTime}
            onTimeChange={setCurrentTime}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            totalDuration={dynamicTotalDuration}
            onTrackSelect={handleTrackSelect}
            selectedTrackId={selectedTrackId}
          />
        </div>
      </div>
    </div>
  );
};

export default AudioEditTimelineWrapper;

