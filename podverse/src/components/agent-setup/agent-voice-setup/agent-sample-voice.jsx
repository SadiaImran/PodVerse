import { useState, useRef, useEffect } from "react";
import { FaPlay, FaPause, FaCheckCircle } from "react-icons/fa";
import { RiLoopLeftLine } from "react-icons/ri";
import { CgDetailsMore, CgSoftwareDownload } from "react-icons/cg";
import { TbRewindBackward5, TbRewindForward5 } from "react-icons/tb";
import { supabase } from "../../../connection_supabase_client.js"; // Adjust the import based on your project structure
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
        const { data, error } = await supabase
        .from('sample_voices')
        .select('*');
        
        if (!error) {
          // Transform database data to match UI requirements
          const transformedVoices = data.map((voice, index) => ({
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
            onVoiceSelect({
              ...transformedVoices[0],
              color: getVoiceColor(voices.indexOf(transformedVoices[0])), // Get background color
              textColor: getVoiceTextColor(voices.indexOf(transformedVoices[0])) // Get text color
            });
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
        src={voices.find(v => v.id === selectedVoice)?.audioSrc || ""}
        onEnded={handleAudioEnded}
        onLoadedMetadata={(e) => {
          setDuration(e.target.duration);
        }}
        style={{ display: "none" }}
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
    </div>
  );
};


export default SampleVoices;