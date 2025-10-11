import React, { useState, useRef, useEffect, useCallback } from "react";
import { GrPowerCycle } from "react-icons/gr";
import { PiMicrophoneBold, PiMicrophoneSlashBold, PiPauseBold, PiPlayFill } from "react-icons/pi";
import { supabase , getSupabaseAuthorizedtoken } from "../../supabaseClient";
import { useAuth } from "../../context/AuthContext"; 


import axios from "axios";
import {
  ControlBar,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
  RoomContext,
} from '@livekit/components-react';
import { Room, Track } from 'livekit-client';
import '@livekit/components-styles';


// Icons (keeping existing)
const Icon = ({ name, className }) => {
  const icons = {
    play: <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" /></svg>,
    pause: <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>,
    stop: <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" /></svg>,
    restart: <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 4v6h6" /><path d="M3.51 15a7 7 0 0 0 13.58-2h4" /></svg>,
    edit: <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>,
    mic: <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="23" /><line x1="8" x2="16" y1="23" y2="23" /></svg>,
    volume: <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>,
    podcast: <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6"/><path d="m21 12-6-3-6 3-6-3"/></svg>,
  };
  return icons[name] || null;
};


// Toast Notification Component
const Toast = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500',
  };

  return (
    <div className={`fixed top-4 right-4 z-50 ${bgColors[type]} text-white px-6 py-4 rounded-lg shadow-2xl animate-slide-in-right flex items-center space-x-3`}>
      <div className="flex-shrink-0">
        {type === 'success' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
        {type === 'error' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
        {type === 'info' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        {type === 'warning' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        </div>
      <div className="flex-1">
        <p className="font-medium">{message}</p>
    </div>
      <button onClick={onClose} className="flex-shrink-0 ml-4 text-white/80 hover:text-white">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
  </div>
);
};

// Improved WhatsApp-Style Horizontal Waveform Component
const WhatsAppWaveform = ({ audioLevel = 0, isActive = false }) => {
  const [bars, setBars] = useState(Array(20).fill(0.1));
  const animationRef = useRef(null);
  const barIndexRef = useRef(0);

  useEffect(() => {
    if (isActive) {
      const animate = () => {
        setBars(prev => {
          const newBars = [...prev];
          // Shift bars to the left
          newBars.shift();
          // Add new bar with more natural height variation
          const baseHeight = audioLevel * 0.8;
          const variation = Math.sin(Date.now() / 200 + barIndexRef.current) * 0.3;
          const newHeight = Math.max(0.1, Math.min(1, baseHeight + variation));
          newBars.push(newHeight);
          barIndexRef.current = (barIndexRef.current + 1) % 100;
          return newBars;
        });
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    } else {
      // Reset to flat when not active
      setBars(Array(20).fill(0.1));
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, audioLevel]);

  return (
    <div className="w-full h-full flex items-center justify-center px-4 space-x-1.5">
      {bars.map((height, i) => (
        <div
          key={i}
          className="bg-purple-500 rounded-full transition-all duration-150 ease-out"
          style={{
            width: '4px',
            height: `${height * 100}%`,
            opacity: 0.6 + (height * 0.4),
            transform: `scaleY(${0.8 + height * 0.2})`,
          }}
        />
      ))}
    </div>
  );
};

// Enhanced Status indicator with time display
const StatusIndicator = ({ isRecording, isProcessing, isSpeaking, conversationStarted, isPaused, elapsedTime, recordingStatus, recordingUrl }) => {
  // **FIXED: Ensure time is formatted correctly**
  const formatTime = (seconds) => {
    const totalSeconds = Math.floor(seconds);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!conversationStarted) {
    return (
      <div className="flex items-center justify-center space-x-3 bg-gray-800/50 px-6 py-3 rounded-full border border-gray-600">
        <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
        <Icon name="podcast" className="w-5 h-5 text-purple-400" />
        <span className="font-medium text-purple-300">Ready to Start Live Podcast</span>
      </div>
    );
  }
  
  // Show recording save status
  if (recordingStatus === 'saving') {
    return (
      <div className="flex items-center justify-center space-x-3 bg-blue-900/30 px-6 py-3 rounded-full border border-blue-500">
        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-blue-500/50"></div>
        <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
        <span className="font-medium text-blue-300">Saving Recording to Supabase...</span>
      </div>
    );
  }
  
  if (recordingStatus === 'saved' && recordingUrl) {
    return (
      <div className="flex flex-col items-center space-y-2">
        <div className="flex items-center justify-center space-x-3 bg-green-900/30 px-6 py-3 rounded-full border border-green-500">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-green-500/50"></div>
          <Icon name="podcast" className="w-5 h-5 text-green-400" />
          <span className="font-medium text-green-300">Recording Saved to Supabase!</span>
        </div>
        <a 
          href={recordingUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-green-400 text-sm hover:text-green-300 underline"
        >
          Download Recording
        </a>
      </div>
    );
  }
  
  if (recordingStatus === 'error') {
    return (
      <div className="flex items-center justify-center space-x-3 bg-red-900/30 px-6 py-3 rounded-full border border-red-500">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-red-500/50"></div>
        <Icon name="podcast" className="w-5 h-5 text-red-400" />
        <span className="font-medium text-red-300">Recording Save Failed</span>
      </div>
    );
  }
  if (isPaused) {
    return (
      <div className="flex flex-col items-center space-y-2">
        <div className="flex items-center justify-center space-x-3 bg-yellow-900/30 px-6 py-3 rounded-full border border-yellow-500">
          <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse shadow-yellow-500/50"></div>
          <Icon name="pause" className="w-5 h-5 text-yellow-400" />
          <span className="font-medium text-yellow-300">PAUSED - Commercial Break</span>
        </div>
        <div className="text-yellow-300 text-sm font-medium">
          {formatTime(elapsedTime)}
        </div>
      </div>
    );
  }
  // isRecording state seems unused, using isPlaying to indicate active session
  if (isRecording || (conversationStarted && !isPaused)) { 
    return (
      <div className="flex flex-col items-center space-y-2">
        <div className="flex items-center justify-center space-x-3 bg-red-900/30 px-6 py-3 rounded-full border border-red-500">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-red-500/50"></div>
          <Icon name="mic" className="w-5 h-5 text-red-400" />
          <span className="font-medium text-red-300">LIVE RECORDING</span>
        </div>
        <div className="text-red-300 text-sm font-medium">
          {formatTime(elapsedTime)}
        </div>
      </div>
    );
  }
  if (isProcessing) {
    return (
      <div className="flex items-center justify-center space-x-3 bg-blue-900/30 px-6 py-3 rounded-full border border-blue-500">
        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-blue-500/50"></div>
        <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
        <span className="font-medium text-blue-300">Processing Audio...</span>
      </div>
    );
  }
  if (isSpeaking) {
    return (
      <div className="flex items-center justify-center space-x-3 bg-green-900/30 px-6 py-3 rounded-full border border-green-500">
        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-green-500/50"></div>
        <Icon name="volume" className="w-5 h-5 text-green-400" />
        <span className="font-medium text-green-300">AI Speaking</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center space-x-3 bg-gray-800/50 px-6 py-3 rounded-full border border-gray-600">
      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
      <Icon name="mic" className="w-5 h-5 text-gray-400" />
      <span className="font-medium text-gray-300">Your Turn to Speak</span>
    </div>
  );
};

const NewPanelsRecording = () => {
  // **HARDCODED AGENT SELECTION** - Change this to switch modes:
  const SELECTED_AGENT = 'guest'; // Change to 'guest' for different behavior
  
  const { user } = useAuth();

  // LiveKit Configuration - Dynamic token fetching
  const [serverUrl, setServerUrl] = useState('');
  const [token, setToken] = useState('');
  const [roomName] = useState(() => `test-room-123`); // Fixed room name for testing
  
  // Existing state
  const [isPaused, setIsPaused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [streamingText, setStreamingText] = useState('');
  const [currentStreamingSpeaker, setCurrentStreamingSpeaker] = useState(null);

  // Conversation management state
  const [conversationStarted, setConversationStarted] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [pauseContext, setPauseContext] = useState(null);
  
  // Microphone state
  const [isMicOn, setIsMicOn] = useState(false);
  
  // Play/Pause state
  const [isPlaying, setIsPlaying] = useState(false);
  
  // LiveKit state
  const [liveKitConnected, setLiveKitConnected] = useState(false);
  const [liveKitConnecting, setLiveKitConnecting] = useState(false);
  const [liveKitParticipants, setLiveKitParticipants] = useState([]);
  const [room] = useState(() => new Room({
    adaptiveStream: true,
    dynacast: true,
  }));
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState('idle'); // 'idle', 'recording', 'saving', 'saved', 'error'
  const [recordingUrl, setRecordingUrl] = useState(null);
  
  // Time recording state
  const [startTime, setStartTime] = useState(null);
  const [pausedTime, setPausedTime] = useState(0); // Time paused
  const [elapsedTime, setElapsedTime] = useState(0); // Total elapsed time
  const timerRef = useRef(null);
  
  // Manual message state
  const [manualMessage, setManualMessage] = useState('');
  
  // RAG/KB state - Documents are already selected in agent setup flow
  const [ragEnabled, setRagEnabled] = useState(true); // Always enabled since documents are selected in setup
  
  // Toast notifications
  const [toasts, setToasts] = useState([]);
  
  // Existing refs
  const transcriptEndRef = useRef(null);

  // Use a ref to hold the latest transcript state for use in event handlers
  const transcriptRef = useRef(transcript);
  // Buffer assistant segments while the user is streaming to enforce turn-ordering
  const assistantBufferRef = useRef(null); // { type: 'stream' | 'final', text: string }

  const [activeTab, setActiveTab] = useState('transcript'); // 'transcript' or 'script'
  const [podcastScript, setPodcastScript] = useState(null);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);


  // Auto-scroll to bottom of transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, streamingText]);

  // **FIXED: Timer logic to correctly track elapsed time**
  useEffect(() => {
    if (isPlaying && !isPaused) {
      if (timerRef.current === null) {
        const start = Date.now() - pausedTime; // Resume from paused time
        setStartTime(start); 

        timerRef.current = setInterval(() => {
          setElapsedTime(Math.floor((Date.now() - start) / 1000));
        }, 1000);
      }
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      // Save the elapsed time as pausedTime
      setPausedTime(elapsedTime * 1000); 
      setStartTime(null);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, isPaused, pausedTime, elapsedTime]);

  useEffect(() => {
    const savedScript = sessionStorage.getItem('podcastScript');
    if (savedScript) {
      try {
        const scriptData = JSON.parse(savedScript);
        setPodcastScript(scriptData);
        console.log('✅ Loaded podcast script:', scriptData);
      } catch (error) {
        console.error('❌ Error loading script:', error);
      }
    }
  }, []);

  // Toast notification helper
  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

const fetchLiveKitToken = async () => {
  try {
    const token = await getSupabaseAuthorizedtoken();
    if (!token) {
      alert("You must be signed in to connect to LiveKit.");
      return;
    }

    // ✅ create form data
    const formData = new FormData();
    formData.append("identity", user.email || `user-${Date.now()}`);
    formData.append("room_name", roomName);
    formData.append("user_id", user.id); 

    // Get selected knowledge base ID from localStorage
    const selectedKB = localStorage.getItem('selectedKnowledgeBase');
    if (selectedKB) {
      try {
        const kbInfo = JSON.parse(selectedKB);
        if (kbInfo.type === 'existing' && kbInfo.id) {
          formData.append("selected_kb_id", kbInfo.id);
          console.log("🎯 Using selected KB ID:", kbInfo.id);
        }
      } catch (e) {
        console.warn("Failed to parse selected KB info:", e);
      }
    }

    console.log("🎟️ Fetching LiveKit token for:", user);

    const response = await axios.post(
      "http://localhost:8000/livekit/get-token",
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("✅ Token received:", response.data);
    setToken(response.data.token);
    setServerUrl(response.data.url);
    return response.data;
  } catch (error) {
    console.error("❌ Failed to fetch LiveKit token:", error);
    showToast("Failed to fetch LiveKit token", "error");
    throw error;
  }
};



  // Connect to LiveKit room
  const connectToLiveKit = async () => {
    if (liveKitConnecting || liveKitConnected) {
      console.log('⚠️ Already connecting or connected, ignoring...');
      return;
    }

    try {
      setLiveKitConnecting(true);
      console.log('🔄 Attempting to connect to LiveKit...');
      
      let connectionUrl = serverUrl;
      let connectionToken = token;
      
      if (!connectionUrl || !connectionToken) {
        console.log('🎟️ Fetching new token...');
        const tokenData = await fetchLiveKitToken();
        connectionUrl = tokenData.url;
        connectionToken = tokenData.token;
      }
      
      await room.connect(connectionUrl, connectionToken);
      setLiveKitConnected(true);
      setLiveKitConnecting(false);
      
      // Debug: Check room connection
      console.log('🏠 Frontend connected to room:', room.name);
      console.log('🏠 Frontend room state:', room.state);
      console.log('🏠 Frontend local participant:', room.localParticipant ? room.localParticipant.identity : 'undefined');
      
      // Check participants using correct LiveKit API
      const participants = room.remoteParticipants;
      console.log('🏠 Frontend remote participants:', participants ? participants.size : 'undefined');
      
      if (participants) {
        console.log('🏠 Frontend participants list:', Array.from(participants.keys()));
        participants.forEach((participant, key) => {
          console.log(`🏠 Frontend participant ${key}:`, participant.identity);
        });
      }
      
      // Also check all participants (including local)
      const allParticipants = room.participants;
      console.log('🏠 Frontend all participants:', allParticipants ? allParticipants.size : 'undefined');
      
      // Add event listeners to see what's happening
      room.on('participantConnected', (participant) => {
        console.log('🎉 Frontend: Participant connected:', participant.identity);
      });
      
      room.on('participantDisconnected', (participant) => {
        console.log('👋 Frontend: Participant disconnected:', participant.identity);
      });
      
      room.on('roomMetadataChanged', (metadata) => {
        console.log('📝 Frontend: Room metadata changed:', metadata);
      });
      
      // Mute microphone on connection by default
      await room.localParticipant.setMicrophoneEnabled(false);
      setIsMicOn(false);
      
      // Send selected KB ID through data channel
      const selectedKB = localStorage.getItem('selectedKnowledgeBase');
      if (selectedKB) {
        try {
          const kbInfo = JSON.parse(selectedKB);
          if (kbInfo.type === 'existing' && kbInfo.id) {
            const data = JSON.stringify({
              type: 'kb_selection',
              kb_id: kbInfo.id
            });
            await room.localParticipant.publishData(data, { reliable: true });
            console.log('📤 Sent KB ID through data channel:', kbInfo.id);
          }
        } catch (e) {
          console.warn('Failed to send KB ID:', e);
        }
      }
      
      showToast('✅ Connected to LiveKit successfully!', 'success');
    } catch (error) {
      setLiveKitConnecting(false);
      console.error('❌ Failed to connect to LiveKit:', error);
      showToast('❌ Failed to connect to LiveKit', 'error');
    }
  };

  // Disconnect from LiveKit room
  const disconnectFromLiveKit = async () => {
    console.log('🔄 Disconnecting from LiveKit room...');
    
    // If recording, stop egress and save to Supabase
    if (isRecording && recordingStatus === 'recording') {
      setRecordingStatus('saving');
      showToast('💾 Saving recording to Supabase...', 'info');
      
      try {
        const formData = new FormData();
        formData.append('room_name', roomName);
        
        const response = await fetch('http://localhost:8000/livekit/stop-audio-egress', {
          method: 'POST',
          body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
          setRecordingUrl(data.public_url);
          setRecordingStatus('saved');
          showToast('✅ Recording saved to Supabase!', 'success');
          console.log('🎉 Recording saved:', data.public_url);
        } else {
          setRecordingStatus('error');
          showToast('❌ Failed to save recording', 'error');
          console.error('Failed to save recording:', data.error);
        }
      } catch (error) {
        setRecordingStatus('error');
        showToast('❌ Error saving recording', 'error');
        console.error('Error saving recording:', error);
      }
    }
    
    room.disconnect();
    setLiveKitConnected(false);
    setIsPlaying(false);
    setIsRecording(false);
    // Reset timer state
    setElapsedTime(0);
    setPausedTime(0);
    if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
    }
    showToast('Disconnected from LiveKit', 'info');
  };

  // Play button - Start the agent
  const handlePlay = async () => {
    if (!liveKitConnected) {
      showToast('Please connect to LiveKit first', 'warning');
      return;
    }

    if (isPaused) {
      // Resume from pause
      handleResume();
      return;
    }

    try {
      setIsPlaying(true);
      setConversationStarted(true);
      setIsRecording(true);
      setRecordingStatus('recording');
      // Unmute microphone to start the conversation
      await room.localParticipant.setMicrophoneEnabled(true);
      setIsMicOn(true);
      
      // Reset the timer and start
      setElapsedTime(0);
      setPausedTime(0);
      
      showToast('🎙️ Agent started - Recording in progress!', 'success');
    } catch (error) {
      console.error('❌ Failed to start agent:', error);
      showToast('Failed to start agent', 'error');
    }
  };

  // Pause button - Complete pause (commercial break)
  const handlePause = async () => {
    if (!liveKitConnected || !isPlaying) {
      return;
    }

    try {
      // Save current context
      setPauseContext({
        lastMessages: transcriptRef.current.slice(-5), // Use ref for current state
        timestamp: new Date().toISOString(),
      });

      // Mute microphone
      await room.localParticipant.setMicrophoneEnabled(false);
      setIsMicOn(false);
      
      // Stop any current speech (if you had a TTS mechanism)
      window.speechSynthesis.cancel();
      setIsSpeaking(false);

      // Clear any streaming text
      setStreamingText('');
      setCurrentStreamingSpeaker(null);

      // Pause timer and set state
      setIsPaused(true);
      setIsPlaying(false);
      showToast('⏸️ Paused - Commercial Break', 'warning');
    } catch (error) {
      console.error('❌ Failed to pause:', error);
      showToast('Failed to pause', 'error');
    }
  };

  // Resume button - Continue with context
  const handleResume = async () => {
    if (!liveKitConnected || !isPaused) {
      return;
    }

    try {
      setIsPaused(false);
      setIsPlaying(true);
      // Unmute microphone
      await room.localParticipant.setMicrophoneEnabled(true);
      setIsMicOn(true);

      // Generate welcome back message with context
      let contextSummary = '';
      if (pauseContext && pauseContext.lastMessages.length > 0) {
        // Find the last actual text message
        const lastTopicEntry = pauseContext.lastMessages.reverse().find(m => m.text && !m.isSystem && !m.isWelcomeBack);
        if (lastTopicEntry) {
            const lastTopic = lastTopicEntry.text;
            contextSummary = lastTopic.substring(0, Math.min(lastTopic.length, 50)) + (lastTopic.length > 50 ? '...' : '');
        }
      }

      const welcomeBackMessage = `Welcome back, Sir. We were discussing ${contextSummary || 'the previous topic'} before our brief hiatus. I await your command.`;
      
      // Add to transcript immediately and show it
      setTranscript(prev => [...prev, { 
        speaker: 'AI Assistant', 
        text: welcomeBackMessage,
        timestamp: new Date().toISOString(),
        isWelcomeBack: true
      }]);
      
      // Clear pause context
      setPauseContext(null);
      
      showToast('▶️ Resumed - Welcome back!', 'success');
    } catch (error) {
      console.error('❌ Failed to resume:', error);
      showToast('Failed to resume', 'error');
    }
  };

  // Toggle Play/Pause
  const togglePlayPause = () => {
    if (isPaused || !isPlaying) {
      handlePlay();
    } else {
      handlePause();
    }
  };

  // Microphone toggle function
  const toggleMicrophone = async () => {
    try {
      if (liveKitConnected && room.localParticipant && isPlaying) { // Only allow toggle when playing
        // Actually mute/unmute in LiveKit
        await room.localParticipant.setMicrophoneEnabled(!isMicOn);
        setIsMicOn(!isMicOn);
        showToast(`🎤 Microphone ${!isMicOn ? 'enabled' : 'muted'}`, !isMicOn ? 'success' : 'warning');
      } else {
        showToast('Please start the conversation first to use the microphone control, Sir.', 'warning');
      }
    } catch (error) {
      console.error('❌ Error toggling microphone:', error);
      showToast('Failed to toggle microphone', 'error');
    }
  };

  // Improved Halt AI functionality
  const stopSpeaking = () => {
    // This is mainly for stopping local TTS/audio playback, which isn't fully implemented here
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    
    // Clear any streaming text
    setStreamingText('');
    setCurrentStreamingSpeaker(null);
    
    // Add a system message
    if (conversationStarted) {
      setTranscript(prev => [...prev, { 
        speaker: 'System', 
        text: 'AI response halted by user',
        timestamp: new Date().toISOString(),
        isSystem: true
      }]);
    }
    
    showToast('AI response abruptly ceased. How dramatic.', 'info');
  };

  // Send manual message
  const sendManualMessage = async () => {
    const messageToSend = manualMessage.trim();
    if (!messageToSend) return;
    
    if (!liveKitConnected || !isPlaying || isPaused) {
      showToast('The conversation must be live and unpaused to send a message, Sir.', 'warning');
      return;
    }
    
    // Add user message to transcript
    const userMessage = {
      speaker: 'You',
      text: messageToSend,
      timestamp: new Date().toISOString(),
      isManual: true
    };
    
    setTranscript(prev => [...prev, userMessage]);
    setConversationHistory(prev => [...prev, userMessage]);
    
    // Clear input
    setManualMessage('');
    
    // Show processing indicator - Simulate LiveKit sending data
    setIsProcessing(true);
    
    try {
      // In a real LiveKit agent setup, you would use room.localParticipant.publishData
      // to send this text to the agent's data channel.
      
      // --- SIMULATED RESPONSE ---
      setTimeout(() => {
        setIsProcessing(false);
        setIsSpeaking(true);
        
        // Simulating the agent's response being streamed back as a final segment
        setTranscript(prev => [...prev, {
          speaker: 'AI Assistant',
          text: `Roger Boss. I have acknowledged your manual input: "${messageToSend}". My simulated response is complete.`,
          timestamp: new Date().toISOString(),
          isResponse: true,
          isStreaming: false, // Treat simulated as final for simplicity
        }]);
        setConversationHistory(prev => [...prev, {
            speaker: 'AI Assistant',
            text: `Roger Boss. I have acknowledged your manual input: "${messageToSend}". My simulated response is complete.`,
            timestamp: new Date().toISOString(),
        }]);

        // Simulate AI speaking for a few seconds
        setTimeout(() => setIsSpeaking(false), 3000);
      }, 1500);
      // --- END SIMULATED RESPONSE ---
    } catch (error) {
      console.error('Error sending manual message:', error);
      setIsProcessing(false);
      showToast('Failed to send message, Sir. A technical hiccup, perhaps.', 'error');
    }
  };

  const restartRecording = () => {
    // Disconnect from LiveKit if connected
    if (liveKitConnected) {
      room.disconnect();
    }
    
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setTranscript([]);
    setStreamingText('');
    setCurrentStreamingSpeaker(null);
    setIsRecording(false);
    setRecordingStatus('idle');
    setRecordingUrl(null);
    setIsPaused(false);
    setIsProcessing(false);
    setIsSpeaking(false);
    setConversationStarted(false);
    setIsPlaying(false);
    setIsMicOn(false);
    setToken('');
    setServerUrl('');
    setConversationHistory([]);
    setPauseContext(null);
    setElapsedTime(0);
    setPausedTime(0);
    setManualMessage('');
    setLiveKitConnected(false);
    setLiveKitConnecting(false);
    showToast('🔄 Session restarted. Fresh slate, as it were.', 'info');
  };

  // Handle transcription segments from the agent (streaming style)
  const handleTranscriptionReceived = useCallback((segments, participant, publication) => {
    // Ignore segments if paused
    if (isPaused) return;
    
    segments.forEach(segment => {
      if (segment.text && segment.text.trim()) {
        const isAgent = participant?.identity?.includes('agent');
        const speaker = isAgent ? 'AI Assistant' : 'You';
        
        // Strict turn-ordering: buffer assistant while user streams
        if (!segment.final) {
          if (isAgent) {
            if (currentStreamingSpeaker === 'You') {
              assistantBufferRef.current = { type: 'stream', text: segment.text };
              return;
            }
            setCurrentStreamingSpeaker('AI Assistant');
            setStreamingText(segment.text);
            // Write streaming directly into the AI bubble
            setTranscript(prev => {
              const lastMessage = prev[prev.length - 1];
              const now = new Date().toISOString();
              if (lastMessage && lastMessage.speaker === 'AI Assistant' && lastMessage.isStreaming) {
                return [
                  ...prev.slice(0, -1),
                  { speaker: 'AI Assistant', text: segment.text, timestamp: lastMessage.timestamp || now, isStreaming: true }
                ];
              }
              return [...prev, { speaker: 'AI Assistant', text: segment.text, timestamp: now, isStreaming: true }];
            });
            setIsSpeaking(true);
            setIsProcessing(false);
          } else {
            setCurrentStreamingSpeaker('You');
            setStreamingText(segment.text);
          }
        } else {
          if (isAgent) {
            if (currentStreamingSpeaker === 'You') {
              assistantBufferRef.current = { type: 'final', text: segment.text };
              return;
            }
            setTranscript(prev => {
              const lastMessage = prev[prev.length - 1];
              if (lastMessage && lastMessage.speaker === 'AI Assistant' && lastMessage.isStreaming) {
                return [
                  ...prev.slice(0, -1),
                  { speaker: 'AI Assistant', text: segment.text, timestamp: new Date().toISOString(), isStreaming: false }
                ];
              }
              return [...prev, { speaker: 'AI Assistant', text: segment.text, timestamp: new Date().toISOString(), isStreaming: false }];
            });
            if (currentStreamingSpeaker === 'AI Assistant') {
              setStreamingText('');
              setCurrentStreamingSpeaker(null);
            }
            setTimeout(() => setIsSpeaking(false), 500);
          } else {
            // finalize user
            setTranscript(prev => {
              const lastMessage = prev[prev.length - 1];
              if (lastMessage && lastMessage.speaker === 'You' && lastMessage.isStreaming) {
                return [
                  ...prev.slice(0, -1),
                  { speaker: 'You', text: segment.text, timestamp: new Date().toISOString(), isStreaming: false }
                ];
              }
              return [...prev, { speaker: 'You', text: segment.text, timestamp: new Date().toISOString(), isStreaming: false }];
            });
            if (currentStreamingSpeaker === 'You') {
              setStreamingText('');
              setCurrentStreamingSpeaker(null);
            }
            const buffered = assistantBufferRef.current;
            if (buffered) {
              assistantBufferRef.current = null;
              if (buffered.type === 'final') {
                setTranscript(prev => [...prev, { speaker: 'AI Assistant', text: buffered.text, timestamp: new Date().toISOString(), isStreaming: false }]);
                setTimeout(() => setIsSpeaking(false), 500);
              } else if (buffered.type === 'stream') {
                setCurrentStreamingSpeaker('AI Assistant');
                setStreamingText(buffered.text);
                setIsSpeaking(true);
              }
            }
          }
        }
        
        // Update conversation history for persistent storage (using the FINAL text for history)
        if (segment.final) {
            setConversationHistory(prev => [...prev, { speaker, text: segment.text, timestamp: new Date().toISOString() }]);
        }
      }
    });
  }, [isPaused, currentStreamingSpeaker]); // Dependency on currentStreamingSpeaker is key for clearing

  // Set up room event listeners
  useEffect(() => {
    
    const handleConnected = () => {
      setLiveKitConnected(true);
    };

    const handleDisconnected = () => {
      setLiveKitConnected(false);
    };

    const handleParticipantConnected = (participant) => {
      setLiveKitParticipants(prev => [...prev, participant]);
      showToast(`👤 ${participant.identity} joined`, 'info');
    };

    const handleParticipantDisconnected = (participant) => {
      setLiveKitParticipants(prev => prev.filter(p => p.identity !== participant.identity));
      showToast(`👤 ${participant.identity} left`, 'info');
    };

    // The transcription handler must be added here
    room.on('connected', handleConnected);
    room.on('disconnected', handleDisconnected);
    room.on('participantConnected', handleParticipantConnected);
    room.on('participantDisconnected', handleParticipantDisconnected);
    // Add the transcription listener
    // Note: The transcription data may be a custom data channel event in your LiveKit setup, 
    // but based on the provided code, we'll assume a custom 'transcriptionReceived' event 
    // or a similar mechanism the agent is using. If this is a custom event, ensure it's emitted correctly.
    room.on('transcriptionReceived', handleTranscriptionReceived); 

    return () => {
      room.off('connected', handleConnected);
      room.off('disconnected', handleDisconnected);
      room.off('participantConnected', handleParticipantConnected);
      room.off('participantDisconnected', handleParticipantDisconnected);
      room.off('transcriptionReceived', handleTranscriptionReceived); 
    };
  }, [room, handleTranscriptionReceived]); // Include handleTranscriptionReceived as a dependency

  const ScriptDisplay = ({ scriptData, showToast }) => {
    if (!scriptData) {
      return (
        <div className="text-center text-gray-500 mt-16 p-8">
          <Icon name="podcast" className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium mb-2">No Script Generated</p>
          <p className="text-xs">Generate a script from the review page before starting your recording.</p>
        </div>
      );
    }
  
    // Handle case where sections might be empty
    const sections = scriptData.sections || [];
    const scriptText = scriptData.script_text || '';
  
    return (
      <div className="p-6 space-y-6">
        {/* Script Metadata */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-800">Generated Script</h3>
              <p className="text-xs text-gray-600 mt-1">
                Role: {scriptData.metadata?.role?.toUpperCase() || 'GUEST'} • 
                {scriptData.metadata?.word_count || 0} words • 
                {scriptData.metadata?.estimated_duration || 'N/A'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(scriptText);
                  showToast('Script copied to clipboard!', 'success');
                }}
                className="text-xs bg-purple-500 text-white px-3 py-1 rounded hover:bg-purple-600 transition-colors"
              >
                Copy
              </button>
              <button 
                onClick={() => {
                  const blob = new Blob([scriptText], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'podcast-script.txt';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  showToast('Script downloaded!', 'success');
                }}
                className="text-xs bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition-colors"
              >
                Download
              </button>
            </div>
          </div>
        </div>
  
        {/* Script Content */}
        <div className="space-y-4">
          {sections.length > 0 ? (
            // If sections are parsed, show them formatted
            sections.map((section, idx) => (
              <div 
                key={idx} 
                className={`p-4 rounded-lg border-l-4 ${
                  section.speaker === 'HOST' 
                    ? 'bg-blue-50 border-blue-500' 
                    : 'bg-purple-50 border-purple-500'
                }`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    section.speaker === 'HOST'
                      ? 'bg-blue-500 text-white'
                      : 'bg-purple-500 text-white'
                  }`}>
                    {section.speaker}
                  </span>
                  <span className="text-xs text-gray-500">Segment {idx + 1}</span>
                </div>
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {section.content}
                </p>
              </div>
            ))
          ) : (
            // If sections are empty, show raw script text
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
              <div className="flex items-center space-x-2 mb-3">
                <Icon name="podcast" className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-semibold text-gray-800">Full Script</span>
              </div>
              <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap max-h-[600px] overflow-y-auto">
                {scriptText}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <RoomContext.Provider value={room}>
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>


      <div className="h-full rounded-3xl border-[3px] border-light-accent overflow-hidden flex">
      {/* Left Panel - Recording Studio (More Space) */}
      <div className="w-3/5 bg-gradient-to-b from-light-accent to-purple-200 flex">
        
        {/* Left Section - Participants + Session Management */}
        <section className="flex flex-col justify-center items-center my-auto mx-8 font-headingPoppins">
          {/* Participants Section - Only LiveKit Participants */}
          <div className="py-6 px-8 bg-white/20 backdrop-blur-md rounded-3xl border border-white/30 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-6 text-center">Participants</h3>
            <div className="space-y-4">
              {/* LiveKit Participants */}
              <LiveKitParticipants />
              
              {/* Show message if no participants */}
              {!liveKitConnected && (
                <div className="text-center text-gray-600 text-sm py-4">
                  <Icon name="podcast" className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>Connect to see participants</p>
                </div>
              )}
            </div>
        </div>
          {/* LiveKit Connection */}
          <div className="mt-6">
            {!liveKitConnected ? (
              <button 
                onClick={connectToLiveKit}
                disabled={liveKitConnecting}
                className={`flex items-center space-x-3 px-6 py-3 rounded-2xl text-sm font-medium transition-all duration-300 border shadow-lg ${
                  liveKitConnecting
                    ? 'bg-blue-500/20 text-blue-800 border-blue-500/30 cursor-not-allowed'
                    : 'bg-green-500/20 text-green-800 border-green-500/30 hover:bg-green-500/30 cursor-pointer'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${
                  liveKitConnecting ? 'bg-blue-500 animate-pulse' : 'bg-green-500'
                }`}></div>
                <span>{liveKitConnecting ? 'Connecting...' : 'Connect LiveKit'}</span>
              </button>
            ) : (
              <button 
                onClick={disconnectFromLiveKit}
                className="flex items-center space-x-3 bg-red-500/20 backdrop-blur-md text-red-800 px-6 py-3 rounded-2xl text-sm font-medium hover:bg-red-500/30 transition-all duration-300 border border-red-500/30 shadow-lg"
              >
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span>Disconnect LiveKit</span>
              </button>
            )}
            
            {/* Connection Status */}
            <div className="mt-2 text-xs text-center">
              <span className={`px-2 py-1 rounded-full ${
                liveKitConnected 
                  ? 'bg-green-100 text-green-800' 
                  : liveKitConnecting
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {liveKitConnected ? 'Connected' : liveKitConnecting ? 'Connecting...' : 'Disconnected'}
              </span>
            </div>
          </div>

          {/* Restart Session */}
          <div className="mt-4">
            <button 
              onClick={restartRecording}
              disabled={isProcessing}
              className="flex items-center space-x-3 bg-white/20 backdrop-blur-md text-gray-800 px-6 py-3 rounded-2xl text-sm font-medium hover:bg-white/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-white/30 shadow-lg"
            >
              <GrPowerCycle className="w-5 h-5" /> 
              <span>Restart Session</span>
            </button>
          </div>
        </section>

        {/* Separator */}
        <div className="w-px bg-light-grey "></div>

        {/* Right Section - Main Controls */}
        <section className="w-2/3 flex flex-col my-auto mx-8">

          {/* Header */}
          <div className="bg-light-charcoal text-white px-6 py-3 mx-auto rounded-3xl mt-28 text-2xl font-semibold font-headingPoppins">
            <h1 className="text-lg font-semibold">THE DAILY CONVERSATION</h1>
          </div>
          
          {/* Status Indicator */}
          <div className="px-6 py-4 font-bodyRoboto text-center">
            <StatusIndicator 
              isRecording={isRecording}
              isProcessing={isProcessing}
              isSpeaking={isSpeaking}
              conversationStarted={conversationStarted}
              isPaused={isPaused}
              elapsedTime={elapsedTime}
              recordingStatus={recordingStatus}
              recordingUrl={recordingUrl}
            />
          </div>

            {/* WhatsApp-Style Waveform Section */}
            <div className="flex justify-center items-center py-8">
              <div className="bg-purple-50/30 border border-purple-200/50 rounded-lg p-6 w-8/12 h-72 flex items-center justify-center">
                <WhatsAppWaveform 
                  isActive={isSpeaking || (isMicOn && isPlaying)} 
                  audioLevel={isSpeaking ? 0.8 : 0.3}
                />
              </div>
            </div>

          {/* Controls - Two Parallel Columns */}
          <div className="flex justify-center items-center py-6">
            <div className="flex space-x-6">

              {/* Left Column - Mic & Playback */}
              <div className="w-1/2 flex justify-center items-center gap-3">
              {/* Microphone Toggle Button - Purple */}
              <div className="flex justify-center items-center">
                <button 
                  onClick={toggleMicrophone}
                  disabled={!liveKitConnected || !isPlaying || isPaused} // Only enabled when live and unpaused
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                    !liveKitConnected || !isPlaying || isPaused
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : isMicOn 
                      ? 'bg-purple-500 text-white border-2 border-purple-600' 
                      : 'bg-white text-purple-500 border-2 border-purple-500'
                  }`}
                >
                  {isMicOn ? (
                    <PiMicrophoneBold className="w-8 h-8" />
                  ) : (
                    <PiMicrophoneSlashBold className="w-8 h-8" />
                  )}
                </button>
              </div>

              {/* Play/Pause Toggle Button - Purple */}
              <div className="flex justify-center items-center">
                <button 
                  onClick={togglePlayPause}
                  disabled={!liveKitConnected}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                    !liveKitConnected
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : isPlaying && !isPaused
                      ? 'bg-purple-500 text-white border-2 border-purple-600' 
                      : 'bg-white text-purple-500 border-2 border-purple-500'
                  }`}
                >
                  {isPlaying && !isPaused ? (
                    <PiPauseBold className="w-8 h-8" />
                  ) : (
                    <PiPlayFill className="w-8 h-8" />
                  )}
                </button>
              </div>
              </div>

              {/* Right Column - Halt AI */}
              <div className="w-1/2 flex items-center justify-center">
                  <button 
                    onClick={stopSpeaking}
                  disabled={!isSpeaking && !streamingText}
                  className={`px-8 py-3 rounded-3xl text-xl font-medium transition-all duration-300 ${
                    isSpeaking || streamingText
                      ? 'bg-red-500 text-white hover:bg-white hover:text-red-500 hover:border-2 hover:border-red-500 cursor-pointer'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                  }`}
                >
                  Halt AI
                </button>
              </div>
            
            </div>

          </div>
        </section>
      </div>

      {/* Right Panel - Transcript (Less Space) */}
      <div className="w-2/5 bg-white flex flex-col">
        {/* Header with Search */}
        <div className="border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Tab Buttons */}
            <div className="flex space-x-4">
              <button 
                onClick={() => setActiveTab('transcript')}
                className={`pb-2 text-sm font-medium transition-colors ${
                  activeTab === 'transcript'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Transcript
              </button>
              <button 
                onClick={() => setActiveTab('script')}
                className={`pb-2 text-sm font-medium transition-colors relative ${
                  activeTab === 'script'
                    ? 'text-purple-600 border-b-2 border-purple-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Script
                {podcastScript && (
                  <span className="absolute -top-1 -right-2 w-2 h-2 bg-purple-500 rounded-full"></span>
                )}
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <button className="text-blue-600 text-sm font-medium hover:text-blue-800 flex items-center space-x-1">
                <span>Search</span>
                <Icon name="play" className="w-3 h-3 rotate-90" />
              </button>
            </div>
          </div>
          
          {/* Status Banner - Only show on transcript tab */}
          {activeTab === 'transcript' && (
            <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-xs text-purple-700 font-medium">
                  Knowledge Base Active - AI can access your selected documents
                </span>
              </div>
            </div>
          )}
          
          {/* Script Info Banner - Only show on script tab */}
          {activeTab === 'script' && podcastScript && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-green-700 font-medium">
                  Script loaded: {podcastScript.metadata?.segment_count || 0} segments • 
                  {podcastScript.metadata?.word_count || 0} words
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Transcript Area - Streaming Style */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'transcript' ? (
            // Existing Transcript View
            <>
              {transcript.length === 0 && !streamingText ? (
                <div className="text-center text-gray-500 mt-16">
                  <Icon name="podcast" className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">Ready to start conversation</p>
                  <p className="text-xs">Your transcript will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transcript.map((entry, idx) => (
                    <div 
                      key={`${idx}-${entry.speaker}`} 
                      className={`flex items-start space-x-2 ${
                        entry.isSystem ? 'bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-400' : 
                        entry.isWelcomeBack ? 'bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400' : ''
                      }`}
                    >
                      <div className="flex-shrink-0">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                          entry.speaker === "You" ? "bg-blue-500" : 
                          entry.speaker === "System" ? "bg-yellow-500" :
                          entry.speaker === "AI Assistant" ? "bg-purple-500" : "bg-gray-500"
                        }`}>
                          {entry.speaker === "You" ? "U" : 
                          entry.speaker === "System" ? "S" :
                          entry.speaker === "AI Assistant" ? "AI" : "?"}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-1 mb-1">
                          <span className="text-xs font-medium text-gray-700">
                            {entry.speaker}
                          </span>
                          <div className={`w-3 h-3 rounded-full flex items-center justify-center ${
                            entry.speaker === "You" ? "bg-blue-500" : 
                            entry.speaker === "System" ? "bg-yellow-500" :
                            "bg-purple-500"
                          }`}>
                            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className={`rounded p-2 ${
                          entry.isSystem ? 'bg-yellow-100' : 
                          entry.isWelcomeBack ? 'bg-blue-100' : 'bg-gray-50'
                        }`}>
                          <p className="text-gray-800 text-xs leading-relaxed">
                            {entry.text}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Streaming message - only show for User */}
                  {streamingText && currentStreamingSpeaker === 'You' && (
                    <div className="flex items-start space-x-2">
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold bg-blue-500">
                          U
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-1 mb-1">
                          <span className="text-xs font-medium text-gray-700">You</span>
                          <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                          </div>
                          <span className="text-xs text-gray-500">Now</span>
                        </div>
                        <div className="bg-gray-50 rounded p-2">
                          <p className="text-gray-800 text-xs leading-relaxed">
                            {streamingText}
                            <span className="animate-pulse ml-1 text-purple-500">●</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={transcriptEndRef} />
                </div>
              )}
            </>
          ) : (
            // New Script View
            <ScriptDisplay scriptData={podcastScript} />
          )}
        </div>

        {/* Manual Message Input */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={manualMessage}
              onChange={(e) => setManualMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={!liveKitConnected || !isPlaying || isPaused}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  sendManualMessage();
                }
              }}
            />
            <button
              onClick={sendManualMessage}
              disabled={!manualMessage.trim() || !liveKitConnected || !isPlaying || isPaused}
              className="bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-1 text-xs text-gray-600">
              <input type="checkbox" className="rounded" />
              <span>Export Transcript</span>
            </label>
            <button className="bg-purple-500 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-purple-600 transition-colors flex items-center space-x-1">
              <Icon name="podcast" className="w-3 h-3" />
              <span>Download</span>
            </button>
          </div>
        </div>
      </div>
      </div>
      
      {/* LiveKit Audio Renderer */}
      <RoomAudioRenderer />
      
      {/* Animation styles */}
      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </RoomContext.Provider>
  );
};

// LiveKit Participants Component - Shows only actual LiveKit participants
const LiveKitParticipants = () => {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.Microphone, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  // Get unique participants only
  const uniqueParticipants = [];
  const seenIdentities = new Set();
  
  tracks.forEach((track) => {
    if (!seenIdentities.has(track.participant.identity)) {
      seenIdentities.add(track.participant.identity);
      uniqueParticipants.push(track.participant);
    }
  });

  return (
    <>
      {uniqueParticipants.map((participant) => {
        const isAgent = participant.identity?.includes('agent');
        return (
          <div key={participant.sid} className="flex items-center space-x-4 p-3 bg-white/30 rounded-2xl backdrop-blur-sm border border-white/40 hover:bg-white/40 transition-all duration-300">
            <div className={`w-12 h-12 bg-gradient-to-br ${isAgent ? 'from-purple-500 to-purple-600' : 'from-blue-500 to-blue-600'} rounded-full flex items-center justify-center text-white shadow-lg`}>
              {isAgent ? (
                <Icon name="podcast" className="w-6 h-6" />
              ) : (
                <span className="text-xs font-bold">{participant.identity?.charAt(0).toUpperCase() || 'U'}</span>
              )}
          </div>
          <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-800">{isAgent ? 'AI Agent' : participant.identity || 'User'}</span>
              <span className="text-xs text-gray-600">{isAgent ? 'Assistant' : 'Listener'}</span>
          </div>
          <div className="ml-auto">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        </div>
        );
      })}
    </>
  );
};

export default NewPanelsRecording;