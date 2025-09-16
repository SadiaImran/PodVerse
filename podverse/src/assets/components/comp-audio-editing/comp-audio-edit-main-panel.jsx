import React, { useState, useRef, useEffect } from 'react';
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
  Trash2
} from 'lucide-react';

// Custom scrollbar styles
const scrollbarStyles = `
  .timeline-scrollbar::-webkit-scrollbar {
    height: 8px;
  }
  .timeline-scrollbar::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }
  .timeline-scrollbar::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }
  .timeline-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
  .timeline-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 #f1f5f9;
  }
`;

// Track Waveform Component with WaveSurfer
const TrackWaveform = ({ track, audioBuffer, isPlaying, currentTime, onPlay, onRemove, zoom = 1 }) => {
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const [isTrackPlaying, setIsTrackPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);

  useEffect(() => {
    if (!waveformRef.current || !track.url) return;

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
    });
    wavesurfer.on("pause", () => setIsTrackPlaying(false));
    wavesurfer.on("error", (e) => {
      console.error("WaveSurfer error:", e);
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
  }, [track.url, hasPlayed, zoom]);

  const handlePlay = () => {
    if (wavesurferRef.current) {
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

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-purple-100 border-b border-purple-200">
        <div className="flex items-center gap-3">
          <button 
            onClick={handlePlay}
            className="w-9 h-9 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center shadow-sm transition-all duration-200 hover:scale-105"
          >
            {isTrackPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <div className="text-sm text-purple-700 font-semibold truncate max-w-64">{track.name}</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-purple-600 font-medium bg-purple-100 px-2 py-1 rounded">{formatTime(track.duration)}</div>
          <button
            onClick={() => onRemove && onRemove(track.id)}
            className="w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="p-3">
        <div 
          ref={waveformRef} 
          className="rounded-lg overflow-hidden" 
          style={{ 
            minHeight: '100px',
            width: `${Math.max(1, (track.duration || 0) * 50 * zoom)}px`
          }}
        ></div>
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
            onClick={() => setIsPlaying && setIsPlaying(!isPlaying)}
            className={`w-10 h-10 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center transition-colors shadow-sm ${audioTracks.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={audioTracks.length === 0}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          
          <button className="p-2 hover:bg-purple-50 rounded-lg transition-colors">
            <SkipForward className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Time Display */}
        <div className="flex items-center gap-2 text-sm font-mono">
          <span className="text-gray-900 font-semibold">{formatTime(currentTime || 0)}</span>
          <span className="text-gray-400">/</span>
          <span className="text-gray-600">{formatTime(totalDuration)}</span>
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
      {audioTracks.length === 0 ? (
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
          <div className="h-full overflow-x-auto overflow-y-auto timeline-scrollbar">
            <div className="relative" style={{ width: `${Math.max(800, totalDuration * 50 * zoom)}px` }}>
              {/* Sticky Ruler */}
              {totalDuration > 0 && (
                <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
                  <div className="relative h-12">
                    <div className="absolute top-7 left-0 right-0 h-px bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200"></div>
                    {(() => {
                      const pixelsPerSecond = 50 * zoom;
                      const markerInterval = zoom > 2 ? 1 : zoom > 1 ? 2 : zoom > 0.5 ? 5 : 10;
                      const markers = [];
                      for (let time = 0; time <= totalDuration; time += markerInterval) {
                        const position = time * pixelsPerSecond;
                        const isMajorMarker = time % (markerInterval * 5) === 0;
                        markers.push(
                          <div key={time} className="absolute" style={{ left: `${position}px` }}>
                            <div className={`absolute top-7 left-1/2 transform -translate-x-1/2 w-px ${isMajorMarker ? 'h-5 bg-gray-400' : 'h-3 bg-gray-300'}`}></div>
                            {isMajorMarker && (
                              <span className="absolute top-1 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 font-semibold whitespace-nowrap bg-white px-1 rounded">
                                {time < 60 ? `${time}s` : `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`}
                              </span>
                            )}
                          </div>
                        );
                      }
                      return markers;
                    })()}
                  </div>
                </div>
              )}
              {/* Playhead */}
              {totalDuration > 0 && (
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-purple-500 z-20 pointer-events-none" 
                  style={{ 
                    left: `${(currentTime || 0) * 50 * zoom}px`
                  }}
                >
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-purple-500 rounded-full shadow-lg border-2 border-white"></div>
                </div>
              )}

              {/* Track Layout */}
              <div className="space-y-4 px-4 py-3">
                {audioTracks.map((track) => (
                  <div key={track.id} className="track-waveform">
                    <TrackWaveform
                      track={track}
                      audioBuffer={audioBuffers[track.id]}
                      isPlaying={isPlaying}
                      currentTime={currentTime}
                      zoom={zoom}
                      onPlay={(trackId) => {
                        console.log('Playing track:', trackId);
                      }}
                      onRemove={onRemoveTrack}
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