import React, { useState, useRef, useEffect } from "react";
import { GrPowerCycle } from "react-icons/gr";
import { PiMicrophoneBold , PiMicrophoneSlashBold , PiPlayCircleBold , PiPauseFill , PiPauseBold, PiPlayFill } from "react-icons/pi";
import { supabase } from "../../../connection_supabase_client";
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

// Keep existing TranscriptBubble and Waveform components...
const TranscriptBubble = ({ speaker, text, isTyping = false, isSpeaking = false }) => (
  <div className={`mb-3 max-w-xs p-3 rounded-lg flex flex-col transition-all duration-300 ${
    speaker === "You" 
      ? "bg-blue-500 text-white self-end ml-8 rounded-br-none" 
      : `bg-white border-2 self-start mr-8 rounded-bl-none ${
          isSpeaking ? 'border-green-400 shadow-lg' : 'border-gray-200'
        }`
  }`}>
    <div className="flex items-center justify-between mb-1">
      <p className={`text-xs font-semibold ${
        speaker === "You" ? "text-blue-100" : "text-gray-600"
      }`}>
        {speaker}
      </p>
      {isSpeaking && (
        <div className="flex space-x-1">
          <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
          <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
          <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
        </div>
      )}
    </div>
    <p className={`text-sm ${
      speaker === "You" ? "text-white" : "text-gray-800"
    }`}>
      {isTyping ? (
        <span>
          {text}
          <span className="animate-pulse ml-1">●</span>
        </span>
      ) : (
        text
      )}
    </p>
  </div>
);

const Waveform = ({ isRecording, isSpeaking }) => (
  <div className="w-full">
    <div className="flex space-x-1 h-16 items-center justify-center">
      {[...Array(25)].map((_, i) => (
        <div
          key={i}
          className={`w-2 rounded-full origin-bottom transition-all duration-300 ${
            isRecording ? 'bg-red-500 animate-wave' : 
            isSpeaking ? 'bg-green-500 animate-wave' : 
            'bg-blue-400'
          }`}
          style={{
            animationDelay: `${i * 0.08}s`,
            animationDuration: `${0.5 + (i % 4) * 0.2}s`,
            height: (isRecording || isSpeaking) ? `${8 + (i % 8) * 6}px` : "4px",
          }}
        />
      ))}
    </div>
    
    <style>{`
      @keyframes wave {
        0%, 100% { transform: scaleY(0.3); opacity: 0.7; }
        50% { transform: scaleY(1.2); opacity: 1; }
      }
      .animate-wave {
        animation-name: wave;
        animation-iteration-count: infinite;
        animation-timing-function: ease-in-out;
      }
    `}</style>
  </div>
);

