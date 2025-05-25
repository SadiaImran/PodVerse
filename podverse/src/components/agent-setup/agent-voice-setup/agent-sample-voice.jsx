import { useState, useRef, useEffect } from "react";
import { FaPlay, FaPause, FaCheckCircle } from "react-icons/fa";
import { RiLoopLeftLine } from "react-icons/ri";
import { CgDetailsMore, CgSoftwareDownload } from "react-icons/cg";
import { TbRewindBackward5, TbRewindForward5 } from "react-icons/tb";

// SampleVoices component
const SampleVoices = ({onVoiceSelect}) => {
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


  // Fetch voices from database
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:5000/api/default-voices', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
          // Transform database data to match UI requirements
          const transformedVoices = data.data.map((voice, index) => ({
            id: voice.id,
            name: voice.name,
            category: voice.category,
            audioSrc: voice.audioSrc,
            description: voice.description,
            // Add default UI properties
            color: getVoiceColor(index),
            textColor: getVoiceTextColor(index),
            duration: 30 // Default duration, will be updated when audio loads
          }));
          
          setVoices(transformedVoices);
          
          // Set first voice as selected if none selected
          if (transformedVoices.length > 0 && !selectedVoice) {
            setSelectedVoice(transformedVoices[0].id);
          }
        } else {
          throw new Error(data.message || 'Failed to fetch voices');
        }
      } catch (err) {
        console.error('Error fetching voices:', err);
        setError(err.message);
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

  const getVoiceTextColor = (index) => {
    return 'text-white'; // All colors work well with white text
  };


  useEffect(() => {
    if (audioRef.current) {
      const selectedVoiceData = voices.find(v => v.id === selectedVoice);
      if (selectedVoiceData) {
        audioRef.current.src = selectedVoiceData.audioSrc;
        audioRef.current.load();
        setDuration(selectedVoiceData.duration);
        
        if (isPlaying) {
          audioRef.current.play();
        }
      }
    }
  }, [selectedVoice, voices]);

  // Handle play/pause
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play();
        // Setup interval to update progress
        progressInterval.current = setInterval(() => {
          if (audioRef.current) {
            const currentTime = audioRef.current.currentTime;
            setCurrentTime(currentTime);
            setProgress((currentTime / audioRef.current.duration) * 100);
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

  // Toggle play/pause for a voice
  const togglePlay = (voiceId) => {
    if (selectedVoice !== voiceId) {
      setSelectedVoice(voiceId);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  // Handle seeking in the progress bar
  const handleSeek = (e) => {
    const seekPosition = e.nativeEvent.offsetX / e.target.clientWidth;
    const seekTime = duration * seekPosition;
    
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
      setProgress(seekPosition * 100);
    }
  };

  // Forward 10 seconds
  const forward10 = () => {
    if (audioRef.current) {
      const newTime = Math.min(audioRef.current.duration, audioRef.current.currentTime + 10);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      setProgress((newTime / audioRef.current.duration) * 100);
    }
  };

  // Rewind 10 seconds
  const rewind10 = () => {
    if (audioRef.current) {
      const newTime = Math.max(0, audioRef.current.currentTime - 10);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      setProgress((newTime / audioRef.current.duration) * 100);
    }
  };

  // Format time in MM:SS
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Handle use voice
  const handleUseVoice = (voiceId) => {
    setSelectedVoice(voiceId);
  };

  //handle view voice details
  const handleViewVoice = (voiceId) => {
  setSelectedVoice(voiceId);
  const voice = voices.find(v => v.id === voiceId);
  if (onVoiceSelect && voice) {
    onVoiceSelect({
      ...voice,
      color: getVoiceColor(voices.indexOf(voice)), // Get background color
      textColor: getVoiceTextColor(voices.indexOf(voice)) // Get text color
    });
  }
};

  // Toggle category dropdown visibility
  const toggleCategoryDropdown = (voiceId) => {
    setVisibleCategoryDropdowns(prev => ({
      ...prev,
      [voiceId]: !prev[voiceId]
    }));
  };

  return (
    <div className="w-full">
      {/* Hidden audio element for playback */}
      <audio 
        ref={audioRef}
        onEnded={handleAudioEnded}
        onLoadedMetadata={(e) => {
          setDuration(e.target.duration);
        }}
      />
      
      <div className="space-y-2">
        {voices.map((voice , idx) => (
          <div 
            key={voice.id} 
            className={`flex items-center justify-between p-2 border-b border-gray-200 hover:bg-gray-50 ${selectedVoice === voice.id ? 'bg-green-50' : ''}`}
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
                <div className={`w-12 h-12 rounded-full ${getVoiceColor(idx)} ${getVoiceTextColor(idx)} flex items-center justify-center cursor-pointer`}>
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
                   Voice preview 
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Category tags */}
              <div className="relative">
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
              </div>
              
              {/* Action buttons */}
              <div className="flex space-x-1">
                <button 
                  onClick={() => handleUseVoice(voice.id)}
                  className="px-2 inline-flex items-center gap-2 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors"
                >
                  <RiLoopLeftLine/> <span>Use</span>
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
      
      {/* Audio player */}
      {selectedVoice && (
        <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-12 h-12 bg-black rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors text-white"
              >
                {isPlaying ? (
                  <FaPause />
                ) : (
                  <FaPlay className="ml-1" />
                )}
              </button>
              
              <div className="text-sm">
                {voices.find(v => v.id === selectedVoice)?.name || "Voice"}
                <div className="text-xs text-gray-500">Default voice preview</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <button 
                  onClick={rewind10}
                  className="text-gray-600 hover:text-gray-700"
                >
                  <span className="sr-only">Rewind</span>
                  <TbRewindBackward5/>
                </button>
                
                <div 
                  className="w-64 h-1 bg-gray-200 rounded-full relative cursor-pointer"
                  onClick={handleSeek}
                >
                  <div 
                    className="absolute left-0 top-0 bottom-0 bg-gray-500 rounded-full"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                
                <button 
                  onClick={forward10}
                  className="text-gray-600 hover:text-gray-700"
                >
                  <span className="sr-only">Forward</span>
                  <TbRewindForward5 />
                </button>
                
                <span className="text-xs text-gray-500">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
              
              <div className="flex space-x-2">
                <button className="text-gray-600 hover:text-gray-700 text-2xl">
                  <CgSoftwareDownload />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default SampleVoices;