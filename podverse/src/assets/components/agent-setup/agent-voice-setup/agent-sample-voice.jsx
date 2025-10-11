import { useState, useRef, useEffect } from "react";
import { FaPlay, FaPause, FaCheckCircle } from "react-icons/fa";
import { RiLoopLeftLine } from "react-icons/ri";
import { CgDetailsMore } from "react-icons/cg";
import axios from "axios";
import { getSupabaseAuthorizedtoken } from "../../../supabaseClient";

const SampleVoices = ({ onVoiceSelect }) => {
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hoveredVoice, setHoveredVoice] = useState(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [visibleCategoryDropdowns, setVisibleCategoryDropdowns] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [voices, setVoices] = useState([]);
  
  const audioRef = useRef(null);
  const progressInterval = useRef(null);

  // Fetch voices from backend API
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get authentication token
        const token = await getSupabaseAuthorizedtoken();
        if (!token) {
          throw new Error("Authentication required");
        }

        // Fetch voices from backend
        const response = await axios.get(
          'http://localhost:8000/sample-voices/',
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            }
          }
        );

        console.log("🔍 Full API Response:", response.data);

        if (response.data.success) {
          const fetchedVoices = response.data.data;
          
          console.log("🔍 Fetched Voices Raw:", fetchedVoices);
          
          // Add UI properties to each voice
          const transformedVoices = fetchedVoices.map((voice, index) => {
            console.log(`🔍 Voice ${index}:`, {
              id: voice.id,
              name: voice.name,
              audioSrc: voice.audioSrc,
              audioSrcType: typeof voice.audioSrc,
              audioSrcLength: voice.audioSrc?.length
            });
            
            return {
              ...voice,
              color: getVoiceColor(index),
              textColor: 'text-white',
              duration: 30 // Will be updated when audio loads
            };
          });
          
          setVoices(transformedVoices);
          console.log("✅ Transformed voices:", transformedVoices);
          
          // Set first voice as selected if none selected
          if (transformedVoices.length > 0 && !selectedVoice) {
            setSelectedVoice(transformedVoices[0].id);
            if (onVoiceSelect) {
              onVoiceSelect(transformedVoices[0]);
            }
            console.log("🎯 Selected first voice:", transformedVoices[0]);
          }
        } else {
          throw new Error(response.data.error || 'Failed to fetch voices');
        }
      } catch (err) {
        console.error('❌ Error fetching voices:', err);
        console.error('❌ Error details:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status
        });
        setError(err.response?.data?.detail || err.message || 'Failed to load voices');
      } finally {
        setLoading(false);
      }
    };

    fetchVoices();
  }, []);

  // Helper function to get voice colors (cycling through predefined colors)
  const getVoiceColor = (index) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
      'bg-yellow-500', 'bg-red-500', 'bg-indigo-500', 'bg-orange-500'
    ];
    return colors[index % colors.length];
  };

  // Update audio source when selected voice changes
  useEffect(() => {
    if (audioRef.current && selectedVoice) {
      const selectedVoiceData = voices.find(v => v.id === selectedVoice);
      if (selectedVoiceData) {
        console.log("🔊 Loading audio for voice:", {
          id: selectedVoiceData.id,
          name: selectedVoiceData.name,
          audioSrc: selectedVoiceData.audioSrc,
          audioSrcValid: !!selectedVoiceData.audioSrc,
          audioSrcStartsWith: selectedVoiceData.audioSrc?.substring(0, 50)
        });
        
        if (selectedVoiceData.audioSrc) {
          audioRef.current.src = selectedVoiceData.audioSrc;
          audioRef.current.load();
          
          if (isPlaying) {
            audioRef.current.play().catch(err => {
              console.error('❌ Error playing audio:', err);
              setIsPlaying(false);
            });
          }
        } else {
          console.error("❌ No audioSrc found for voice:", selectedVoiceData);
        }
      }
    }
  }, [selectedVoice, voices, isPlaying]);

  // Handle play/pause
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(err => {
          console.error('❌ Error playing audio:', err);
          setIsPlaying(false);
        });
        
        // Setup interval to update progress
        progressInterval.current = setInterval(() => {
          if (audioRef.current) {
            const currentTime = audioRef.current.currentTime;
            const duration = audioRef.current.duration;
            setCurrentTime(currentTime);
            if (duration && !isNaN(duration)) {
              setProgress((currentTime / duration) * 100);
            }
          }
        }, 100);
      } else {
        audioRef.current.pause();
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
      }
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isPlaying]);

  // Handle audio ending
  const handleAudioEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  // Handle audio metadata loaded
  const handleLoadedMetadata = (e) => {
    const audioDuration = e.target.duration;
    console.log("✅ Audio metadata loaded, duration:", audioDuration);
    if (audioDuration && !isNaN(audioDuration)) {
      setDuration(audioDuration);
      
      // Update the duration in voices state
      setVoices(prev => prev.map(v => 
        v.id === selectedVoice 
          ? { ...v, duration: audioDuration }
          : v
      ));
    }
  };

  // Toggle play/pause for a voice
  const togglePlay = (voiceId) => {
    console.log("🎵 Toggle play for voice:", voiceId);
    if (selectedVoice !== voiceId) {
      setSelectedVoice(voiceId);
      setIsPlaying(true);
      setProgress(0);
      setCurrentTime(0);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  // Handle seeking in the progress bar
  const handleSeek = (e) => {
    if (!audioRef.current || !duration) return;
    
    const seekPosition = e.nativeEvent.offsetX / e.target.clientWidth;
    const seekTime = duration * seekPosition;
    
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
    setProgress(seekPosition * 100);
  };

  // Format time in MM:SS
  const formatTime = (timeInSeconds) => {
    if (!timeInSeconds || isNaN(timeInSeconds)) return "0:00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Handle use voice
  const handleUseVoice = (voiceId) => {
    const voice = voices.find(v => v.id === voiceId);
    if (voice) {
      setSelectedVoice(voiceId);
      if (onVoiceSelect) {
        onVoiceSelect(voice);
      }
      console.log("✅ Selected voice:", voice);
    }
  };

  // Handle view voice details
  const handleViewVoice = (voiceId) => {
    const voice = voices.find(v => v.id === voiceId);
    if (onVoiceSelect && voice) {
      onVoiceSelect(voice);
    }
  };

  // Toggle category dropdown visibility
  const toggleCategoryDropdown = (voiceId) => {
    setVisibleCategoryDropdowns(prev => ({
      ...prev,
      [voiceId]: !prev[voiceId]
    }));
  };

  // Loading state
  if (loading) {
    return (
      <div className="w-full flex justify-center items-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sample voices...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-center">
          <svg className="w-12 h-12 text-red-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-800 font-medium mb-2">Failed to load voices</p>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // No voices state
  if (voices.length === 0) {
    return (
      <div className="w-full p-6 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-center">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <p className="text-gray-600">No sample voices available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Hidden audio element for playback */}
      <audio
        ref={audioRef}
        src={voices.find(v => v.id === selectedVoice)?.audioSrc || ""}
        onEnded={handleAudioEnded}
        onLoadedMetadata={handleLoadedMetadata}
        onError={(e) => {
          const voice = voices.find(v => v.id === selectedVoice);
          console.error('❌ Audio loading error:', {
            event: e,
            voiceId: selectedVoice,
            voiceName: voice?.name,
            audioSrc: voice?.audioSrc,
            audioElement: audioRef.current,
            audioSrcAttribute: audioRef.current?.src,
            errorCode: audioRef.current?.error?.code,
            errorMessage: audioRef.current?.error?.message
          });
          setError(`Failed to load audio: ${voice?.name || 'Unknown'}`);
          setIsPlaying(false);
        }}
        crossOrigin="anonymous"
        style={{ display: "none" }}
      />
      
      <div className="space-y-2">
        {voices.map((voice, idx) => (
          <div 
            key={voice.id} 
            className={`flex items-center justify-between p-2 border-b border-gray-200 hover:bg-gray-50 transition-colors ${
              selectedVoice === voice.id ? 'bg-green-50 border-green-200' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Active voice indicator (green tick) */}
              {selectedVoice === voice.id && (
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white">
                    <FaCheckCircle size={12} />
                  </div>
                </div>
              )}
              
              {/* Voice avatar circle with pause/play button */}
              <div 
                className="relative"
                onMouseEnter={() => setHoveredVoice(voice.id)}
                onMouseLeave={() => setHoveredVoice(null)}
              >
                <div className={`w-12 h-12 rounded-full ${voice.color} ${voice.textColor} flex items-center justify-center cursor-pointer`}>
                  {(hoveredVoice === voice.id || (isPlaying && selectedVoice === voice.id)) ? (
                    <button 
                      onClick={() => togglePlay(voice.id)}
                      className="w-full h-full rounded-full flex items-center justify-center bg-black bg-opacity-30 text-white"
                    >
                      {isPlaying && selectedVoice === voice.id ? (
                        <FaPause />
                      ) : (
                        <FaPlay className="ml-1" />
                      )}
                    </button>
                  ) : (
                    <span className="font-semibold text-xl">{voice.name[0]}</span>
                  )}
                </div>
              </div>
              
              {/* Voice name and info */}
              <div>
                <div className="font-medium">{voice.name}</div>
                <div className="text-xs text-gray-500">
                  Voice preview • {formatTime(voice.duration)}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Category tags */}
              <div className="relative">
                {voice.category && voice.category.length > 0 && (
                  <>
                    <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs rounded-full mr-4">
                      {voice.category[0]}
                    </span>
                    
                    {voice.category.length > 1 && (
                      <>
                        <span 
                          className="px-3 py-1 bg-gray-100 text-gray-800 text-xs rounded-full cursor-pointer hover:bg-gray-200"
                          onClick={() => toggleCategoryDropdown(voice.id)}
                          onMouseEnter={() => toggleCategoryDropdown(voice.id)}
                          onMouseLeave={() => toggleCategoryDropdown(voice.id)}
                        >
                          +{voice.category.length - 1} more...
                        </span>
                        
                        {visibleCategoryDropdowns[voice.id] && (
                          <div className="absolute z-10 mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 w-40">
                            <div className="text-xs font-medium text-gray-700 mb-1">All Categories</div>
                            <div className="space-y-1">
                              {voice.category.map((cat, idx) => (
                                <div key={idx} className="px-2 py-1 text-sm text-gray-800 hover:bg-gray-50 rounded">
                                  {cat}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
              
              {/* Action buttons */}
              <div className="flex space-x-1">
                <button 
                  onClick={() => handleUseVoice(voice.id)}
                  className="px-2 inline-flex items-center gap-2 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors"
                >
                  <RiLoopLeftLine /> <span>Use</span>
                </button>
                <button 
                  onClick={() => handleViewVoice(voice.id)}
                  className="px-2 inline-flex items-center gap-2 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors"
                >
                  <CgDetailsMore className="text-xl" /> <span>View</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Audio Progress Bar (optional - shows when playing) */}
      {isPlaying && selectedVoice && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700">
              {voices.find(v => v.id === selectedVoice)?.name}
            </span>
            <span className="text-xs text-gray-500">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <div 
            className="w-full h-2 bg-gray-200 rounded-full cursor-pointer overflow-hidden"
            onClick={handleSeek}
          >
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SampleVoices;