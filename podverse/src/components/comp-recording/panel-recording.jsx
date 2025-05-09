import React, { useState, useEffect, useRef } from 'react';
import { FiMic, FiPause, FiPlay, FiStopCircle, FiSave, FiRefreshCw, FiVolume2, FiUser, FiDownload, 
  FiCpu, FiHeadphones, FiSkipBack, FiSkipForward, FiPlus, FiSettings, FiClock } from 'react-icons/fi';
import { BiMicrophone } from 'react-icons/bi';

function PanelRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  
  // Multiple speakers
  const [speakers, setSpeakers] = useState([
    { id: 'host', name: 'AI Host', type: 'ai', color: 'purple', icon: FiCpu },
    { id: 'guest1', name: 'You (Human Guest)', type: 'human', color: 'blue', icon: FiUser },
    { id: 'guest2', name: 'AI Expert', type: 'ai', color: 'green', icon: FiCpu },
  ]);
  
  const [selectedSpeakerId, setSelectedSpeakerId] = useState('host');
  const [showAllSpeakers, setShowAllSpeakers] = useState(false);
  const [showAddSpeakerModal, setShowAddSpeakerModal] = useState(false);
  const [newSpeakerName, setNewSpeakerName] = useState('');
  const [newSpeakerType, setNewSpeakerType] = useState('human');
  
  const audioPlayerRef = useRef(null);
  
  // Simulate recording timer
  useEffect(() => {
    let interval;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setElapsedTime(prevTime => prevTime + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);
  
  // Simulate playback timer
  useEffect(() => {
    let playbackInterval;
    if (isPlaying && !isRecording) {
      playbackInterval = setInterval(() => {
        setCurrentPlaybackTime(prevTime => {
          const newTime = prevTime + playbackRate;
          return newTime >= elapsedTime ? elapsedTime : newTime;
        });
      }, 1000);
    }
    return () => clearInterval(playbackInterval);
  }, [isPlaying, isRecording, playbackRate, elapsedTime]);

  // MIC BUTTON — now only toggles recording, not timer
const handleMicPress = () => {
  if (!isRecording) {
    setIsRecording(true);
    setIsPaused(false);
  } else {
    setIsRecording(false);
    setIsPaused(false);
    setActiveSpeaker(null);
  }
};

// PLAYBACK START — controls only playback
const handlePlaybackStart = () => {
  if (elapsedTime > 0) {
    setIsPlaying(true);
  }
};

// "START" BUTTON — use this for full session + timer start
const handleStartSession = () => {
  if (!isRecording) {
    setElapsedTime(0); // Reset timer when session starts
    setConversationHistory([]);
    setActiveSpeaker(selectedSpeakerId);
    setIsRecording(true);
    setIsPaused(false);
    simulateSpeaking(); // start conversation
  }
};

// Playback pause logic
const handlePlaybackPause = () => {
  setIsPlaying(false);
};

// Recording timer — only runs if isRecording is true AND playback is false
useEffect(() => {
  let interval;
  if (isRecording && !isPaused && !isPlaying) {
    interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
  }
  return () => clearInterval(interval);
}, [isRecording, isPaused, isPlaying]);

// Playback timer — only runs when playing, not recording
useEffect(() => {
  let playbackInterval;
  if (isPlaying && !isRecording) {
    playbackInterval = setInterval(() => {
      setCurrentPlaybackTime(prev => {
        const newTime = prev + playbackRate;
        return newTime >= elapsedTime ? elapsedTime : newTime;
      });
    }, 1000);
  }
  return () => clearInterval(playbackInterval);
}, [isPlaying, isRecording, playbackRate, elapsedTime]);

  
  // Format time as MM:SS
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Find speaker by ID
  const findSpeaker = (id) => {
    return speakers.find(speaker => speaker.id === id);
  };
  
  // Simulate user speaking
  const simulateSpeaking = () => {
    if (isRecording && !isPaused) {
      const currentSpeaker = findSpeaker(selectedSpeakerId);
      
      let phrases = [];
      if (currentSpeaker.type === 'human') {
        phrases = [
          "I've been thinking about how AI is changing the podcast industry.",
          "What do you think are the biggest challenges creators face today?",
          "Let's talk about monetization strategies for new podcasters.",
          "How has audio content evolved in the past five years?",
        ];
      } else {
        // AI speaker phrases
        if (currentSpeaker.id === 'host') {
          phrases = [
            "Welcome to today's episode! We're discussing the future of podcasting.",
            "Let's dive deeper into the topic of AI-enhanced audio production.",
            "I'd like to get your thoughts on how podcasters can build a sustainable business model.",
            "That's a fascinating perspective. How do you see this evolving in the next few years?",
          ];
        } else {
          phrases = [
            "From an industry perspective, we're seeing three major shifts in podcast consumption habits.",
            "The data suggests that shorter, more focused content is gaining traction among younger listeners.",
            "I believe the integration of multimodal content will transform how we think about podcasting.",
            "Studies show that personalized audio experiences increase engagement by up to 40%.",
          ];
        }
      }
      
      const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
      
      // Add to conversation history
      const newMessage = {
        speakerId: currentSpeaker.id,
        speakerName: currentSpeaker.name,
        content: randomPhrase,
        timestamp: elapsedTime,
        color: currentSpeaker.color,
        icon: currentSpeaker.icon,
      };
      
      setConversationHistory(prev => [...prev, newMessage]);
      setActiveSpeaker(currentSpeaker.id);
      
      // If AI speaker, simulate thinking and response from another AI
      if (currentSpeaker.type === 'ai') {
        setTimeout(() => {
          setActiveSpeaker(null);
          
          // Find another speaker to respond (preferably a different type)
          const availableSpeakers = speakers.filter(s => 
            s.id !== currentSpeaker.id && 
            (currentSpeaker.type === 'ai' ? s.type !== 'ai' : true)
          );
          
          if (availableSpeakers.length > 0) {
            const nextSpeaker = availableSpeakers[Math.floor(Math.random() * availableSpeakers.length)];
            setSelectedSpeakerId(nextSpeaker.id);
            
            // Simulate thinking if it's an AI
            if (nextSpeaker.type === 'ai') {
              setIsAiThinking(true);
              setTimeout(() => {
                setIsAiThinking(false);
                simulateSpeaking();
              }, 2000);
            } else {
              // If human, wait a bit and then simulate speaking
              setTimeout(() => {
                simulateSpeaking();
              }, 1500);
            }
          }
        }, 3000);
      } else {
        // If human speaker, simulate AI response after a short delay
        setTimeout(() => {
          setActiveSpeaker(null);
          
          // Find an AI speaker to respond
          const aiSpeakers = speakers.filter(s => s.type === 'ai');
          if (aiSpeakers.length > 0) {
            const aiSpeaker = aiSpeakers[Math.floor(Math.random() * aiSpeakers.length)];
            setSelectedSpeakerId(aiSpeaker.id);
            setIsAiThinking(true);
            
            setTimeout(() => {
              setIsAiThinking(false);
              simulateSpeaking();
            }, 2000);
          }
        }, 3000);
      }
    }
  };
  
  // Start recording user's voice
  const handleStartRecording = () => {
    setIsRecording(true);
  };
  
  // Stop recording user's voice
  const handleStopRecording = () => {
    setIsRecording(false);
  };
  
  // Simulate pausing recording
  const handlePauseRecording = () => {
    setIsPaused(!isPaused);
    if (!isPaused) {
      setActiveSpeaker(null);
    } else {
      setActiveSpeaker(selectedSpeakerId);
      setTimeout(() => {
        simulateSpeaking();
      }, 1000);
    }
  };
  

  
  const handlePlaybackSeek = (e) => {
    const seekTime = parseInt(e.target.value);
    setCurrentPlaybackTime(seekTime);
  };
  
  const handleSkipForward = () => {
    setCurrentPlaybackTime(prev => {
      const newTime = prev + 10;
      return newTime >= elapsedTime ? elapsedTime : newTime;
    });
  };
  
  const handleSkipBackward = () => {
    setCurrentPlaybackTime(prev => {
      const newTime = prev - 10;
      return newTime < 0 ? 0 : newTime;
    });
  };
  
  // Simulate resetting session
  const handleResetSession = () => {
    if (window.confirm("Are you sure you want to restart the session? All recorded content will be lost.")) {
      setIsRecording(false);
      setIsPaused(false);
      setIsPlaying(false);
      setElapsedTime(0);
      setCurrentPlaybackTime(0);
      setConversationHistory([]);
      setActiveSpeaker(null);
    }
  };
  
  // Add new speaker
  const handleAddSpeaker = () => {
    if (newSpeakerName.trim()) {
      const colorOptions = ['pink', 'orange', 'yellow', 'teal', 'indigo', 'red'];
      const randomColor = colorOptions[Math.floor(Math.random() * colorOptions.length)];
      
      const newSpeaker = {
        id: `speaker-${Date.now()}`,
        name: newSpeakerName.trim(),
        type: newSpeakerType,
        color: randomColor,
        icon: newSpeakerType === 'ai' ? FiCpu : FiUser,
      };
      
      setSpeakers([...speakers, newSpeaker]);
      setNewSpeakerName('');
      setShowAddSpeakerModal(false);
    }
  };
  
  // Change active speaker
  const handleChangeSpeaker = (speakerId) => {
    if (isRecording && !isPaused) {
      setSelectedSpeakerId(speakerId);
      setActiveSpeaker(speakerId);
      
      // Cancel any AI thinking
      setIsAiThinking(false);
      
      // Simulate new speaker talking
      setTimeout(() => {
        simulateSpeaking();
      }, 500);
    } else {
      setSelectedSpeakerId(speakerId);
    }
  };
  
  // Wave animation component
  const WaveAnimation = ({ isActive, color }) => {
    return (
      <div className="flex items-center justify-center h-12 gap-1">
        {[...Array(8)].map((_, i) => (
          <div 
            key={i}
            className={`w-1 rounded-full transition-all duration-300 ease-in-out bg-${color}-500`}
            style={{
              height: isActive ? `${Math.random() * 100}%` : '15%',
              animationDelay: `${i * 0.1}s`,
              transitionDelay: `${i * 0.05}s`
            }}
          ></div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="w-full h-full ">
      {/* Main content area */}
      <div className="flex flex-col-reverse lg:flex-row h-full">
        {/* Left Panel - Transcription */}
        <div className="w-full lg:w-1/2 h-full border-r border-gray-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-light-charcoal font-subheadingDMSans">📝Conversation Transcript</h2>
            <p className="text-base text-light-grey ml-7 font-subheadingDMSans">From speech to text</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              {conversationHistory.map((message, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg bg-${message.color}-50 border-l-4 border-${message.color}-400`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div 
                      className={`w-8 h-8 rounded-full flex items-center justify-center bg-${message.color}-100 text-${message.color}-600`}
                    >
                      <message.icon size={16} />
                    </div>
                    <div>
                      <span className="font-medium">
                        {message.speakerName}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-700 ml-10">{message.content}</p>
                </div>
              ))}
              
              {conversationHistory.length === 0 && (
                <div className="text-center text-gray-500 py-10">
                  <p className='font-labelDMSans'>Start recording to see the transcript here</p>
                </div>
              )}
              
              {isAiThinking && (
                <div className="p-3 rounded-lg bg-blue-50 border-l-4 border-blue-400">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                      <FiCpu size={16} />
                    </div>
                    <span className="font-medium">
                      {findSpeaker(selectedSpeakerId)?.name} (Thinking)
                    </span>
                  </div>
                  <div className="ml-10 flex gap-1">
                    <span className="h-2 w-2 bg-blue-400 rounded-full animate-bounce"></span>
                    <span className="h-2 w-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    <span className="h-2 w-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-7 border-t border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Total Time:</span>
                <span className="text-sm font-mono">{formatTime(elapsedTime)}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Panel - Speakers and visualization */}
        <div className="w-full lg:w-1/2 h-full flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-light-charcoal font-subheadingDMSans">🎙️Live Recording</h2>
                <p className="text-base text-light-grey ml-7 font-subheadingDMSans">Your podcast. Your command.</p>
              </div>
              {/* Add Speaker Button */}
              <div className="">
                <button
                  onClick={() => setShowAddSpeakerModal(true)}
                  className="bg-light-purple hover:bg-light-lightPurple text-light-lightGrey font-subheadingDMSans px-3 py-2 rounded-xl text-sm flex items-center gap-1"
                >
                  <FiPlus size={14} onClick={handlePlaybackStart}/>
                  Add Speaker
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3 font-subheadingDMSans =">🎤 Speakers</h3>
                          
              
              <div className="flex items-center gap-3 overflow-x-auto">
                {/* Display first 5 speakers */}
                {speakers.slice(0, 5).map((speaker) => (
                  <div
                    key={speaker.id}
                    className="flex flex-col items-center cursor-pointer"
                    title={speaker.name}
                    onClick={() => handleChangeSpeaker(speaker.id)}
                  >
                    <div
                      className={`w-12 h-12 rounded-full bg-${speaker.color}-500 flex items-center justify-center text-white`}
                    >
                      {speaker.icon ? <speaker.icon size={18} /> : <FiUser size={18} />}
                    </div>
                    <span className="text-xs text-gray-600 mt-2">{speaker.name}</span>
                  </div>
                ))}
    

                {/* Handle overflow */}
                {speakers.length > 5 && (
                  <div
                    className="flex flex-col items-center cursor-pointer"
                    onClick={() => setShowAllSpeakers(true)}
                    title={`${speakers.length - 5} more`}
                  >
                    <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-700">
                      +{speakers.length - 5}
                    </div>
                    <span className="text-xs text-gray-600 mt-1">More</span>
                  </div>
                )}
              </div>

              {/* Popup for additional speakers */}
              {showAllSpeakers && (
                <div className="absolute bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">All Speakers</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {speakers.map((speaker) => (
                      <div
                        key={speaker.id}
                        className="flex flex-col items-center cursor-pointer"
                        title={speaker.name}
                        onClick={() => handleChangeSpeaker(speaker.id)}
                      >
                        <div
                          className={`w-12 h-12 rounded-full bg-${speaker.color}-500 flex items-center justify-center text-white`}
                        >
                          {speaker.icon ? <speaker.icon size={18} /> : <FiUser size={18} />}
                        </div>
                        <span className="text-xs text-gray-600 mt-2">{speaker.name}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    className="mt-2 text-sm text-gray-500 hover:text-gray-700"
                    onClick={() => setShowAllSpeakers(false)}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
            
            {/* Active speaker visualization */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold font-subheadingDMSans text-gray-700 mb-3">Active Speaker</h3>
              <div className="bg-gray-100 rounded-lg p-4">
                {activeSpeaker ? (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-full bg-${findSpeaker(activeSpeaker)?.color}-500 flex items-center justify-center text-white`}>
                        {findSpeaker(activeSpeaker)?.icon({ size: 18 })}
                      </div>
                      <div>
                        <h4 className="font-medium">{findSpeaker(activeSpeaker)?.name}</h4>
                        <span className="text-sm text-gray-500">Speaking...</span>
                      </div>
                    </div>
                    
                    <div className="h-24 flex items-center">
                      <WaveAnimation 
                        isActive={true} 
                        color={findSpeaker(activeSpeaker)?.color} 
                      />
                    </div>
                  </div>
                ) : isAiThinking ? (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-full bg-${findSpeaker(selectedSpeakerId)?.color}-500 flex items-center justify-center text-white`}>
                        {findSpeaker(selectedSpeakerId)?.icon({ size: 18 })}
                      </div>
                      <div>
                        <h4 className="font-medium">{findSpeaker(selectedSpeakerId)?.name}</h4>
                        <span className="text-sm text-gray-500">Thinking...</span>
                      </div>
                    </div>
                    
                    <div className="h-24 flex items-center justify-center">
                      <div className="flex gap-2">
                        <span className="h-4 w-4 bg-gray-400 rounded-full animate-bounce"></span>
                        <span className="h-4 w-4 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                        <span className="h-4 w-4 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-10">
                    <p>No active speaker</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Enhanced playback controls */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-700 mb-3">Playback Controls</h3>
              
              <div className="bg-gray-100 rounded-lg p-4">
                {/* Progress bar */}
                <div className="mb-4">
                  <input
                    type="range"
                    min="0"
                    max={elapsedTime || 1}
                    value={isPlaying ? currentPlaybackTime : isRecording ? elapsedTime : currentPlaybackTime}
                    onChange={handlePlaybackSeek}
                    disabled={isRecording}
                    className="w-full accent-purple-600"
                  />
                  
                  <div className="flex justify-between text-sm text-gray-600 mt-2">
                    <span className="font-mono">{formatTime(isPlaying ? currentPlaybackTime : isRecording ? elapsedTime : currentPlaybackTime)}</span>
                    <span className="font-mono">{formatTime(elapsedTime)}</span>
                  </div>
                </div>
                
                {/* Playback buttons */}
                <div className="flex items-center justify-center gap-4">
                  <button 
                    onClick={handleSkipBackward}
                    disabled={isRecording || currentPlaybackTime === 0}
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isRecording || currentPlaybackTime === 0 ? 'text-gray-400' : 'text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <FiSkipBack size={18} />
                  </button>
                  
                  {!isPlaying ? (
                    <button 
                      onClick={handlePlaybackStart}
                      disabled={isRecording || elapsedTime === 0}
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isRecording || elapsedTime === 0
                          ? 'bg-gray-300 text-gray-500'
                          : 'bg-green-500 text-white hover:bg-green-600'
                      }`}
                    >
                      <FiPlay size={20} onClick={handleStartSession}/>
                    </button>
                  ) : (
                    <button 
                      onClick={handlePlaybackPause}
                      className="w-12 h-12 bg-yellow-500 text-white rounded-full flex items-center justify-center hover:bg-yellow-600"
                    >
                      <FiPause size={20} />
                    </button>
                  )}
                  
                  <button 
                    onClick={handleSkipForward}
                    disabled={isRecording || currentPlaybackTime >= elapsedTime}
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isRecording || currentPlaybackTime >= elapsedTime ? 'text-gray-400' : 'text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <FiSkipForward size={18} />
                  </button>
                </div>
                
                {/* Playback speed */}
                <div className="mt-4 flex items-center justify-center gap-2">
                  <FiClock size={14} className="text-gray-600" />
                  <select
                    value={playbackRate}
                    onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                    disabled={isRecording}
                    className="text-sm bg-white border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="0.5">0.5x</option>
                    <option value="0.75">0.75x</option>
                    <option value="1">1x</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2">2x</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          {/* Recording controls */}
          <div className="p-4 border-t border-gray-200 bg-white flex items-center justify-center gap-6">
            {/* Mic Button */}
            <button
              onClick={() => {
                if (isRecording) {
                  handleStopRecording();
                } else {
                  handleStartRecording();
                }
              }}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                isRecording ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
              title={isRecording ? 'Stop Recording User Voice' : 'Start Recording User Voice'}
            >
              <FiMic size={24} onClick={handleMicPress} />
            </button>

            {/* Play/Pause Button */}
            <button
              onClick={() => {
                if (isPlaying) {
                  handlePlaybackPause();
                } else {
                  handlePlaybackStart();
                }
              }}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                isPlaying
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
              title={isPlaying ? 'Pause Podcast' : 'Start Podcast'}
            >
              {isPlaying ? <FiPause size={24} /> : <FiPlay size={24} />}
            </button>

            {/* Reset Button */}
            <button
              onClick={handleResetSession}
              className="w-14 h-14 rounded-full flex items-center justify-center bg-gray-300 hover:bg-gray-400 text-gray-700 transition-colors"
              title="Reset Session"
            >
              <FiRefreshCw size={24} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Recording indicator */}
      {isRecording && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1 animate-pulse">
          <div className="w-2 h-2 bg-white rounded-full"></div>
          {isPaused ? 'Recording Paused' : 'Recording'}
        </div>
      )}
      
      {/* Speakers Section */}
      <div className="mb-6 font-quoteInria">
        <h3 className="text-lg font-medium text-gray-700 mb-3 ">🎤Speakers</h3>
        <div className="flex items-center gap-3 overflow-x-auto">
          {/* Display first 5 speakers */}
          {speakers.slice(0, 5).map((speaker) => (
            <div
              key={speaker.id}
              className="flex flex-col items-center cursor-pointer"
              title={speaker.name}
              onClick={() => handleChangeSpeaker(speaker.id)}
            >
              <div
                className={`w-12 h-12 rounded-full bg-${speaker.color}-500 flex items-center justify-center text-white`}
              >
                {speaker.icon ? <speaker.icon size={18} /> : <FiUser size={18} />}
              </div>
              <span className="text-xs text-gray-600 mt-3">{speaker.name}</span>
            </div>
          ))}

          {/* Handle overflow */}
          {speakers.length > 5 && (
            <div
              className="flex flex-col items-center cursor-pointer"
              onClick={() => setShowAllSpeakers(true)}
              title={`${speakers.length - 5} more`}
            >
              <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-700">
                +{speakers.length - 5}
              </div>
              <span className="text-xs text-gray-600 mt-1">More</span>
            </div>
          )}
        </div>

        {/* Popup for additional speakers */}
        {showAllSpeakers && (
          <div className="absolute bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50">
            <h4 className="text-sm font-medium text-gray-700 mb-2">All Speakers</h4>
            <div className="grid grid-cols-3 gap-2">
              {speakers.map((speaker) => (
                <div
                  key={speaker.id}
                  className="flex flex-col items-center cursor-pointer"
                  title={speaker.name}
                  onClick={() => handleChangeSpeaker(speaker.id)}
                >
                  <div
                    className={`w-12 h-12 rounded-full bg-${speaker.color}-500 flex items-center justify-center text-white`}
                  >
                    {speaker.icon ? <speaker.icon size={18} /> : <FiUser size={18} />}
                  </div>
                  <span className="text-xs text-gray-600 mt-1">{speaker.name}</span>
                </div>
              ))}
            </div>
            <button
              className="mt-2 text-sm text-gray-500 hover:text-gray-700"
              onClick={() => setShowAllSpeakers(false)}
            >
              Close
            </button>
          </div>
        )}


        {/* Add Speaker Modal */}
        {showAddSpeakerModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-w-full">
              <h3 className="text-lg font-medium mb-4">Add New Speaker</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Speaker Name
                </label>
                <input
                  type="text"
                  value={newSpeakerName}
                  onChange={(e) => setNewSpeakerName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Enter speaker name"
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Speaker Type
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="speakerType"
                      value="ai"
                      checked={newSpeakerType === 'ai'}
                      onChange={() => setNewSpeakerType('ai')}
                      className="mr-2"
                    />
                    AI Speaker
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="speakerType"
                      value="human"
                      checked={newSpeakerType === 'human'}
                      onChange={() => setNewSpeakerType('human')}
                      className="mr-2"
                    />
                    Human Speaker
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowAddSpeakerModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSpeaker}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Add Speaker
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Hidden audio player for playback */}
      <audio ref={audioPlayerRef} style={{ display: 'none' }}></audio>
    </div>
  );
};

export default PanelRecording;
