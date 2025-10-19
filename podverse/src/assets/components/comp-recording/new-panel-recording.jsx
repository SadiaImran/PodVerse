import React, { useState, useRef, useEffect, useCallback } from "react";
import { GrPowerCycle } from "react-icons/gr";
import { PiMicrophoneBold, PiMicrophoneSlashBold, PiPauseBold, PiPlayFill } from "react-icons/pi";
import { supabase , getSupabaseAuthorizedtoken } from "../../supabaseClient";
import { useAuth } from "../../context/AuthContext"; 

import aiImage from '../../images/transcript.png';
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

// Real Audio Waveform Component using Web Audio API
const RealAudioWaveform = ({ isActive = false, isMicOn = false }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (isActive && isMicOn) {
      startAudioCapture();
    } else {
      stopAudioCapture();
    }

    return () => {
      stopAudioCapture();
    };
  }, [isActive, isMicOn]);

  const startAudioCapture = async () => {
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create audio context
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Create analyser
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      // Create data array
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      dataArrayRef.current = dataArray;

      // Connect audio source
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // Start animation
      animate();
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopAudioCapture = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const animate = () => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasCtx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;

    // Get frequency data
    analyser.getByteFrequencyData(dataArray);

    // Clear canvas
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw waveform bars
    const barWidth = (canvas.width / dataArray.length) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
      barHeight = (dataArray[i] / 255) * canvas.height;

      // Create gradient for each bar
      const gradient = canvasCtx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
      gradient.addColorStop(0, '#8B5CF6'); // Purple
      gradient.addColorStop(0.5, '#A855F7'); // Light purple
      gradient.addColorStop(1, '#C084FC'); // Very light purple

      canvasCtx.fillStyle = gradient;
      canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

      x += barWidth + 1;
    }

    animationRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={600}
        height={300}
        className="rounded-2xl border-light-lavender border shadow-xl"
      />
    </div>
  );
};

