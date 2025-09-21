import React, { useRef, useState, useEffect } from "react";
import { 
  Music, 
  Mic, 
  Upload, 
  Play, 
  Volume2, 
  Headphones,
  Radio,
  ChevronRight,
  Search,
  ArrowLeft,
  Zap
} from "lucide-react";
import { supabase , getSupabaseAuthorizedtoken } from '../../supabaseClient'


const API_BASE_URL = "http://localhost:8000"; 

export const Sidebar = ({ onFileUpload, audioTracks }) => {
  const fileInputRef = useRef(null);
  const [stockAudioData, setStockAudioData] = useState({
    ambient: [],
    audience: [],
    music: [],
    transitions: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [audioUrlCache, setAudioUrlCache] = useState(new Map()); // Cache signed URLs
  const [audioLoading, setAudioLoading] = useState(new Set()); // Track which files are loading for playback
  const [lastClickTime, setLastClickTime] = useState(0); // Prevent rapid clicking
  const [selectedCategory, setSelectedCategory] = useState("music");
  const [playingAudio, setPlayingAudio] = useState(null);
  const [audioElement, setAudioElement] = useState(null);
  const [musicFilter, setMusicFilter] = useState("All");
  const [soundEffectsFilter, setSoundEffectsFilter] = useState("All");
  const [audioProgress, setAudioProgress] = useState({});
  const [audioDuration, setAudioDuration] = useState({});
  const [currentTime, setCurrentTime] = useState({}); // Track current time for each audio
  const [currentView, setCurrentView] = useState("main"); // "main", "stock-music", "sound-effects"
  const [searchQuery, setSearchQuery] = useState("");

  const handleFileUpload = (files) => {
    if (onFileUpload && files.length > 0) {
      onFileUpload(files);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds) || seconds === 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };


  const playAudio = async (soundId, trackId) => {
    try {
      // Prevent rapid clicking (debounce)
      const now = Date.now();
      if (now - lastClickTime < 300) { // 300ms debounce
        console.log('Click ignored - too rapid');
        return;
      }
      setLastClickTime(now);

      // Prevent playing if already loading audio URL
      if (audioLoading.has(trackId)) {
        console.log('Audio URL already loading for this track');
        return;
      }

      // If same track is playing, stop it
      if (playingAudio === trackId && audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
        setPlayingAudio(null);
        setAudioElement(null);
        return;
      }

      // Stop current audio if playing different track
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
        setAudioElement(null);
      }

      // Mark as loading
      setAudioLoading(prev => new Set(prev).add(trackId));

      let audioUrl = audioUrlCache.get(soundId);
      
      // If URL not cached, fetch it
      if (!audioUrl) {
        console.log(`Fetching audio URL for sound ID: ${soundId}`);
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
        if (!result.success) {
          throw new Error(result.error || "Failed to get audio URL");
        }

        audioUrl = result.url;
        // Cache the URL for future use
        setAudioUrlCache(prev => new Map(prev).set(soundId, audioUrl));
        console.log(`Audio URL cached for sound ID: ${soundId}`);
      } else {
        console.log(`Using cached audio URL for sound ID: ${soundId}`);
      }

      // Create new audio element and play
      const audio = new Audio(audioUrl);
      setAudioElement(audio);
      setPlayingAudio(trackId);
      
      // Set up progress tracking
      audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
          setAudioProgress(prev => ({
            ...prev,
            [trackId]: audio.currentTime / audio.duration
          }));
          setAudioDuration(prev => ({
            ...prev,
            [trackId]: audio.duration
          }));
          setCurrentTime(prev => ({
            ...prev,
            [trackId]: audio.currentTime
          }));
        }
      });

      audio.onended = () => {
        setPlayingAudio(null);
        setAudioElement(null);
        setAudioProgress(prev => ({
          ...prev,
          [trackId]: 0
        }));
        setAudioDuration(prev => ({
          ...prev,
          [trackId]: 0
        }));
        setCurrentTime(prev => ({
          ...prev,
          [trackId]: 0
        }));
      };

      audio.onerror = () => {
        setPlayingAudio(null);
        setAudioElement(null);
        setAudioProgress(prev => ({
          ...prev,
          [trackId]: 0
        }));
        setAudioDuration(prev => ({
          ...prev,
          [trackId]: 0
        }));
        setCurrentTime(prev => ({
          ...prev,
          [trackId]: 0
        }));
        alert("Error playing audio file");
      };

      // Handle play promise with proper error handling
      try {
        await audio.play();
      } catch (playError) {
        if (playError.name === 'AbortError') {
          console.log('Audio play was aborted (user clicked again)');
          // Don't show error for abort - this is normal behavior
          return;
        } else {
          throw playError; // Re-throw other errors
        }
      }
    } catch (err) {
      console.error("Error playing audio:", err);
      alert("Error playing audio: " + err.message);
    } finally {
      // Remove from loading set
      setAudioLoading(prev => {
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

  // Filter functions
  const getFilteredMusic = () => {
    let tracks = [];
    if (musicFilter === "All") {
      tracks = [...(stockAudioData.music || []), ...(stockAudioData.transitions || [])];
    } else if (musicFilter === "Transitions") {
      tracks = stockAudioData.transitions || [];
    } else if (musicFilter === "Music") {
      tracks = stockAudioData.music || [];
    } else if (musicFilter === "Chill") {
      tracks = stockAudioData.music?.filter(track => 
        track.name.toLowerCase().includes('chill') || 
        track.name.toLowerCase().includes('lofi') ||
        track.name.toLowerCase().includes('ambient')
      ) || [];
    }
    
    // Apply search filter
    if (searchQuery) {
      tracks = tracks.filter(track => 
        track.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return tracks;
  };

  const getFilteredSoundEffects = () => {
    let tracks = [];
    if (soundEffectsFilter === "All") {
      tracks = [...(stockAudioData.ambient || []), ...(stockAudioData.audience || [])];
    } else if (soundEffectsFilter === "Audience") {
      tracks = stockAudioData.audience || [];
    } else if (soundEffectsFilter === "Ambient") {
      tracks = stockAudioData.ambient || [];
    }
    
    // Apply search filter
    if (searchQuery) {
      tracks = tracks.filter(track => 
        track.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return tracks;
  };

  // Waveform component
  const Waveform = ({ isPlaying, progress = 0, trackId }) => {
    const handleWaveformClick = (e) => {
      if (!audioElement || playingAudio !== trackId) return;
      
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickPercentage = clickX / rect.width;
      
      if (audioDuration[trackId]) {
        const newTime = clickPercentage * audioDuration[trackId];
        audioElement.currentTime = newTime;
        
        setAudioProgress(prev => ({
          ...prev,
          [trackId]: clickPercentage
        }));
      }
    };

    // Generate stable waveform heights based on trackId (no more random!)
    const generateStableHeights = (trackId, numBars = 20) => {
      // Use trackId as seed for consistent waveform
      let seed = 0;
      for (let i = 0; i < trackId.length; i++) {
        seed += trackId.charCodeAt(i);
      }
      
      const heights = [];
      for (let i = 0; i < numBars; i++) {
        // Simple pseudo-random using seed
        seed = (seed * 9301 + 49297) % 233280;
        const random = seed / 233280;
        const height = random * 20 + 8; // Height between 8-28px
        heights.push(height);
      }
      return heights;
    };

    const stableHeights = generateStableHeights(trackId);
    
    const bars = stableHeights.map((height, i) => {
      const isActive = isPlaying && (i / 20) <= progress;
      
      return (
        <div
          key={i}
          className={`w-1 rounded-full transition-all duration-150 ${
            isActive 
              ? 'bg-blue-500' 
              : 'bg-gray-300'
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
  const DetailedView = ({ title, tracks, filter, setFilter, filters }) => {
    const getFilteredTracks = () => {
      let filteredTracks = tracks;
      
      if (filter !== "All") {
        if (title === "Stock Music") {
          if (filter === "Chill") {
            filteredTracks = stockAudioData.music?.filter(track => 
              track.name.toLowerCase().includes('chill') || 
              track.name.toLowerCase().includes('lofi') ||
              track.name.toLowerCase().includes('ambient')
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
      
      // Apply search filter
      if (searchQuery) {
        filteredTracks = filteredTracks.filter(track => 
          track.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      return filteredTracks;
    };

    const filteredTracks = getFilteredTracks();

    return (
      <div className="flex flex-col h-full">
        {/* Header with back button */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0 bg-white">
          {/* Title with gradient background */}
          <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl p-4 mb-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-purple-200/30 to-blue-200/30 rounded-full -translate-y-8 translate-x-8"></div>
            <div className="flex items-center gap-3 relative z-10">
              <button 
                onClick={() => setCurrentView("main")}
                className="p-2 hover:bg-purple-200 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-light-purple" />
              </button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-light-lightPurple to-light-secondary bg-clip-text text-transparent">{title}</h1>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-0 rounded-lg focus:outline-none focus:bg-white focus:shadow-sm transition-all duration-200"
              autoComplete="off"
            />
          </div>
          
          {/* Filter buttons */}
          <div className="flex gap-2 overflow-x-auto">
            {filters.map((filterName) => (
              <button
                key={filterName}
                onClick={() => setFilter(filterName)}
                className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-all duration-200 ${
                  filter === filterName 
                    ? title === "Sound Effects"
                      ? "bg-gradient-to-r from-light-primary to-blue-400 text-white shadow-md"
                      : "bg-gradient-to-r from-light-lightPurple to-light-accent text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gradient-to-r hover:from-purple-100 hover:to-blue-100 hover:text-light-purple"
                }`}
              >
                {filterName}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {filteredTracks.map((track, index) => (
              <div 
                key={track.id || index} 
                className="group flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-all duration-200 border border-transparent hover:border-gray-200 hover:shadow-sm"
                onClick={() => playAudio(track.id, track.id)}
              >
                <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${
                  title === "Sound Effects" 
                    ? "from-blue-800 to-blue-300" 
                    : "from-light-purple to-purple-400"
                } flex items-center justify-center shadow-md flex-shrink-0 relative overflow-hidden`}>
                  {audioLoading.has(track.id) ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : playingAudio === track.id ? (
                    <div className="w-5 h-5 bg-white rounded-sm flex items-center justify-center">
                      <div className={`w-2 h-2 ${
                        title === "Sound Effects" ? "bg-white" : "bg-light-purple"
                      } rounded-sm`}></div>
                    </div>
                  ) : (
                    <Play className="w-5 h-5 text-white ml-0.5" />
                  )}
                  {playingAudio === track.id && (
                    <div className={`absolute inset-0 ${
                      title === "Sound Effects" ? "bg-white" : "bg-light-purple"
                    } opacity-20 animate-pulse`}></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`text-sm font-semibold text-gray-900 truncate mb-1 group-hover:${
                    title === "Sound Effects" ? "text-light-secondary" : "text-light-purple"
                  } transition-colors`} title={track.name}>
                    {track.name}
                  </h4>
                   <p className="text-xs text-gray-500 group-hover:text-gray-600">
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
                <button className={`opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center ${
                  title === "Sound Effects" 
                    ? "bg-light-secondary hover:bg-light-buttonBase" 
                    : "bg-light-purple hover:bg-light-lavender"
                } text-white rounded-lg transition-all shadow-sm`}>
                  <span className="text-lg font-bold">+</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Fetch stock audio data from backend (without durations)
  useEffect(() => {
    const fetchStockAudio = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("Making request to:", `${API_BASE_URL}/audio-edit/stock-audio/`);
        const token = await getSupabaseAuthorizedtoken();

        if(!token){
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

        console.log("Response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Error response:", errorText);
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

         const result = await response.json();
         console.log("Success response:", result);
         
         if (result.success) {
           console.log("Audio data loaded with durations:", result.data);
           setStockAudioData(result.data);
           console.log("Stock audio data state updated, loading set to false");
         } else {
           throw new Error(result.error || "Failed to fetch audio data");
         }
      } catch (err) {
        console.error("Error fetching stock audio:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStockAudio();
  }, []);


  const getCategoryIcon = (category) => {
    switch (category) {
      case "ambient":
        return <Volume2 className="w-4 h-4 text-white" />;
      case "audience":
        return <Radio className="w-4 h-4 text-white" />;
      case "music":
        return <Music className="w-4 h-4 text-white" />;
      case "transitions":
        return <Headphones className="w-4 h-4 text-white" />;
      default:
        return <Music className="w-4 h-4 text-white" />;
    }
  };

  const getCategoryGradient = (category) => {
    switch (category) {
      case "ambient":
        return "from-blue-500 to-blue-700";
      case "audience":
        return "from-green-500 to-green-700";
      case "music":
        return "from-purple-500 to-purple-700";
      case "transitions":
        return "from-orange-500 to-orange-700";
      default:
        return "from-purple-500 to-purple-700";
    }
  };


  // Handle different views
  if (currentView === "stock-music") {
    return (
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col h-screen shadow-lg">
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
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col h-screen shadow-lg">
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
    <div className="w-96 bg-white border-r border-gray-200 flex flex-col h-screen shadow-lg">
      {/* Custom CSS for purple theme */}
      <style>{`
        :root {
          --primary: 270 95% 65%;
          --primary-foreground: 0 0% 100%;
          --primary-muted: 270 70% 45%;
        }
      `}</style>

      {/* Header - Fixed */}
      <div className="p-6 border-b border-gray-200 flex-shrink-0 bg-white">
        {/* Title with gradient background */}
        <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl p-4 mb-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-purple-200/30 to-blue-200/30 rounded-full -translate-y-8 translate-x-8"></div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent relative z-10">
            Audio Editor
          </h1>
        </div>
        
        {/* Upload Button - Enhanced gradient */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-light-deepPurple via-light-purple to-light-lavender hover:from-light-lavender hover:via-light-lightPurple hover:to-light-deepPurple text-white px-4 py-3 rounded-xl transition-all font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 hover:scale-105"
        >
          <Upload size={20} />
          Upload Audio
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="audio/*"
          className="hidden"
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
        />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
         {/* Loading State */}
         {loading && (
           <div className="flex items-center justify-center py-8">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
             <span className="ml-2 text-sm text-gray-600">Loading audio files and getting durations...</span>
           </div>
         )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-6">
            <p className="text-sm text-red-600">Error loading audio files: {error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="text-xs text-red-500 hover:text-red-700 mt-1"
            >
              Retry
            </button>
          </div>
        )}

        {/* Stock Music Section */}
        {!loading && !error && (
          <div className="p-6 border-b border-gray-100 bg-gradient-to-br from-purple-50/40 via-blue-50/20 to-indigo-50/30 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-purple-200/20 to-transparent rounded-full -translate-y-10 translate-x-10"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-blue-200/20 to-transparent rounded-full translate-y-8 -translate-x-8"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Stock Music</h3>
              <button 
                onClick={() => setCurrentView("stock-music")}
                className="text-sm text-light-purple hover:text-light-lavender flex items-center gap-1 font-medium transition-colors"
              >
                View all <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            {/* Category Filters */}
            <div className="flex gap-2 mb-4 overflow-x-auto">
              {["All", "Transitions", "Music", "Chill"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setMusicFilter(filter)}
                  className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-all duration-200 ${
                    musicFilter === filter 
                      ? "bg-gradient-to-r from-light-lightPurple to-light-accent text-white shadow-md" 
                      : "bg-gray-100 text-gray-600 hover:bg-gradient-to-r hover:from-purple-100 hover:to-blue-100 hover:text-light-purple"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Music Tracks */}
            <div className="space-y-2">
              {getFilteredMusic().slice(0, 4).map((track, index) => (
                <div 
                  key={track.id || index} 
                  className="group flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-all duration-200 border border-transparent hover:border-gray-200 hover:shadow-sm"
                  onClick={() => playAudio(track.id, track.id)}
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-light-purple to-purple-400 flex items-center justify-center shadow-md flex-shrink-0 relative overflow-hidden">
                    {audioLoading.has(track.id) ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : playingAudio === track.id ? (
                      <div className="w-5 h-5 bg-white rounded-sm flex items-center justify-center">
                        <div className="w-2 h-2 bg-purple-600 rounded-sm"></div>
                      </div>
                    ) : (
                      <Play className="w-5 h-5 text-white ml-0.5" />
                    )}
                    {playingAudio === track.id && (
                      <div className="absolute inset-0 bg-purple-400 opacity-20 animate-pulse"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 truncate mb-1 group-hover:text-light-purple transition-colors" title={track.name}>
                      {track.name}
                    </h4>
                   <p className="text-xs text-gray-500 group-hover:text-gray-600">
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
                  <button className="opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center bg-light-purple text-white rounded-lg hover:bg-light-lavender transition-all shadow-sm">
                    <span className="text-lg font-bold">+</span>
                  </button>
                </div>
              ))}
            </div>
            </div>
          </div>
        )}

        {/* Sound Effects Section */}
        {!loading && !error && (
          <div className="p-6 bg-gradient-to-br from-purple-50/40 via-blue-50/20 to-indigo-50/30 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-purple-200/20 to-transparent rounded-full -translate-y-12 -translate-x-12"></div>
            <div className="absolute bottom-0 right-0 w-18 h-18 bg-gradient-to-tl from-blue-200/20 to-transparent rounded-full translate-y-9 translate-x-9"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Sound Effects</h3>
              <button 
                onClick={() => setCurrentView("sound-effects")}
                className="text-sm text-light-purple hover:text-light-lavender flex items-center gap-1 font-medium transition-colors"
              >
                View all <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            {/* Category Filters */}
            <div className="flex gap-2 mb-4 overflow-x-auto">
              {["All", "Audience", "Ambient"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSoundEffectsFilter(filter)}
                  className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-all duration-200 ${
                    soundEffectsFilter === filter 
                      ? "bg-gradient-to-r from-light-primary to-blue-400 text-white shadow-md" 
                      : "bg-gray-100 text-gray-600 hover:bg-gradient-to-r hover:from-blue-100 hover:to-indigo-100 hover:text-blue-700"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Sound Effect Tracks */}
            <div className="space-y-2">
              {getFilteredSoundEffects().slice(0, 4).map((track, index) => (
                <div 
                  key={track.id || index} 
                  className="group flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-all duration-200 border border-transparent hover:border-gray-200 hover:shadow-sm"
                  onClick={() => playAudio(track.id, track.id)}
                >
                  <div className={`w-14 h-14 rounded-full bg-gradient-to-br from-blue-800 to-blue-300 flex items-center justify-center shadow-md flex-shrink-0 relative overflow-hidden`}>
                    {playingAudio === track.id ? (
                      <div className="w-5 h-5 bg-white rounded-sm flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-sm"></div>
                      </div>
                    ) : (
                      <Play className="w-5 h-5 text-white ml-0.5" />
                    )}
                    {playingAudio === track.id && (
                      <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 truncate mb-1 group-hover:text-light-secondary transition-colors" title={track.name}>
                      {track.name}
                    </h4>
                   <p className="text-xs text-gray-500 group-hover:text-gray-600">
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
                  <button className="opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center bg-light-secondary text-white rounded-lg hover:bg-light-buttonBase transition-all shadow-sm">
                    <span className="text-lg font-bold">+</span>
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