// Enhanced Status indicator
const StatusIndicator = ({ isRecording, isProcessing, isSpeaking, conversationStarted }) => {
  if (!conversationStarted) {
    return (
      <div className="flex items-center justify-center space-x-3 bg-gray-800/50 px-6 py-3 rounded-full border border-gray-600">
        <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
        <Icon name="podcast" className="w-5 h-5 text-purple-400" />
        <span className="font-medium text-purple-300">Ready to Start Live Podcast</span>
      </div>
    );
  }
  if (isRecording) {
    return (
      <div className="flex items-center justify-center space-x-3 bg-red-900/30 px-6 py-3 rounded-full border border-red-500">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-red-500/50"></div>
        <Icon name="mic" className="w-5 h-5 text-red-400" />
        <span className="font-medium text-red-300">LIVE RECORDING</span>
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
  
  // LiveKit Configuration
  const serverUrl = 'wss://podverse-0nuzilmi.livekit.cloud';
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTk2ODIwMjIsImlkZW50aXR5IjoicXVpY2tzdGFydCB1c2VyIHRjZzU5MiIsImlzcyI6IkFQSW9XQnE5dHFnb3hMZSIsIm5iZiI6MTc1OTY3NDgyMiwic3ViIjoicXVpY2tzdGFydCB1c2VyIHRjZzU5MiIsInZpZGVvIjp7ImNhblB1Ymxpc2giOnRydWUsImNhblB1Ymxpc2hEYXRhIjp0cnVlLCJjYW5TdWJzY3JpYmUiOnRydWUsInJvb20iOiJxdWlja3N0YXJ0IHJvb20iLCJyb29tSm9pbiI6dHJ1ZX19.XAJGCMkcpZlv2dBBxU4ClQEgji_MS4pVa1GJPv40ToQ';
  
  // Existing state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeakingIndex, setCurrentSpeakingIndex] = useState(-1);
  const [transcript, setTranscript] = useState([]);

  // Conversation management state
  const [conversationStarted, setConversationStarted] = useState(false);
  const [conversationId] = useState(() => `conv_${Date.now()}`);
  const [showName] = useState("AI Knowledge Podcast");
  const [guestName] = useState("Expert Guest");
  
  // Microphone state
  const [isMicOn, setIsMicOn] = useState(true);
  
  // Play/Pause state
  const [isPlaying, setIsPlaying] = useState(false);
  
  // LiveKit state
  const [liveKitConnected, setLiveKitConnected] = useState(false);
  const [liveKitParticipants, setLiveKitParticipants] = useState([]);
  const [room] = useState(() => new Room({
    adaptiveStream: true,
    dynacast: true,
  }));
  
  // Existing refs
  const recorderRef = useRef(null);
  const gumStreamRef = useRef(null);
  const currentAudioRef = useRef(null);
  const transcriptEndRef = useRef(null);
  const { user } = useAuth();

  // Auto-scroll to bottom of transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // Start conversation based on agent selection
  const startConversation = async () => {
    if (SELECTED_AGENT === 'host') {
      // HOST MODE: AI starts the conversation using podcast/start endpoint
      await startPodcastConversation();
    } else {
      // GUEST MODE: Just mark conversation as started, user goes first
      setConversationStarted(true);
    }
  };

  // HOST MODE: Start podcast conversation with host opening
  const startPodcastConversation = async () => {
    try {
      setIsProcessing(true);
      console.log("🎙️ Starting podcast conversation (HOST mode)...");

      // Simple welcome message since podcast endpoints don't exist
      const welcomeMessage = "Welcome to the AI Knowledge Podcast! I'm your host, and I'm excited to explore topics with you today. What would you like to discuss?";
      
      setTranscript([
        { speaker: "AI", text: welcomeMessage }
      ]);
      setConversationStarted(true);
      
      setTimeout(() => {
        fallbackToWebSpeech(welcomeMessage, 0);
      }, 500);

    } catch (error) {
      console.error("❌ Failed to start podcast:", error);
      const errorMessage = "Welcome to the podcast! What would you like to explore today?";
      setTranscript([
        { speaker: "AI", text: errorMessage }
      ]);
      setConversationStarted(true);
      fallbackToWebSpeech(errorMessage, 0);
    } finally {
      setIsProcessing(false);
    }
  };

  // Keep existing audio playback functions...
  const playBase64Audio = async (base64Audio, messageIndex) => {
    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      setIsSpeaking(true);
      setCurrentSpeakingIndex(messageIndex);

      const audioBytes = atob(base64Audio);
      const audioArray = new Uint8Array(audioBytes.length);
      for (let i = 0; i < audioBytes.length; i++) {
        audioArray[i] = audioBytes.charCodeAt(i);
      }
      const audioBlob = new Blob([audioArray], { type: 'audio/wav' });

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onplay = () => console.log("🔊 Audio started playing");
      audio.onended = () => {
        console.log("🔊 Audio finished playing");
        setIsSpeaking(false);
        setCurrentSpeakingIndex(-1);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };
      audio.onerror = (error) => {
        console.error("🔊 Audio playback error:", error);
        setIsSpeaking(false);
        setCurrentSpeakingIndex(-1);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };
      audio.onpause = () => {
        console.log("🔊 Audio paused");
        setIsSpeaking(false);
        setCurrentSpeakingIndex(-1);
      };

      await audio.play();

    } catch (error) {
      console.error("❌ Base64 audio playback error:", error.message);
      setIsSpeaking(false);
      setCurrentSpeakingIndex(-1);
    }
  };

  const fallbackToWebSpeech = (text, messageIndex) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Google') || 
        voice.name.includes('Microsoft') ||
        voice.lang.startsWith('en')
      );
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      
      utterance.onstart = () => {
        setIsSpeaking(true);
        setCurrentSpeakingIndex(messageIndex);
      };
      
      utterance.onend = () => {
        setIsSpeaking(false);
        setCurrentSpeakingIndex(-1);
      };
      
      utterance.onerror = () => {
        setIsSpeaking(false);
        setCurrentSpeakingIndex(-1);
      };
      
      window.speechSynthesis.speak(utterance);
    }
  };

  // **KEY ROUTING LOGIC** - Route to different endpoints based on SELECTED_AGENT
  const sendChunkToBackend = async (chunkBlob) => {
    try {
      setIsProcessing(true);
      
      // Step 1: Transcribe audio (same for both modes)
      const formData = new FormData();
      formData.append("user_id", user?.id || "unknown");
      formData.append("audio", chunkBlob, "query.wav");

      const sessionData = await supabase.auth.getSession();
      const token = sessionData?.data?.session?.access_token;

      console.log("🎤 Sending audio for transcription...");
      const transcriptionResponse = await axios.post("http://localhost:8000/query_audio/", formData, {
        headers: {
          Authorization: `Bearer ${token}`
        }  
      });

      const transcriptionResult = await transcriptionResponse.data;
      console.log("✅ Transcription response:", transcriptionResult);

      if (transcriptionResult.query) {
        // Add user message to transcript
        setTranscript((prev) => [
          ...prev,
          { speaker: "You", text: transcriptionResult.query },
        ]);

        // **ROUTING LOGIC BASED ON AGENT**
        if (SELECTED_AGENT === 'host') {
          // HOST MODE: Use podcast/turn endpoint
          await handleHostMode(transcriptionResult.query, token);
        } else {
          // GUEST MODE: Use regular respond endpoint  
          await handleGuestMode(transcriptionResult.query, token);
        }

      } else {
        setTranscript((prev) => [
          ...prev,
          { speaker: "You", text: transcriptionResult.error || "[No speech detected]" },
          { speaker: "AI", text: "I couldn't understand the audio. Could you please try again?" },
        ]);
        
        setTimeout(() => {
          fallbackToWebSpeech("I couldn't understand the audio. Could you please try again?", transcript.length + 1);
        }, 500);
      }
      
    } catch (error) {
      console.error("❌ Error:", error.message);
      
      setTranscript((prev) => {
        const newTranscript = [...prev];
        if (newTranscript[newTranscript.length - 1]?.isTyping) {
          newTranscript.pop();
        }
        return newTranscript;
      });

      const errorMessage = "Sorry, I encountered an error processing your request. Let's try again.";
      setTranscript((prev) => [
        ...prev,
        { speaker: "You", text: "[Recording Sent]" },
        { speaker: "AI", text: errorMessage },
      ]);

      setTimeout(() => {
        fallbackToWebSpeech(errorMessage, transcript.length + 1);
      }, 500);
    } finally {
      setIsProcessing(false);
    }
  };

  // HOST MODE: Use regular respond endpoint (podcast endpoints don't exist)
  const handleHostMode = async (query, token) => {
    console.log("🤖 Getting HOST response for:", query);
    
    const thinkingIndex = transcript.length + 1;
    setTranscript((prev) => [
      ...prev,
      { speaker: "AI", text: "Let me think about that...", isTyping: true },
    ]);

    const responseFormData = new FormData();
    responseFormData.append("user_id", user?.id || "unknown");
    responseFormData.append("query", query);

    const response = await fetch("http://localhost:8000/respond/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: responseFormData
    });

    if (response.ok) {
      const result = await response.json();
      console.log("✅ Host response received:", result);

      const responseText = result.answer_text || "[No response generated]";
      
      // Replace the "thinking" message with the actual response
      setTranscript((prev) => {
        const newTranscript = [...prev];
        if (newTranscript[newTranscript.length - 1].isTyping) {
          newTranscript.pop();
        }
        newTranscript.push({
          speaker: "AI",
          text: responseText
        });
        return newTranscript;
      });

      // Play the audio
      if (result.audio_data) {
        console.log("🔊 Playing host TTS audio...");
        await playBase64Audio(result.audio_data, thinkingIndex);
      } else {
        setTimeout(() => {
          fallbackToWebSpeech(responseText, thinkingIndex);
        }, 500);
      }

    } else {
      throw new Error(`Host response failed: ${response.status}`);
    }
  };

  // GUEST MODE: Use regular respond endpoint
  const handleGuestMode = async (query, token) => {
    console.log("🤖 Getting GUEST response for:", query);
    
    const thinkingIndex = transcript.length + 1;
    setTranscript((prev) => [
      ...prev,
      { speaker: "AI", text: "Let me think about that...", isTyping: true },
    ]);

    const responseFormData = new FormData();
    responseFormData.append("user_id", user?.id || "unknown");
    responseFormData.append("query", query);

    const response = await fetch("http://localhost:8000/respond/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: responseFormData
    });

    if (response.ok) {
      const result = await response.json();
      console.log("✅ Guest response received:", result);

      const responseText = result.answer_text || "[No response generated]";
      
      // Replace the "thinking" message with the actual response
      setTranscript((prev) => {
        const newTranscript = [...prev];
        if (newTranscript[newTranscript.length - 1].isTyping) {
          newTranscript.pop();
        }
        newTranscript.push({
          speaker: "AI",
          text: responseText
        });
        return newTranscript;
      });

      // Play the audio
      if (result.audio_data) {
        console.log("🔊 Playing guest TTS audio...");
        await playBase64Audio(result.audio_data, thinkingIndex);
      } else {
        setTimeout(() => {
          fallbackToWebSpeech(responseText, thinkingIndex);
        }, 500);
      }

    } else {
      throw new Error(`Guest response failed: ${response.status}`);
    }
  };

  // Keep existing recording functions...
  const resetRecorder = () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    if (gumStreamRef.current) {
      gumStreamRef.current.getTracks().forEach((t) => t.stop());
      gumStreamRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setCurrentSpeakingIndex(-1);
      
      resetRecorder();
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      gumStreamRef.current = stream;

      const input = audioContext.createMediaStreamSource(stream);
      const recorder = new window.Recorder(input, { numChannels: 1 });
      recorder.record();

      recorderRef.current = recorder;
      setIsRecording(true);
      setIsPaused(false);
      console.log("🎤 Recorder created", recorder);
    } catch (err) {
      console.error("🎤 Start failed:", err);
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    const gumStream = gumStreamRef.current;

    if (!recorder) return;
    recorder.stop();
    gumStream?.getTracks().forEach((track) => track.stop());

    recorder.exportWAV((blob) => {
      console.log("🧾 Exported audio blob:", blob);
      sendChunkToBackend(blob);
    });

    recorderRef.current = null;
    gumStreamRef.current = null;
    setIsRecording(false);
    setIsPaused(false);
  };

  const pauseRecording = () => {
    if (isRecording && recorderRef.current) {
      recorderRef.current.stop();
      gumStreamRef.current?.getTracks().forEach((track) => track.stop());
      setIsPaused(true);
    }
  };

  const resumeRecording = () => startRecording();

  const restartRecording = () => {
    resetRecorder();
    
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    window.speechSynthesis.cancel();
    
    setTranscript([]);
    setIsRecording(false);
    setIsPaused(false);
    setIsProcessing(false);
    setIsSpeaking(false);
    setCurrentSpeakingIndex(-1);
    setConversationStarted(false);
  };

  const stopSpeaking = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setCurrentSpeakingIndex(-1);
  };

  // Microphone toggle function
  const toggleMicrophone = () => {
    setIsMicOn(!isMicOn);
  };

  // Play/Pause toggle function
  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // Connect to LiveKit room
  const connectToLiveKit = async () => {
    try {
      console.log('🔄 Attempting to connect to LiveKit...');
      console.log('Server URL:', serverUrl);
      console.log('Token (first 50 chars):', token.substring(0, 50) + '...');
      console.log('Current room state:', room.state);
      
      await room.connect(serverUrl, token);
      console.log('✅ Connection successful!');
      console.log('Room name:', room.name);
      console.log('Local participant identity:', room.localParticipant?.identity);
      console.log('Current participants:', room.participants?.size || 0);
    } catch (error) {
      console.error('❌ Failed to connect to LiveKit:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
    }
  };

  // Disconnect from LiveKit room
  const disconnectFromLiveKit = () => {
    console.log('🔄 Disconnecting from LiveKit room...');
    console.log('Current participants before disconnect:', room.participants?.size || 0);
    room.disconnect();
    setLiveKitConnected(false);
    console.log('❌ Disconnected from LiveKit room');
  };

  // Set up room event listeners
  useEffect(() => {
    console.log('🔧 Setting up LiveKit event listeners...');
    
    const handleConnected = () => {
      setLiveKitConnected(true);
      console.log('✅ Connected to LiveKit room');
      console.log('Room name:', room.name);
      console.log('Local participant:', room.localParticipant.identity);
    };

    const handleDisconnected = (reason) => {
      setLiveKitConnected(false);
      console.log('❌ Disconnected from LiveKit room, reason:', reason);
    };

    const handleParticipantConnected = (participant) => {
      console.log('👤 Participant connected:', participant.identity);
      console.log('Total participants:', (room.participants?.size || 0) + 1);
      setLiveKitParticipants(prev => [...prev, participant]);
    };

    const handleParticipantDisconnected = (participant) => {
      console.log('👤 Participant disconnected:', participant.identity);
      console.log('Remaining participants:', room.participants?.size || 0);
      setLiveKitParticipants(prev => prev.filter(p => p.identity !== participant.identity));
    };

    const handleTrackSubscribed = (track, publication, participant) => {
      console.log('🎵 Track subscribed:', track.kind, 'from', participant.identity);
    };

    const handleTrackUnsubscribed = (track, publication, participant) => {
      console.log('🎵 Track unsubscribed:', track.kind, 'from', participant.identity);
    };

    // Add event listeners
    room.on('connected', handleConnected);
    room.on('disconnected', handleDisconnected);
    room.on('participantConnected', handleParticipantConnected);
    room.on('participantDisconnected', handleParticipantDisconnected);
    room.on('trackSubscribed', handleTrackSubscribed);
    room.on('trackUnsubscribed', handleTrackUnsubscribed);

    // Check current connection status
    console.log('🔍 Current room state:', room.state);
    if (room.state === 'connected') {
      console.log('🟢 Room already connected');
      setLiveKitConnected(true);
    } else {
      console.log('🔴 Room not connected, state:', room.state);
    }

    return () => {
      console.log('🧹 Cleaning up LiveKit event listeners');
      room.off('connected', handleConnected);
      room.off('disconnected', handleDisconnected);
      room.off('participantConnected', handleParticipantConnected);
      room.off('participantDisconnected', handleParticipantDisconnected);
      room.off('trackSubscribed', handleTrackSubscribed);
      room.off('trackUnsubscribed', handleTrackUnsubscribed);
    };
  }, [room]);

  return (
    <RoomContext.Provider value={room}>
      <div className="h-full rounded-3xl border-[3px] border-light-accent overflow-hidden flex">
      {/* Left Panel - Recording Studio (More Space) */}
      <div className="w-3/5 bg-gradient-to-b from-light-accent to-purple-200 flex">
        
        {/* Left Section - Participants +Session Management */}
        <section className="flex flex-col justify-center items-center my-auto mx-8 font-headingPoppins">
          {/* Participants Section */}
          <div className="py-6 px-8 bg-white/20 backdrop-blur-md rounded-3xl border border-white/30 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-6 text-center">Participants</h3>
            <div className="space-y-4">

              {/* Human User */}
              <div className="flex items-center space-x-4 p-3 bg-white/30 rounded-2xl backdrop-blur-sm border border-white/40 hover:bg-white/40 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                  HU
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-800">Human User</span>
                  <span className="text-xs text-gray-600">Active</span>
                </div>
                <div className="ml-auto">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>
              
              {/* AI Host */}
              <div className="flex items-center space-x-4 p-3 bg-white/30 rounded-2xl backdrop-blur-sm border border-white/40 hover:bg-white/40 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-lg">
                  <Icon name="podcast" className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-800">AI Host</span>
                  <span className="text-xs text-gray-600">{liveKitConnected ? 'Connected' : 'Ready'}</span>
                </div>
                <div className="ml-auto">
                  <div className={`w-3 h-3 rounded-full ${liveKitConnected ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`}></div>
                </div>
              </div>

              {/* LiveKit Participants */}
              <LiveKitParticipants />
            </div>
        </div>
          {/* LiveKit Connection */}
          <div className="mt-6">
            {!liveKitConnected ? (
              <button 
                onClick={connectToLiveKit}
                className="flex items-center space-x-3 bg-green-500/20 backdrop-blur-md text-green-800 px-6 py-3 rounded-2xl text-sm font-medium hover:bg-green-500/30 transition-all duration-300 border border-green-500/30 shadow-lg"
              >
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Connect LiveKit</span>
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
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {liveKitConnected ? 'Connected' : 'Disconnected'}
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
          
          {/* Time & Status - Centered */}
          <div className="px-6 py-4 font-bodyRoboto text-center text-xl">
            <div className="text-gray-700 mb-1">
              <span className="font-bold">On Record:</span> 00:05:32
            </div>
            <div className="text-gray-700">
              <span className="font-bold">Active:</span> AI Host
            </div>
          </div>

            {/* Waveform Section */}
            <div className="flex justify-center items-center py-8">
              <div className="bg-purple-50/30 border border-purple-200/50 rounded-lg p-6 w-8/12 h-72 flex items-center justify-center">
                <Waveform isRecording={isRecording && !isPaused} isSpeaking={isSpeaking} />
              </div>
            </div>

          {/* Controls - Two Parallel Columns */}
          <div className="flex justify-center items-center py-6">
            <div className="flex space-x-6">

              {/* Left Column - Mic & Playback */}
              <div className="w-1/2 flex  justify-center items-center gap-3">
              {/* Microphone Toggle Button */}
              <div className="flex justify-center items-center">
                <button 
                  onClick={toggleMicrophone}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                    isMicOn 
                      ? 'bg-white text-light-lightPurple border-2 border-light-lightPurple' 
                      : 'bg-light-lightPurple text-white border-2 border-light-lightPurple'
                  }`}
                >
                  {isMicOn ? (
                    <PiMicrophoneBold className="w-8 h-8" />
                  ) : (
                    <PiMicrophoneSlashBold className="w-8 h-8" />
                  )}
                </button>
              </div>

              {/* Play/Pause Toggle Button */}
              <div className="flex justify-center items-center">
                <button 
                  onClick={togglePlayPause}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                    isPlaying 
                      ? 'bg-white text-light-lightPurple border-2 border-light-lightPurple' 
                      : 'bg-light-lightPurple text-white border-2 border-light-lightPurple'
                  }`}
                >
                  {isPlaying ? (
                    <PiPauseBold className="w-8 h-8" />
                  ) : (
                    <PiPlayFill className="w-8 h-8" />
                  )}
                </button>
              </div>
                {/* Recording Button */}
                {!conversationStarted && !isProcessing && (
                  <button 
                    onClick={startConversation}
                    className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors shadow-lg"
                  >
                    <Icon name="podcast" className="w-8 h-8" />
                  </button>
                )}

                {conversationStarted && !isRecording && !isProcessing && !isSpeaking && (
                  <button 
                    onClick={startRecording}
                    className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors shadow-lg"
                  >
                    <Icon name="mic" className="w-8 h-8" />
                  </button>
                )}

                {isRecording && !isPaused && !isProcessing && (
                  <button 
                    onClick={stopRecording}
                    className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white hover:bg-blue-600 transition-colors shadow-lg"
                  >
                    <Icon name="stop" className="w-8 h-8" />
                  </button>
                )}

                {isSpeaking && (
                  <button 
                    onClick={stopSpeaking}
                    className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center text-white hover:bg-yellow-600 transition-colors shadow-lg"
                  >
                    <Icon name="pause" className="w-8 h-8" />
                  </button>
                )}
              </div>

              {/* Right Column - Mute & Halt */}
              <div className="w-1/2 space-y-2">
                <button className=" bg-light-purple text-white px-6 py-2 rounded-3xl text-xl font-medium hover:bg-white hover:text-light-purple hover:border hover:border-light-purple transition-colors">
                  Mute AI
                </button>
                <button className="bg-red-500 text-white px-6 py-2 rounded-3xl text-xl font-medium hover:bg-white hover:border hover:border-red-500  hover:text-red-500 transition-colors">
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
            <div className="flex space-x-4">
              <button className="text-blue-600 border-b-2 border-blue-600 pb-2 text-sm font-medium">
                Transcript
              </button>
              <button className="text-gray-500 pb-2 text-sm font-medium hover:text-gray-700">
                Mal Popelat
              </button>
            </div>
            <button className="text-blue-600 text-sm font-medium hover:text-blue-800 flex items-center space-x-1">
              <span>Search</span>
              <Icon name="play" className="w-3 h-3 rotate-90" />
            </button>
          </div>
        </div>

        {/* Transcript Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {transcript.length === 0 ? (
            <div className="text-center text-gray-500 mt-16">
              <Icon name="podcast" className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">Ready to start conversation</p>
              <p className="text-xs">Your transcript will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transcript.map((entry, idx) => (
                <div key={idx} className="flex items-start space-x-2">
                  <div className="flex-shrink-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                      entry.speaker === "You" ? "bg-blue-500" : "bg-green-500"
                    }`}>
                      {entry.speaker === "You" ? "U" : "AI"}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-1 mb-1">
                      <span className="text-xs font-medium text-gray-700">
                        {entry.speaker === "You" ? "User" : "User. AI Agent"}
                      </span>
                      <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-gray-800 text-xs leading-relaxed">
                        {entry.isTyping ? (
                          <span>
                            {entry.text}
                            <span className="animate-pulse ml-1 text-blue-500">●</span>
                          </span>
                        ) : (
                          entry.text
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-1 text-xs text-gray-600">
              <input type="checkbox" className="rounded" />
              <span>Export Transcript</span>
            </label>
            <button className="bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-600 transition-colors flex items-center space-x-1">
              <Icon name="podcast" className="w-3 h-3" />
              <span>CarmSpeoids</span>
            </button>
          </div>
        </div>
      </div>
      </div>
      
      {/* LiveKit Audio Renderer */}
      <RoomAudioRenderer />
    </RoomContext.Provider>
  );
};

// LiveKit Participants Component
const LiveKitParticipants = () => {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.Microphone, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  return (
    <>
      {tracks.map((track) => (
        <div key={track.participant.identity} className="flex items-center space-x-4 p-3 bg-white/30 rounded-2xl backdrop-blur-sm border border-white/40 hover:bg-white/40 transition-all duration-300">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white shadow-lg">
            <span className="text-xs font-bold">{track.participant.identity?.charAt(0).toUpperCase() || 'U'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-800">{track.participant.identity || 'Participant'}</span>
            <span className="text-xs text-gray-600">LiveKit</span>
          </div>
          <div className="ml-auto">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      ))}
    </>
  );
};

export default NewPanelsRecording;
