import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Hook for audio player controls
 * Similar to useVideoPlayer in video editor
 */
export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const playerRef = useRef(null);

  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const formatTime = useCallback((seconds) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  return {
    isPlaying,
    currentTime,
    setCurrentTime,
    togglePlayPause,
    formatTime,
    playerRef,
  };
}

