import React, { useState, useEffect } from 'react';
import { FiMic, FiPause, FiPlay, FiStopCircle, FiSave, FiRefreshCw, FiVolume2, FiUser, FiDownload, FiCpu, FiHeadphones } from 'react-icons/fi';
import { BiMicrophone } from 'react-icons/bi';

const PodcastRecordingUI = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [userTranscript, setUserTranscript] = useState('');
  const [aiTranscript, setAiTranscript] = useState('');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  
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
  
  // Format time as MM:SS
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Simulate user speaking
  const simulateUserSpeaking = () => {
    if (isRecording && !isPaused) {
      const userPhrases = [
        "I've been thinking about how AI is changing the podcast industry.",
        "What do you think are the biggest challenges creators face today?",
        "Let's talk about monetization strategies for new podcasters.",
        "How has audio content evolved in the past five years?",
      ];
      
      const randomPhrase = userPhrases[Math.floor(Math.random() * userPhrases.length)];
      setUserTranscript(prev => prev ? `${prev}\n\nYou: ${randomPhrase}` : `You: ${randomPhrase}`);
      
      // Add to conversation history
      const newMessage = {
        speaker: 'user',
        content: randomPhrase,
        timestamp: elapsedTime,
      };
      setConversationHistory(prev => [...prev, newMessage]);
      
      // Simulate AI thinking and response
      setIsAiThinking(true);
      setTimeout(() => {
        setIsAiThinking(false);
        setIsAiSpeaking(true);
        simulateAIResponse();
      }, 2000);
    }
  };
  
  // Simulate AI response
  const simulateAIResponse = () => {
    const aiResponses = [
      "That's a great point! I think podcasting has become more accessible than ever, but that also means there's more competition. Creators need to find their unique voice to stand out.",
      "I'd say monetization is challenging for new podcasters. Building an audience takes time, but exploring options like Patreon or sponsored content can help create sustainable income streams.",
      "Audio content has become much more diverse! We've seen a shift from just interview-style formats to highly produced narrative storytelling and even AI-enhanced audio experiences.",
    ];
    
    const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
    
    setAiTranscript(prev => prev ? `${prev}\n\nAI Guest: ${randomResponse}` : `AI Guest: ${randomResponse}`);
    
    // Add to conversation history
    const newMessage = {
      speaker: 'ai',
      content: randomResponse,
      timestamp: elapsedTime,
    };
    setConversationHistory(prev => [...prev, newMessage]);
    
    setTimeout(() => {
      setIsAiSpeaking(false);
    }, 3000);
  };
  
  // Simulate starting recording
  const handleStartRecording = () => {
    setIsRecording(true);
    setIsPaused(false);
    setTimeout(simulateUserSpeaking, 1500);
  };
  
  // Simulate stopping recording
  const handleStopRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
  };
  
  // Simulate pausing recording
  const handlePauseRecording = () => {
    setIsPaused(!isPaused);
  };
  
  // Simulate resetting session
  const handleResetSession = () => {
    if (window.confirm("Are you sure you want to restart the session? All recorded content will be lost.")) {
      setIsRecording(false);
      setIsPaused(false);
      setElapsedTime(0);
      setUserTranscript('');
      setAiTranscript('');
      setConversationHistory([]);
    }
  };
  
  // Wave animation component
  const WaveAnimation = ({ isActive, color }) => {
    return (
      <div className="flex items-center justify-center h-12 gap-1">
        {[...Array(8)].map((_, i) => (
          <div 
            key={i}
            className={`w-1 rounded-full transition-all duration-300 ease-in-out ${color}`}
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
    <div className="w-full h-full bg-gray-50">
      {/* Main content area */}
      <div className="flex flex-col lg:flex-row h-full">
        {/* Left Panel - Transcription */}
        <div className="w-full lg:w-1/2 h-full border-r border-gray-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Conversation Transcript</h2>
            <p className="text-sm text-gray-500">Real-time transcription of your podcast recording</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              {conversationHistory.map((message, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg ${
                    message.speaker === 'user' 
                      ? 'bg-purple-50 border-l-4 border-purple-400' 
                      : 'bg-blue-50 border-l-4 border-blue-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div 
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        message.speaker === 'user' 
                          ? 'bg-purple-100 text-purple-600' 
                          : 'bg-blue-100 text-blue-600'
                      }`}
                    >
                      {message.speaker === 'user' ? <FiUser size={16} /> : <FiCpu size={16} />}
                    </div>
                    <div>
                      <span className="font-medium">
                        {message.speaker === 'user' ? 'You (Host)' : 'AI Guest'}
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
                  <p>Start recording to see the transcript here</p>
                </div>
              )}
              
              {isAiThinking && (
                <div className="p-3 rounded-lg bg-blue-50 border-l-4 border-blue-400">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                      <FiCpu size={16} />
                    </div>
                    <span className="font-medium">AI Guest</span>
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
          
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Total Time:</span>
                <span className="text-sm font-mono">{formatTime(elapsedTime)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <button className="text-gray-600 hover:text-gray-800 p-2">
                  <FiDownload size={16} />
                </button>
                <button 
                  onClick={handleResetSession}
                  className="text-gray-600 hover:text-gray-800 p-2"
                >
                  <FiRefreshCw size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Panel - Real-time visualization */}
        <div className="w-full lg:w-1/2 h-full flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Live Recording</h2>
            <p className="text-sm text-gray-500">Visualize your conversation in real-time</p>
          </div>
          
          <div className="flex-1 p-6 flex flex-col">
            {/* Host visualization */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white">
                  <FiUser size={18} />
                </div>
                <div>
                  <h3 className="font-medium">You (Host)</h3>
                  <span className="text-sm text-gray-500">
                    {isRecording && !isPaused && !isAiSpeaking ? 'Speaking...' : 'Not active'}
                  </span>
                </div>
              </div>
              
              <div className="bg-gray-100 rounded-lg p-4 h-24 flex items-center">
                <WaveAnimation 
                  isActive={isRecording && !isPaused && !isAiSpeaking} 
                  color="bg-purple-500" 
                />
              </div>
            </div>
            
            {/* AI Guest visualization */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                  <FiCpu size={18} />
                </div>
                <div>
                  <h3 className="font-medium">AI Guest</h3>
                  <span className="text-sm text-gray-500">
                    {isAiThinking ? 'Thinking...' : isAiSpeaking ? 'Speaking...' : 'Not active'}
                  </span>
                </div>
              </div>
              
              <div className="bg-gray-100 rounded-lg p-4 h-24 flex items-center">
                <WaveAnimation 
                  isActive={isAiSpeaking} 
                  color="bg-blue-500" 
                />
              </div>
            </div>
            
            {/* Audio progress bar - Styled like in screenshot */}
            <div className="mt-auto px-4">
              <div className="bg-gray-100 rounded-lg p-4 mb-4">
                <div className="h-8 flex items-center">
                  <div className="w-full bg-gray-200 h-2 rounded-full relative">
                    {/* Gradient progress bar similar to screenshot */}
                    <div 
                      className="absolute top-0 left-0 h-full rounded-full"
                      style={{
                        width: `${(elapsedTime / 180) * 100}%`, // Assuming 3-minute max
                        background: 'linear-gradient(to right, #8B5CF6, #3B82F6, #EC4899)'
                      }}
                    ></div>
                    
                    {/* Time markers */}
                    {[...Array(30)].map((_, i) => (
                      <div 
                        key={i}
                        className="absolute top-0 h-full"
                        style={{
                          left: `${(i / 30) * 100}%`,
                          width: '2px',
                          height: i % 5 === 0 ? '8px' : '4px',
                          transform: 'translateY(-25%)',
                          backgroundColor: '#8B5CF6'
                        }}
                      ></div>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-between text-sm text-gray-600 mt-2">
                  <span className="font-mono">00:00</span>
                  <span className="font-mono">{formatTime(elapsedTime)}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Recording controls - Styled more like in screenshot */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              {/* Left control */}
              <div>
                {!isRecording ? (
                  <button 
                    onClick={handleStartRecording}
                    className="bg-purple-600 text-white w-12 h-12 rounded-full flex items-center justify-center hover:bg-purple-700 transition-colors"
                  >
                    <FiMic size={20} />
                  </button>
                ) : (
                  <button 
                    onClick={handleStopRecording}
                    className="bg-red-500 text-white w-12 h-12 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <FiStopCircle size={20} />
                  </button>
                )}
              </div>
              
              {/* Center controls */}
              <div className="flex items-center gap-4">
                <button 
                  className="flex items-center gap-1 text-sm bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg"
                  onClick={() => {}}
                >
                  <FiHeadphones size={16} />
                  <span>Preview</span>
                </button>
                
                <button 
                  className="flex items-center gap-1 text-sm bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg"
                  onClick={() => {}}
                >
                  <FiSave size={16} />
                  <span>Save Recording</span>
                </button>
              </div>
              
              {/* Right volume control */}
              <div className="flex items-center gap-2">
                <FiVolume2 size={18} className="text-gray-600" />
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  defaultValue="80"
                  className="w-24 accent-purple-600" 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Recording indicator */}
      {isRecording && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1 animate-pulse">
          <div className="w-2 h-2 bg-white rounded-full"></div>
          Recording
        </div>
      )}
    </div>
  );
};

export default PodcastRecordingUI;