// Enhanced Status indicator with time display
const StatusIndicator = ({ isRecording, isProcessing, isSpeaking, conversationStarted, isPaused, elapsedTime, recordingStatus, recordingUrl }) => {
  const formatTime = (seconds) => {
    const totalSeconds = Math.floor(seconds);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Show recording status
  if (isRecording) {
    return (
      <div className="flex items-center justify-center p-4 text-white rounded-full shadow-md bg-indigo-500 space-x-5">
        <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
        <span className=" font-semibold">Recording</span>
        <span className=" font-bold ">{formatTime(elapsedTime)}</span>
      </div>
    );
  }

  // Show ready status
  if (conversationStarted) {
    return (
      <div className="flex items-center justify-center space-x-3 bg-gradient-to-r from-green-500 to-green-600 px-12 py-4 rounded-full shadow-lg">
        <div className="w-3 h-3 bg-white rounded-full"></div>
        <span className="text-white font-semibold">Ready to Record</span>
      </div>
    );
  }

  // Default state
  return (
    <div className="flex items-center justify-center space-x-3 bg-gray-500 px-12 py-4 rounded-full">
      <div className="w-3 h-3 bg-white rounded-full"></div>
      <span className="text-white font-semibold">Connect to Start</span>
    </div>
  );
};

const NewPanelsRecording = ({ podcastConfig = {} }) => {
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
  const [sessionStarted, setSessionStarted] = useState(false);
  
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

  // **FIXED: Timer logic to start when recording starts and keep running**
  useEffect(() => {
    if (sessionStarted && isRecording) {
      if (timerRef.current === null) {
        // Start timer from 0 when recording starts
        const start = Date.now();
        setStartTime(start); 

        timerRef.current = setInterval(() => {
          setElapsedTime(Math.floor((Date.now() - start) / 1000));
        }, 1000);
      }
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      setStartTime(null);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [sessionStarted, isRecording]);

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
    const selectedKB = sessionStorage.getItem('current_kb_id');
    console.log("Retrieved selected KB ID from sessionStorage:", selectedKB);

    if (selectedKB) {
      try {
          formData.append("selected_kb_id",selectedKB);
          console.log("🎯 Using selected KB ID:",selectedKB);
        
      } catch (e) {
        console.warn("Failed to parse selected KB info:", e);
      }
    }

    // Get agent type from sessionStorage (set during podcast setup)
    const agentType = sessionStorage.getItem('selected_agent_type') || 'host';
    formData.append("agent_type", agentType);
    console.log("🎯 Using agent type:", agentType);
    
    // Get guest persona data if AI Guest is selected
    if (agentType === "guest") {
      const guestPersona = sessionStorage.getItem('guest_persona');
      if (guestPersona) {
        formData.append("guest_persona", guestPersona);
        console.log("🎭 Sending guest persona to backend:", JSON.parse(guestPersona));
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
    setSessionStarted(false);
    setIsRecording(false);
    setRecordingStatus('idle');
    // Reset timer state
    setElapsedTime(0);
    setPausedTime(0);
    if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
    }
    showToast('Disconnected from LiveKit', 'info');
  };


  // Microphone toggle function
  const toggleMicrophone = async () => {
    try {
      if (liveKitConnected && room.localParticipant && sessionStarted) {
        // Actually mute/unmute in LiveKit
        await room.localParticipant.setMicrophoneEnabled(!isMicOn);
        setIsMicOn(!isMicOn);
        showToast(`🎤 Microphone ${!isMicOn ? 'enabled' : 'muted'}`, !isMicOn ? 'success' : 'warning');
      } else if (!sessionStarted) {
        showToast('Please start the recording session first to use the microphone control', 'warning');
      } else {
        showToast('Please connect to LiveKit first to use the microphone control', 'warning');
      }
    } catch (error) {
      console.error('❌ Error toggling microphone:', error);
      showToast('Failed to toggle microphone', 'error');
    }
  };

  // Start Recording Session
  const startRecordingSession = async () => {
    try {
      if (!liveKitConnected) {
        showToast('Please connect to LiveKit first', 'warning');
        return;
      }

      setSessionStarted(true);
      setIsRecording(true);
      setRecordingStatus('recording');
      setConversationStarted(true);
      
      // Start audio egress (recording) - COMMENTED OUT FOR TESTING
      // const formData = new FormData();
      // formData.append('room_name', roomName); // Use the actual room name
      // formData.append('user_id', user?.id || '');
      // formData.append('kb_id', podcastConfig?.selectedKnowledgeBase || '');

      // const response = await fetch('http://localhost:8000/livekit/start-audio-egress', {
      //   method: 'POST',
      //   body: formData,
      // });

      // if (response.ok) {
      //   showToast('🎙️ Recording started!', 'success');
      // } else {
      //   console.error('Failed to start recording');
      //   showToast('Failed to start recording', 'error');
      // }
      
      showToast('🎙️ Recording started! (Egress disabled for testing)', 'success');
    } catch (error) {
      console.error('❌ Failed to start recording session:', error);
      showToast('Failed to start recording session', 'error');
    }
  };

  // Stop Recording Session
  const stopRecordingSession = async () => {
    try {
      setSessionStarted(false);
      setIsRecording(false);
      setRecordingStatus('stopped');
      
      // Stop audio egress (recording) - COMMENTED OUT FOR TESTING
      // const response = await fetch('http://localhost:8000/livekit/stop-audio-egress', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ room_name: roomName }),
      // });

      // if (response.ok) {
      //   showToast('⏹️ Recording stopped!', 'info');
      // } else {
      //   console.error('Failed to stop recording');
      //   showToast('Failed to stop recording', 'error');
      // }
      
      showToast('⏹️ Recording stopped! (Egress disabled for testing)', 'info');
    } catch (error) {
      console.error('❌ Failed to stop recording session:', error);
      showToast('Failed to stop recording session', 'error');
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
    
    // Performance debugging
    const startTime = performance.now();
    
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
            // Only update if different to avoid unnecessary re-renders
            if (currentStreamingSpeaker !== 'AI Assistant') {
              setCurrentStreamingSpeaker('AI Assistant');
            }
            if (streamingText !== segment.text) {
              setStreamingText(segment.text);
            }
            // Write streaming directly into the AI bubble - Optimized for performance
            setTranscript(prev => {
              const lastMessage = prev[prev.length - 1];
              if (lastMessage && lastMessage.speaker === 'AI Assistant' && lastMessage.isStreaming) {
                // Update existing streaming message (more efficient)
                const newTranscript = [...prev];
                newTranscript[newTranscript.length - 1] = { 
                  ...lastMessage, 
                  text: segment.text 
                };
                return newTranscript;
              }
              // Create new streaming message
              return [...prev, { 
                speaker: 'AI Assistant', 
                text: segment.text, 
                timestamp: new Date().toISOString(), 
                isStreaming: true 
              }];
            });
            setIsSpeaking(true);
            setIsProcessing(false);
          } else {
            // Only update if different to avoid unnecessary re-renders
            if (currentStreamingSpeaker !== 'You') {
              setCurrentStreamingSpeaker('You');
            }
            if (streamingText !== segment.text) {
              setStreamingText(segment.text);
            }
          }
        } else {
          if (isAgent) {
            if (currentStreamingSpeaker === 'You') {
              assistantBufferRef.current = { type: 'final', text: segment.text };
              return;
            }
            // Optimized handling of final AI messages
            setTranscript(prev => {
              const lastMessage = prev[prev.length - 1];
              if (lastMessage && lastMessage.speaker === 'AI Assistant' && lastMessage.isStreaming) {
                // Replace streaming message with final message (more efficient)
                const newTranscript = [...prev];
                newTranscript[newTranscript.length - 1] = { 
                  ...lastMessage, 
                  text: segment.text, 
                  isStreaming: false 
                };
                return newTranscript;
              }
              // Add new final message
              return [...prev, { 
                speaker: 'AI Assistant', 
                text: segment.text, 
                timestamp: new Date().toISOString(), 
                isStreaming: false 
              }];
            });
            if (currentStreamingSpeaker === 'AI Assistant') {
              setStreamingText('');
              setCurrentStreamingSpeaker(null);
            }
            setTimeout(() => setIsSpeaking(false), 200);
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
            // Process buffered assistant message
            const buffered = assistantBufferRef.current;
            if (buffered) {
              assistantBufferRef.current = null;
              if (buffered.type === 'final') {
                setTranscript(prev => [...prev, { speaker: 'AI Assistant', text: buffered.text, timestamp: new Date().toISOString(), isStreaming: false }]);
                setTimeout(() => setIsSpeaking(false), 200);
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
            setConversationHistory(prev => {
              // Avoid duplicate entries
              const lastEntry = prev[prev.length - 1];
              if (lastEntry && lastEntry.speaker === speaker && lastEntry.text === segment.text) {
                return prev;
              }
              return [...prev, { speaker, text: segment.text, timestamp: new Date().toISOString() }];
            });
        }
      }
    });
    
    // Performance debugging
    const endTime = performance.now();
    if (endTime - startTime > 10) {
      console.log(`⚠️ Transcript processing took ${endTime - startTime}ms`);
    }
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
              <p className="text-sm text-gray-600 mt-1">
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

      <div className="h-full rounded-3xl border-2 border-purple-200/50 shadow-2xl overflow-hidden flex bg-white/90 backdrop-blur-sm">
          {/* Left Panel - Participants (More Space) */}
          <div className="w-3/5 bg-gradient-to-br from-purple-50 via-white to-purple-100/30 flex">
        
        {/* Left Section - Participants + Session Management */}
        <section className="flex flex-col justify-center items-center my-auto mx-8 font-headingPoppins">
          {/* Participants Section - Only LiveKit Participants */}
          <div className="p-8 bg-light-lightPurple backdrop-blur-md rounded-3xl border-2 border-purple-200/50 shadow-2xl hover:shadow-3xl transition-all duration-300 w-full max-w-md">
              <h3 className="text-2xl font-bold text-white mb-3">Participants</h3>
            <div className="space-y-6">
              {/* LiveKit Participants */}
              <LiveKitParticipants podcastConfig={podcastConfig} />
              
              {/* Show message if no participants */}
              {!liveKitConnected && (
                <div className="text-center text-white py-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon name="podcast" className="w-8 h-8 text-purple-400" />
                  </div>
                  <p className="text-sm font-medium ">Connect to see participants</p>
                  <p className="text-xs ">Live participants will appear here</p>
                </div>
              )}
            </div>
        </div>
          {/* LiveKit Connection */}
          <div className="mt-8">
            {!liveKitConnected ? (
              <button 
                onClick={connectToLiveKit}
                disabled={liveKitConnecting}
                className={`group flex items-center space-x-3 px-8 py-4 rounded-2xl text-sm font-semibold transition-all duration-300 border-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5 ${
                  liveKitConnecting
                    ? 'bg-blue-500/10 text-blue-700 border-blue-500/30 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-green-600 text-white border-green-500 hover:from-green-600 hover:to-green-700 cursor-pointer'
                }`}
              >
                <div className={`w-4 h-4 rounded-full ${
                  liveKitConnecting ? 'bg-blue-500 animate-pulse' : 'bg-white'
                }`}></div>
                <span>{liveKitConnecting ? 'Connecting...' : 'Connect LiveKit'}</span>
                {!liveKitConnecting && (
                  <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}
              </button>
            ) : (
              <button 
                onClick={disconnectFromLiveKit}
                className="group flex items-center space-x-3 bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-4 rounded-2xl text-sm font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-300 border-2 border-red-500 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
                <span>Disconnect LiveKit</span>
                <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </button>
            )}
            
            {/* Connection Status */}
            <div className="mt-3 text-center">
              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium ${
                liveKitConnected 
                  ? 'bg-green-100 text-green-800 border border-green-200' 
                  : liveKitConnecting
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-gray-100 text-gray-600 border border-gray-200'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  liveKitConnected ? 'bg-green-500 animate-pulse' : 
                  liveKitConnecting ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'
                }`}></div>
                {liveKitConnected ? 'Connected' : liveKitConnecting ? 'Connecting...' : 'Disconnected'}
              </span>
            </div>
          </div>

          {/* Restart Session */}
          <div className="mt-6">
            <button 
              onClick={restartRecording}
              disabled={isProcessing}
              className="group flex items-center space-x-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white px-6 py-3 rounded-2xl text-sm font-semibold hover:from-gray-600 hover:to-gray-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-gray-500 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              <GrPowerCycle className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" /> 
              <span>Restart Session</span>
            </button>
          </div>
        </section>

        {/* Separator */}
        <div className="w-px bg-gradient-to-b from-purple-200 to-purple-300"></div>

        {/* Right Section - Main Controls */}
        <section className="w-2/3 flex flex-col my-auto mx-8">
          {/* Header */}
          <div className="bg-gradient-to-r from-light-lightPurple to-light-lavender text-white px-8 py-4 mx-auto rounded-3xl mt-20 shadow-2xl border-2 border-purple-500/20">
            <div className="flex items-center justify-center gap-3">
              
              <h1 className="text-xl font-bold font-headingPoppins tracking-wide">
                {podcastConfig.podcastName || 'THE DAILY CONVERSATION'}
              </h1>
            </div>
          </div>
          
             {/* Real Audio Waveform Section */}
             <div className="flex my-10 justify-center items-center ">
              
                 {/* Waveform Container */}
                 <div className="relative z-10 w-full h-full">
                   <RealAudioWaveform 
                     isActive={sessionStarted} 
                     isMicOn={isMicOn}
                   />
                 </div>
                 
               
             </div>

            
           {/* Status Indicator */}
           <div className="p-4 font-bodyRoboto text-center flex justify-center items-center">
             <StatusIndicator 
               isRecording={sessionStarted && isRecording}
               isProcessing={recordingStatus === 'saving'}
               isSpeaking={isSpeaking}
               conversationStarted={sessionStarted}
               isPaused={false}
               elapsedTime={elapsedTime}
               recordingStatus={sessionStarted ? 'recording' : 'idle'}
               recordingUrl={recordingUrl}
             />
           </div>


           {/* Controls - Start/Stop Recording + Microphone + Halt AI */}
           <div className="flex justify-center items-center py-8">
             <div className="flex justify-center items-center gap-8">

               {/* Start/Stop Recording Button */}
               {!sessionStarted ? (
                 <div className="flex flex-col items-center gap-2">
                   <button 
                     onClick={startRecordingSession}
                     disabled={!liveKitConnected}
                     className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 ${
                       liveKitConnected
                         ? 'bg-gradient-to-br from-green-500 to-green-600 text-white border-2 border-green-700 shadow-green-500/50' 
                         : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                     }`}
                   >
                     <PiPlayFill className="w-10 h-10" />
                   </button>
                   <span className="text-xs font-medium text-gray-600">Start Recording</span>
                 </div>
               ) : (
                 <div className="flex flex-col items-center gap-2">
                   <button 
                     onClick={stopRecordingSession}
                     className="w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br from-red-500 to-red-600 text-white border-2 border-red-700 shadow-red-500/50"
                   >
                     <PiPauseBold className="w-10 h-10" />
                   </button>
                   <span className="text-xs font-medium text-gray-600">Stop Recording</span>
                 </div>
               )}

               {/* Microphone Toggle Button - Only show when session started */}
               {sessionStarted && (
                 <div className="flex flex-col items-center gap-2">
                   <button 
                     onClick={toggleMicrophone}
                     className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 ${
                       isMicOn 
                         ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white border-2 border-purple-700 shadow-purple-500/50' 
                         : 'bg-white text-light-lightPurple border-2 border-light-lightPurple hover:bg-purple-50'
                     }`}
                   >
                     {isMicOn ? (
                       <PiMicrophoneBold className="w-10 h-10" />
                     ) : (
                       <PiMicrophoneSlashBold className="w-10 h-10" />
                     )}
                   </button>
                   <span className="text-xs font-medium text-gray-600">Microphone</span>
                 </div>
               )}
             </div>

           </div>
        </section>
      </div>

      {/* Right Panel - Transcript (Original Size) */}
      <div className="w-2/5 bg-gradient-to-br from-gray-50 to-purple-50/30 flex flex-col border-l-2 border-purple-200/50">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-50 to-white border-b-2 border-purple-200/50 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Tab Buttons */}
            <div className="flex space-x-6">
              <button 
                onClick={() => setActiveTab('transcript')}
                className={`pb-3 text-lg font-semibold transition-all duration-300 relative ${
                  activeTab === 'transcript'
                    ? 'text-purple-600'
                    : 'text-gray-500 hover:text-purple-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${
                    activeTab === 'transcript' ? 'bg-purple-500' : 'bg-gray-300'
                  }`}></div>
                  Transcript
                </span>
                {activeTab === 'transcript' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"></div>
                )}
              </button>
              <button 
                onClick={() => setActiveTab('script')}
                className={`pb-3 text-lg font-semibold transition-all duration-300 relative ${
                  activeTab === 'script'
                    ? 'text-light-lightPurple'
                    : 'text-gray-500 hover:text-light-lightPurple'
                }`}
              >
                <span className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${
                    activeTab === 'script' ? 'bg-light-lightPurple' : 'bg-gray-300'
                  }`}></div>
                  Script
                  {podcastScript && (
                    <span className="w-2 h-2 bg-light-lightPurple rounded-full animate-pulse"></span>
                  )}
                </span>
                {activeTab === 'script' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-light-lightPurple rounded-full"></div>
                )}
              </button>
            </div>
          </div>
          
          
          {/* Script Info Banner - Only show on script tab */}
          {activeTab === 'script' && podcastScript && (
            <div className="mt-3 p-3 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-700 font-semibold">
                  Script loaded: {podcastScript.metadata?.segment_count || 0} segments • 
                  {podcastScript.metadata?.word_count || 0} words
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Transcript Area - Streaming Style */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-white via-gray-50/50 to-purple-50/20">
          {activeTab === 'transcript' ? (
            // Enhanced Transcript View
            <>
              {transcript.length === 0 && !streamingText ? (
                <div className="text-center text-gray-500 mt-20">
                  <div className="w-96 h-96 mx-auto mb-6 flex items-center justify-center">
                    <img 
                      src={aiImage} 
                      alt="AI Assistant" 
                      className="w-full h-full object-contain rounded-full"
                    />
                  </div>
                  <p className="text-lg font-semibold text-gray-600 mb-2">Ready to start conversation</p>
                  <p className="text-sm text-gray-400">Your transcript will appear here in real-time</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transcript.map((entry, idx) => {
                    const { user } = useAuth();
                    const isUser = entry.speaker === "You" || entry.speaker === user?.full_name;
                    const isAI = entry.speaker === "AI Assistant" || entry.speaker === "AI Agent";
                    
                    // Get AI agent name and avatar from podcast config
                    const aiAgentName = podcastConfig.agentName || podcastConfig.guestPersona?.name || 'AI Assistant';
                    const aiAvatar = podcastConfig.avatar || podcastConfig.guestPersona?.avatar;
                    const aiRole = podcastConfig.speakerType === 'ai-guest' ? 'AI Guest' : 'AI Host';
                    const userName = user?.full_name || 'User';
                    
                    return (
                    <div 
                      key={`${idx}-${entry.speaker}`} 
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${
                        entry.isSystem ? 'justify-center' : ''
                      }`}
                      style={{ animation: 'fadeIn 0.3s ease-in' }}
                    >
                      <div className={`flex items-start gap-3 max-w-[80%] ${isUser ? 'flex-row-reverse' : ''}`}>
                        <div className="flex-shrink-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg overflow-hidden ${
                            isUser ? "bg-light-lightPurple" : 
                            entry.speaker === "System" ? "bg-gradient-to-br from-yellow-500 to-yellow-600" :
                            isAI ? "bg-gradient-to-br from-blue-500 to-blue-600" : "bg-gradient-to-br from-gray-500 to-gray-600"
                          }`}>
                            {isUser ? (
                              <span className="text-sm font-bold">{userName.charAt(0).toUpperCase()}</span>
                            ) : entry.speaker === "System" ? (
                              "S"
                            ) : isAI ? (
                              aiAvatar ? (
                                <img 
                                  src={aiAvatar} 
                                  alt={aiAgentName}
                                  className="w-full h-full object-cover rounded-full"
                                />
                              ) : (
                                "AI"
                              )
                            ) : (
                              "?"
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className={`rounded-2xl px-5 py-3.5 ${
                            isUser
                              ? 'bg-light-lightPurple text-white shadow-lg'
                              : entry.isSystem
                              ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-200 shadow-md'
                              : entry.isWelcomeBack
                              ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 shadow-md'
                              : 'bg-white border-2 border-purple-100 shadow-md hover:shadow-lg transition-shadow'
                          }`}>
                            {/* Speaker name */}
                            <div className={`text-sm font-semibold mb-1 ${
                              isUser ? 'text-purple-100' : 
                              entry.isSystem ? 'text-yellow-700' :
                              isAI ? 'text-blue-700' : 'text-gray-600'
                            }`}>
                              {isUser ? userName : 
                               entry.isSystem ? 'System' :
                               isAI ? aiAgentName : entry.speaker}
                            </div>
                            <p className="text-base leading-relaxed">
                              {entry.text}
                            </p>
                          </div>
                          <span className={`text-sm text-gray-400 px-2 ${entry.speaker === "You" ? 'text-right' : ''}`}>
                            {new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                  
                  {/* Streaming message - only show for User */}
                  {streamingText && currentStreamingSpeaker === 'You' && (
                    <div className="flex justify-end" style={{ animation: 'fadeIn 0.3s ease-in' }}>
                      <div className="flex items-start gap-3 max-w-[80%] flex-row-reverse">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg animate-pulse">
                            U
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="bg-light-lightPurple text-white rounded-2xl px-5 py-3.5 shadow-lg">
                            <p className="text-sm leading-relaxed">
                              {streamingText}
                              <span className="animate-pulse ml-1 text-white text-lg">●</span>
                            </p>
                          </div>
                          <span className="text-xs text-gray-400 px-2 text-right">Now</span>
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
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-in;
        }
      `}</style>
    </RoomContext.Provider>
  );
};

// LiveKit Participants Component - Shows only actual LiveKit participants
const LiveKitParticipants = ({ podcastConfig = {} }) => {
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
        const { user } = useAuth();
        
        // Get AI agent name and avatar from podcast config
        const aiAgentName = podcastConfig.agentName || podcastConfig.guestPersona?.name || 'AI Assistant';
        const aiAvatar = podcastConfig.avatar || podcastConfig.guestPersona?.avatar;
        
        // Get AI role based on setup
        const aiRole = podcastConfig.speakerType === 'ai-guest' ? 'AI Guest' : 'AI Host';
        
        // Get user name from auth context
        const userName = user?.full_name || 'User';
        
        return (
          <div key={participant.sid} className="group flex items-center space-x-4 p-6 bg-white/80 rounded-2xl backdrop-blur-sm border-2 border-purple-200/50 hover:bg-white hover:border-purple-300 hover:shadow-lg transition-all duration-300 w-full min-w-80">
            <div className={`w-14 h-14 bg-gradient-to-br ${isAgent ? 'from-purple-500 to-purple-600' : 'from-blue-500 to-blue-600'} rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform duration-300 overflow-hidden`}>
              {isAgent ? (
                aiAvatar ? (
                  <img 
                    src={aiAvatar} 
                    alt={aiAgentName}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <Icon name="podcast" className="w-12 h-12" />
                )
              ) : (
                <span className="text-sm font-bold">{userName.charAt(0).toUpperCase()}</span>
              )}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
              <span className="text-lg font-semibold text-gray-800 truncate">
                {isAgent ? aiAgentName : userName}
              </span>
              <span className="text-base text-gray-600 font-medium truncate">
                {isAgent ? aiRole : 'User'}
              </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-green-500/50"></div>
            <span className="text-xs text-green-600 font-medium">Online</span>
          </div>
        </div>
        );
      })}
    </>
  );
};

export default NewPanelsRecording;