import { useState, useRef, useEffect } from "react";
import { FaPlay, FaPause, FaCheckCircle } from "react-icons/fa";
import axios from "axios";
import { getSupabaseAuthorizedtoken } from "../../../supabaseClient";

const SampleVoices = ({ onVoiceSelect }) => {
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [voices, setVoices] = useState([]);
  
  const audioRef = useRef(null);
  const progressInterval = useRef(null);
  const durationsLoadedRef = useRef(false);

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

        if (response.data.success) {
          const fetchedVoices = response.data.data;
          
          // Add UI properties to each voice
          const transformedVoices = fetchedVoices.map((voice, index) => {
            return {
              ...voice,
              color: getVoiceColor(index),
              textColor: 'text-white',
              duration: 0 // Will be updated when audio loads
            };
          });
          
          setVoices(transformedVoices);
          durationsLoadedRef.current = false; // Reset to load durations for new voices
          
          // Set first voice as selected if none selected
          if (transformedVoices.length > 0 && !selectedVoice) {
            setSelectedVoice(transformedVoices[0].id);
            if (onVoiceSelect) {
              onVoiceSelect(transformedVoices[0]);
            }
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

  // Helper function to get voice colors (gradient like audio edit sounds)
  const getVoiceColor = (index) => {
    const gradients = [
      'bg-gradient-to-br from-blue-800 to-blue-300',
      'bg-gradient-to-br from-purple-600 to-purple-300',
      'bg-gradient-to-br from-indigo-600 to-indigo-300',
      'bg-gradient-to-br from-violet-600 to-violet-300',
      'bg-gradient-to-br from-blue-700 to-blue-400',
      'bg-gradient-to-br from-purple-700 to-purple-400',
      'bg-gradient-to-br from-indigo-700 to-indigo-400',
      'bg-gradient-to-br from-violet-700 to-violet-400',
    ];
    return gradients[index % gradients.length];
  };

  // Update audio source when selected voice changes (only when voice actually changes)
  useEffect(() => {
    if (audioRef.current && selectedVoice && voices.length > 0) {
      const selectedVoiceData = voices.find(v => v.id === selectedVoice);
      if (selectedVoiceData && selectedVoiceData.audioSrc) {
        // Only load if the src is different
        if (audioRef.current.src !== selectedVoiceData.audioSrc) {
          audioRef.current.src = selectedVoiceData.audioSrc;
          audioRef.current.load();
        }
        
        if (isPlaying) {
          audioRef.current.play().catch(err => {
            console.error('❌ Error playing audio:', err);
            setIsPlaying(false);
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVoice, isPlaying]); // Removed 'voices' to prevent loop

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

  // Handle audio metadata loaded - update duration for the voice
  const handleLoadedMetadata = (e) => {
    const audioDuration = e.target.duration;
    if (audioDuration && !isNaN(audioDuration) && selectedVoice) {
      setDuration(audioDuration);
      
      // Update the duration in voices state for the selected voice only
      setVoices(prev => {
        const voiceExists = prev.find(v => v.id === selectedVoice && v.duration === audioDuration);
        if (voiceExists) return prev; // Already updated, prevent re-render
        
        return prev.map(v => 
          v.id === selectedVoice && (!v.duration || v.duration === 0)
            ? { ...v, duration: audioDuration }
            : v
        );
      });
    }
  };

  // Load durations for all voices (only once, in batches to prevent excessive loading)
  useEffect(() => {
    if (voices.length === 0 || durationsLoadedRef.current) return;
    
    // Check if any voice already has duration loaded
    const hasAnyDuration = voices.some(v => v.duration && v.duration > 0);
    if (hasAnyDuration) {
      durationsLoadedRef.current = true;
      return;
    }
    
    durationsLoadedRef.current = true;
    
    // Load durations in small batches with delay to prevent excessive API calls
    const loadDurationsInBatches = async () => {
      const voicesToLoad = voices.filter(v => v.audioSrc && (!v.duration || v.duration === 0));
      const batchSize = 3; // Load 3 at a time
      
      for (let i = 0; i < voicesToLoad.length; i += batchSize) {
        const batch = voicesToLoad.slice(i, i + batchSize);
        
        const batchPromises = batch.map((voice) => {
          return new Promise((resolve) => {
            const audio = new Audio(voice.audioSrc);
            const timeout = setTimeout(() => {
              resolve({ id: voice.id, duration: 0 });
              audio.remove();
            }, 3000); // 3 second timeout
            
            audio.addEventListener('loadedmetadata', () => {
              clearTimeout(timeout);
              const duration = audio.duration;
              resolve({ id: voice.id, duration: isNaN(duration) ? 0 : duration });
              audio.remove();
            });
            audio.addEventListener('error', () => {
              clearTimeout(timeout);
              resolve({ id: voice.id, duration: 0 });
              audio.remove();
            });
            audio.load();
          });
        });

        const batchDurations = await Promise.all(batchPromises);
        
        // Update voices state with batch results
        setVoices(prev => prev.map(voice => {
          const durationData = batchDurations.find(d => d.id === voice.id);
          if (durationData && durationData.duration > 0) {
            return { ...voice, duration: durationData.duration };
          }
          return voice;
        }));
        
        // Small delay between batches to prevent overwhelming the browser
        if (i + batchSize < voicesToLoad.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    };

    // Start loading after a small delay
    setTimeout(() => {
      loadDurationsInBatches();
    }, 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voices.length]); // Only run when voices count changes

  // Toggle play/pause for a voice
  const togglePlay = (voiceId) => {
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
      // Save voice name to sessionStorage
      if (voice.name) {
        sessionStorage.setItem('selected_voice_name', voice.name);
      }
    }
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
      
      {/* Voice List - Single Column with Scroll */}
      <div className="max-h-[600px] overflow-y-auto pr-2 space-y-3">
        {voices.map((voice, idx) => (
          <div
            key={voice.id}
            className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all cursor-pointer ${
              selectedVoice === voice.id
                ? 'border-[#6057C7] bg-[#6057C7]/10'
                : 'border-gray-200 bg-white hover:border-[#A388E7] hover:bg-gray-50'
            }`}
            onClick={() => togglePlay(voice.id)}
          >
            {/* Avatar - No click functionality */}
            <div className={`flex-shrink-0 w-14 h-14 rounded-full ${voice.color} ${voice.textColor} flex items-center justify-center shadow-md relative overflow-hidden`}>
              <span className="font-bold text-xl relative z-10">{voice.name[0]}</span>
            </div>

            {/* Voice Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-semibold text-gray-900 truncate">
                  {voice.name}
                </h3>
                {selectedVoice === voice.id && (
                  <FaCheckCircle className="text-[#6057C7] flex-shrink-0 ml-2" size={18} />
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">
                  {formatTime(voice.duration)}
                </span>
                {/* Progress Bar (when playing this voice) */}
                {isPlaying && selectedVoice === voice.id && (
                  <>
                    <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden max-w-[200px]">
                      <div
                        className="h-full bg-[#6057C7] rounded-full transition-all duration-100"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Select Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleUseVoice(voice.id);
              }}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedVoice === voice.id
                  ? 'bg-[#6057C7] text-white hover:bg-[#2F2867]'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {selectedVoice === voice.id ? 'Selected' : 'Use'}
            </button>
          </div>
        ))}
      </div>

    </div>
  );
};

export default SampleVoices;