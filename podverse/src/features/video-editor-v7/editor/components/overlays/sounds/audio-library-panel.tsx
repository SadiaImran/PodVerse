import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Upload, Search, ArrowLeft, Music, Volume2, Radio, Headphones, ChevronRight, Loader2 } from "lucide-react";
import { getSupabaseAuthorizedtoken } from "@/assets/supabaseClient";
import { useEditorContext } from "../../../contexts/editor-context";
import { useTimelinePositioning } from "../../../hooks/use-timeline-positioning";
import { useTimeline } from "../../../contexts/timeline-context";
import { OverlayType, SoundOverlay } from "../../../types";
import { useLocalMedia } from "../../../contexts/local-media-context";
import { toast } from "@/hooks/use-toast";

const API_BASE_URL = "http://localhost:8000";

const AudioLibraryPanel: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stockAudioData, setStockAudioData] = useState<{
    ambient: any[];
    audience: any[];
    music: any[];
    transitions: any[];
  }>({
    ambient: [],
    audience: [],
    music: [],
    transitions: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audioUrlCache, setAudioUrlCache] = useState<Map<string, string>>(new Map());
  const [audioLoading, setAudioLoading] = useState<Set<string>>(new Set());
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [musicFilter, setMusicFilter] = useState("All");
  const [soundEffectsFilter, setSoundEffectsFilter] = useState("All");
  const [audioProgress, setAudioProgress] = useState<{ [key: string]: number }>({});
  const [audioDuration, setAudioDuration] = useState<{ [key: string]: number }>({});
  const [currentTime, setCurrentTime] = useState<{ [key: string]: number }>({});
  const [currentView, setCurrentView] = useState<"main" | "stock-music" | "sound-effects">("main");
  const [searchQuery, setSearchQuery] = useState("");

  const { addOverlay, overlays, durationInFrames } = useEditorContext();
  const { findNextAvailablePosition } = useTimelinePositioning();
  const { visibleRows } = useTimeline();
  const { addMediaFile } = useLocalMedia();
  const [isUploadingLocalAudio, setIsUploadingLocalAudio] = useState(false);

  // Fetch stock audio data
  useEffect(() => {
    const fetchStockAudio = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = await getSupabaseAuthorizedtoken();
        if (!token) {
          setError("No authentication token found. Please log in.");
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/audio-edit/stock-audio/`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
          setStockAudioData(result.data);
        } else {
          throw new Error(result.error || "Failed to fetch audio data");
        }
      } catch (err: any) {
        console.error("Error fetching stock audio:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStockAudio();
  }, []);

  const formatDuration = (seconds: number | undefined): string => {
    if (!seconds || isNaN(seconds) || seconds === 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const playAudio = async (soundId: string, trackId: string) => {
    try {
      if (audioLoading.has(trackId)) {
        return;
      }

      if (playingAudio === trackId && audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
        setPlayingAudio(null);
        setAudioElement(null);
        return;
      }

      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
        setAudioElement(null);
      }

      setAudioLoading((prev) => new Set(prev).add(trackId));

      let audioUrl = audioUrlCache.get(trackId);
      if (!audioUrl) {
        const token = await getSupabaseAuthorizedtoken();
        const response = await fetch(`${API_BASE_URL}/audio-edit/audio-url/${soundId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to get audio URL: ${response.status}`);
        }

        const result = await response.json();
        if (!result.success || !result.url) {
          throw new Error(result.error || "Failed to get audio URL");
        }

        audioUrl = result.url;
        setAudioUrlCache((prev) => new Map(prev).set(trackId, audioUrl!));
      }

      const audio = new Audio(audioUrl);
      setAudioElement(audio);
      setPlayingAudio(trackId);

      audio.onloadedmetadata = () => {
        setAudioDuration((prev) => ({
          ...prev,
          [trackId]: audio.duration,
        }));
      };

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setAudioProgress((prev) => ({
            ...prev,
            [trackId]: audio.currentTime / audio.duration,
          }));
          setCurrentTime((prev) => ({
            ...prev,
            [trackId]: audio.currentTime,
          }));
        }
      };

      audio.onended = () => {
        setPlayingAudio(null);
        setAudioElement(null);
        setAudioProgress((prev) => ({ ...prev, [trackId]: 0 }));
        setAudioDuration((prev) => ({ ...prev, [trackId]: 0 }));
        setCurrentTime((prev) => ({ ...prev, [trackId]: 0 }));
      };

      audio.onerror = () => {
        setPlayingAudio(null);
        setAudioElement(null);
        alert("Error playing audio file");
      };

      await audio.play();
    } catch (err: any) {
      console.error("Error playing audio:", err);
      alert("Error playing audio: " + err.message);
    } finally {
      setAudioLoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(trackId);
        return newSet;
      });
    }
  };

  const stopAudio = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      setPlayingAudio(null);
      setAudioElement(null);
      setAudioProgress({});
      setAudioDuration({});
      setCurrentTime({});
    }
  };

  const getFilteredMusic = () => {
    let tracks: any[] = [];
    if (musicFilter === "All") {
      tracks = [...(stockAudioData.music || []), ...(stockAudioData.transitions || [])];
    } else if (musicFilter === "Transitions") {
      tracks = stockAudioData.transitions || [];
    } else if (musicFilter === "Music") {
      tracks = stockAudioData.music || [];
    } else if (musicFilter === "Chill") {
      tracks =
        stockAudioData.music?.filter(
          (track) =>
            track.name.toLowerCase().includes("chill") ||
            track.name.toLowerCase().includes("lofi") ||
            track.name.toLowerCase().includes("ambient")
        ) || [];
    }

    if (searchQuery) {
      tracks = tracks.filter((track) =>
        track.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return tracks;
  };

  const getFilteredSoundEffects = () => {
    let tracks: any[] = [];
    if (soundEffectsFilter === "All") {
      tracks = [...(stockAudioData.ambient || []), ...(stockAudioData.audience || [])];
    } else if (soundEffectsFilter === "Audience") {
      tracks = stockAudioData.audience || [];
    } else if (soundEffectsFilter === "Ambient") {
      tracks = stockAudioData.ambient || [];
    }

    if (searchQuery) {
      tracks = tracks.filter((track) =>
        track.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return tracks;
  };

  const addStockAudioToTimeline = async (track: any) => {
    try {
      const token = await getSupabaseAuthorizedtoken();
      const response = await fetch(`${API_BASE_URL}/audio-edit/audio-url/${track.id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get audio URL: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success || !result.url) {
        throw new Error(result.error || "Failed to get audio URL");
      }

      const { from, row } = findNextAvailablePosition(
        overlays,
        visibleRows,
        durationInFrames
      );

      const duration = parseFloat(track.duration) || 30;
      const newSoundOverlay: SoundOverlay = {
        id: Date.now().toString(),
        type: OverlayType.SOUND,
        content: track.name,
        src: result.url,
        from,
        row,
        left: 0,
        top: 0,
        width: 1920,
        height: 100,
        rotation: 0,
        isDragging: false,
        durationInFrames: Math.floor(duration * 30),
        styles: {
          opacity: 1,
        },
      };

      addOverlay(newSoundOverlay);
    } catch (err: any) {
      console.error("Error adding stock audio to timeline:", err);
      alert("Error adding audio to timeline: " + err.message);
    }
  };

  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploadingLocalAudio(true);
      const mediaFile = await addMediaFile(files[0]);
      if (!mediaFile) {
        throw new Error("Failed to upload audio");
      }

      const { from, row } = findNextAvailablePosition(
        overlays,
        visibleRows,
        durationInFrames
      );

      const durationSeconds =
        typeof mediaFile.duration === "number" && mediaFile.duration > 0
          ? mediaFile.duration
          : 0;

      const newSoundOverlay: SoundOverlay = {
        id: Date.now().toString(),
        type: OverlayType.SOUND,
        content: mediaFile.name,
        src: mediaFile.path,
        from,
        row,
        left: 0,
        top: 0,
        width: 1920,
        height: 100,
        rotation: 0,
        isDragging: false,
        durationInFrames:
          durationSeconds > 0 ? Math.floor(durationSeconds * 30) : 200,
        styles: {
          opacity: 1,
        },
        sourceStoragePath: mediaFile.storagePath,
      };

      addOverlay(newSoundOverlay);
    } catch (error) {
      console.error("Error uploading local audio:", error);
      toast({
        title: "Upload failed",
        description: "Could not upload the selected audio file. Please try again.",
        variant: "destructive",
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setIsUploadingLocalAudio(false);
    }
  };

  // Waveform component
  const Waveform: React.FC<{
    isPlaying: boolean;
    progress: number;
    trackId: string;
  }> = ({ isPlaying, progress, trackId }) => {
    const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!audioElement || playingAudio !== trackId) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickPercentage = clickX / rect.width;

      if (audioDuration[trackId]) {
        const newTime = clickPercentage * audioDuration[trackId];
        audioElement.currentTime = newTime;
        setAudioProgress((prev) => ({
          ...prev,
          [trackId]: clickPercentage,
        }));
      }
    };

    const generateStableHeights = (trackId: string, numBars = 20) => {
      let seed = 0;
      for (let i = 0; i < trackId.length; i++) {
        seed += trackId.charCodeAt(i);
      }

      const heights: number[] = [];
      for (let i = 0; i < numBars; i++) {
        seed = (seed * 9301 + 49297) % 233280;
        const random = seed / 233280;
        const height = random * 20 + 8;
        heights.push(height);
      }
      return heights;
    };

    const stableHeights = generateStableHeights(trackId);
    const bars = stableHeights.map((height, i) => {
      const isActive = isPlaying && i / 20 <= progress;
      return (
        <div
          key={i}
          className={`w-1 rounded-full transition-all duration-150 ${
            isActive ? "bg-blue-500" : "bg-gray-300"
          }`}
          style={{ height: `${height}px` }}
        />
      );
    });

    return (
      <div
        className="flex items-end gap-0.5 h-8 mt-2 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={handleWaveformClick}
      >
        {bars}
      </div>
    );
  };

  // Detailed view component
  const DetailedView: React.FC<{
    title: string;
    tracks: any[];
    filter: string;
    setFilter: (filter: string) => void;
    filters: string[];
  }> = ({ title, tracks, filter, setFilter, filters }) => {
    const getFilteredTracks = () => {
      let filteredTracks = tracks;
      if (filter !== "All") {
        if (title === "Stock Music") {
          if (filter === "Chill") {
            filteredTracks =
              stockAudioData.music?.filter(
                (track) =>
                  track.name.toLowerCase().includes("chill") ||
                  track.name.toLowerCase().includes("lofi") ||
                  track.name.toLowerCase().includes("ambient")
              ) || [];
          } else if (filter === "Transitions") {
            filteredTracks = stockAudioData.transitions || [];
          } else if (filter === "Music") {
            filteredTracks = stockAudioData.music || [];
          }
        } else if (title === "Sound Effects") {
          if (filter === "Audience") {
            filteredTracks = stockAudioData.audience || [];
          } else if (filter === "Ambient") {
            filteredTracks = stockAudioData.ambient || [];
          }
        }
      }

      if (searchQuery) {
        filteredTracks = filteredTracks.filter((track) =>
          track.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      return filteredTracks;
    };

    const filteredTracks = getFilteredTracks();

    return (
      <div className="flex flex-col h-full">
        <div className="p-3 border-b border-gray-200 flex-shrink-0 bg-white">
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setCurrentView("main")}
              className="p-1.5 hover:bg-purple-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-purple-600" />
            </button>
            <h1 className="text-base font-bold text-gray-900">{title}</h1>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border-0 rounded-lg focus:outline-none focus:bg-white focus:shadow-sm"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto flex-wrap">
            {filters.map((filterName) => (
              <button
                key={filterName}
                onClick={() => setFilter(filterName)}
                className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap transition-all ${
                  filter === filterName
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {filterName}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1.5">
            {filteredTracks.map((track, index) => (
              <div
                key={track.id || index}
                className="group flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-all border border-transparent hover:border-gray-200"
                onClick={() => playAudio(track.id, track.id)}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-400 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                  {audioLoading.has(track.id) ? (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                  ) : playingAudio === track.id ? (
                    <div className="w-3.5 h-3.5 bg-white rounded-sm flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-purple-600 rounded-sm"></div>
                    </div>
                  ) : (
                    <Play className="w-3.5 h-3.5 text-white ml-0.5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-gray-900 truncate mb-0.5" title={track.name}>
                    {track.name}
                  </h4>
                  <p className="text-[10px] text-gray-500">
                    {playingAudio === track.id && currentTime[track.id] !== undefined
                      ? `${formatDuration(currentTime[track.id])} / ${formatDuration(track.duration)}`
                      : formatDuration(track.duration)}
                  </p>
                  <Waveform
                    isPlaying={playingAudio === track.id}
                    progress={playingAudio === track.id ? audioProgress[track.id] || 0 : 0}
                    trackId={track.id}
                  />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addStockAudioToTimeline(track);
                  }}
                  className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all text-sm"
                >
                  +
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (currentView === "stock-music") {
    return (
      <div className="h-full w-full overflow-hidden">
        <DetailedView
          title="Stock Music"
          tracks={[...(stockAudioData.music || []), ...(stockAudioData.transitions || [])]}
          filter={musicFilter}
          setFilter={setMusicFilter}
          filters={["All", "Transitions", "Music", "Chill"]}
        />
      </div>
    );
  }

  if (currentView === "sound-effects") {
    return (
      <div className="h-full w-full overflow-hidden">
        <DetailedView
          title="Sound Effects"
          tracks={[...(stockAudioData.ambient || []), ...(stockAudioData.audience || [])]}
          filter={soundEffectsFilter}
          setFilter={setSoundEffectsFilter}
          filters={["All", "Audience", "Ambient"]}
        />
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden flex flex-col bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {/* Header - Fixed */}
      <div className="p-3 border-b border-gray-200 flex-shrink-0 bg-white dark:bg-gray-900 dark:border-gray-800">
        {/* Title with gradient background */}
        <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-gray-800 dark:to-gray-700 rounded-lg p-2 mb-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-purple-200/30 to-blue-200/30 dark:from-gray-700/40 dark:to-gray-600/30 rounded-full -translate-y-6 translate-x-6"></div>
          <h1 className="text-base font-bold bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-300 dark:to-blue-300 bg-clip-text text-transparent relative z-10">
            Audio Library
          </h1>
        </div>
        
        {/* Upload Button - Enhanced gradient */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploadingLocalAudio}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 via-purple-500 to-purple-400 hover:from-purple-500 hover:via-purple-400 hover:to-purple-300 text-white px-3 py-2 rounded-lg transition-all text-sm font-medium shadow-md hover:shadow-lg disabled:opacity-60"
        >
          {isUploadingLocalAudio ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
          {isUploadingLocalAudio ? "Uploading..." : "Upload Audio"}
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleAudioFileUpload}
        />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-950">
         {/* Loading State */}
         {loading && (
           <div className="flex items-center justify-center py-8">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
             <span className="ml-2 text-sm text-gray-600">Loading audio files and getting durations...</span>
           </div>
         )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/40 rounded-lg p-4 m-6">
            <p className="text-sm text-red-600 dark:text-red-300">Error loading audio files: {error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="text-xs text-red-500 hover:text-red-700 dark:text-red-300 dark:hover:text-red-200 mt-1"
            >
              Retry
            </button>
          </div>
        )}

        {/* Stock Music Section */}
        {!loading && !error && (
          <div className="p-3 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-br from-purple-50/40 via-blue-50/20 to-indigo-50/30 dark:from-gray-900/70 dark:via-gray-900/40 dark:to-gray-800/50 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-50">Stock Music</h3>
              <button 
                onClick={() => setCurrentView("stock-music")}
                className="text-xs text-purple-600 dark:text-purple-300 hover:text-purple-700 dark:hover:text-purple-200 flex items-center gap-1 font-medium transition-colors"
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            
            {/* Category Filters */}
            <div className="flex gap-1.5 mb-3 overflow-x-auto">
              {["All", "Transitions", "Music", "Chill"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setMusicFilter(filter)}
                  className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap transition-all duration-200 ${
                    musicFilter === filter 
                      ? "bg-gradient-to-r from-purple-500 to-purple-400 text-white shadow-md" 
                      : "bg-gray-100 text-gray-600 hover:bg-gradient-to-r hover:from-purple-100 hover:to-blue-100 hover:text-purple-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:text-purple-200"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Music Tracks */}
            <div className="space-y-2">
              {getFilteredMusic().slice(0, 3).map((track, index) => (
              <div 
                  key={track.id || index} 
                  className="group flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                  onClick={() => playAudio(track.id, track.id)}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-400 flex items-center justify-center shadow-md flex-shrink-0 relative overflow-hidden">
                    {audioLoading.has(track.id) ? (
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                    ) : playingAudio === track.id ? (
                      <div className="w-3.5 h-3.5 bg-white rounded-sm flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-purple-600 rounded-sm"></div>
                      </div>
                    ) : (
                      <Play className="w-3.5 h-3.5 text-white ml-0.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate mb-0.5 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors" title={track.name}>
                      {track.name}
                    </h4>
                   <p className="text-[10px] text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300">
                     {playingAudio === track.id && currentTime[track.id] !== undefined 
                        ? `${formatDuration(currentTime[track.id])} / ${formatDuration(track.duration)}`
                        : formatDuration(track.duration)}
                   </p>

                    <Waveform 
                      isPlaying={playingAudio === track.id} 
                      progress={playingAudio === track.id ? (audioProgress[track.id] || 0) : 0}
                      trackId={track.id}
                    />
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      addStockAudioToTimeline(track);
                    }}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all text-sm"
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
            </div>
          </div>
        )}

        {/* Sound Effects Section */}
        {!loading && !error && (
          <div className="p-3 pt-4 bg-gradient-to-br from-purple-50/40 via-blue-50/20 to-indigo-50/30 dark:from-gray-900/70 dark:via-gray-900/40 dark:to-gray-800/50 relative overflow-hidden border-t border-gray-100 dark:border-gray-800">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-50">Sound Effects</h3>
              <button 
                onClick={() => setCurrentView("sound-effects")}
                className="text-xs text-purple-600 dark:text-purple-300 hover:text-purple-700 dark:hover:text-purple-200 flex items-center gap-1 font-medium transition-colors"
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            
            {/* Category Filters */}
            <div className="flex gap-1.5 mb-3 overflow-x-auto">
              {["All", "Audience", "Ambient"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSoundEffectsFilter(filter)}
                  className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap transition-all duration-200 ${
                    soundEffectsFilter === filter 
                      ? "bg-gradient-to-r from-blue-500 to-blue-400 text-white shadow-md" 
                      : "bg-gray-100 text-gray-600 hover:bg-gradient-to-r hover:from-blue-100 hover:to-indigo-100 hover:text-blue-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:text-blue-200"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Sound Effect Tracks */}
            <div className="space-y-2">
              {getFilteredSoundEffects().slice(0, 3).map((track, index) => (
                <div 
                  key={track.id || index} 
                  className="group flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                  onClick={() => playAudio(track.id, track.id)}
                >
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center shadow-md flex-shrink-0 relative overflow-hidden`}>
                    {audioLoading.has(track.id) ? (
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                    ) : playingAudio === track.id ? (
                      <div className="w-3.5 h-3.5 bg-white rounded-sm flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                      </div>
                    ) : (
                      <Play className="w-3.5 h-3.5 text-white ml-0.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate mb-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-200 transition-colors" title={track.name}>
                      {track.name}
                    </h4>
                   <p className="text-[10px] text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300">
                     {playingAudio === track.id && currentTime[track.id] !== undefined 
                        ? `${formatDuration(currentTime[track.id])} / ${formatDuration(track.duration)}`
                        : formatDuration(track.duration)}
                   </p>

                    <Waveform 
                      isPlaying={playingAudio === track.id} 
                      progress={playingAudio === track.id ? (audioProgress[track.id] || 0) : 0}
                      trackId={track.id}
                    />
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      addStockAudioToTimeline(track);
                    }}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm"
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AudioLibraryPanel;
