import React, { useState, useRef, useEffect } from "react";
import { supabase } from "../../../connection_supabase_client";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";

// Enhanced Icons for Sora-like interface
const Icon = ({ name, className }) => {
  const icons = {
    play: <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" /></svg>,
    pause: <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>,
    stop: <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" /></svg>,
    restart: <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 4v6h6" /><path d="M3.51 15a7 7 0 0 0 13.58-2h4" /></svg>,
    edit: <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>,
    mic: <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="23" /><line x1="8" x2="16" y1="23" y2="23" /></svg>,
    micOff: <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="23" /><line x1="8" x2="16" y1="23" y2="23" /><line x1="2" x2="22" y1="2" y2="22" /></svg>,
    volume: <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>,
    volumeOff: <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" x2="1" y1="9" y2="15" /></svg>,
    podcast: <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6"/><path d="m21 12-6-3-6 3-6-3"/></svg>,
    ai: <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6"/><path d="m21 12-6-3-6 3-6-3"/></svg>,
    live: <svg className={className} fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/></svg>,
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
  <div className="flex space-x-1 h-16 items-center justify-center p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl">
    {[...Array(25)].map((_, i) => (
      <div
        key={i}
        className={`w-1.5 rounded-full origin-bottom transition-all duration-300 ${
          isRecording ? 'bg-red-500 animate-wave' : 
          isSpeaking ? 'bg-green-500 animate-wave' : 
          'bg-gray-300'
        }`}
        style={{
          animationDelay: `${i * 0.08}s`,
          animationDuration: `${0.5 + (i % 4) * 0.2}s`,
          height: (isRecording || isSpeaking) ? `${8 + (i % 8) * 6}px` : "4px",
        }}
      />
    ))}
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
      <div className="flex items-center space-x-2 text-purple-600">
        <Icon name="podcast" className="w-4 h-4" />
        <span className="font-medium">Ready to start podcast</span>
      </div>
    );
  }
  if (isRecording) {
    return (
      <div className="flex items-center space-x-2 text-red-600">
        <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
        <span className="font-medium">Recording...</span>
      </div>
    );
  }
  if (isProcessing) {
    return (
      <div className="flex items-center space-x-2 text-blue-600">
        <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
        <span className="font-medium">Processing...</span>
      </div>
    );
  }
  if (isSpeaking) {
    return (
      <div className="flex items-center space-x-2 text-green-600">
        <div className="w-3 h-3 bg-green-600 rounded-full animate-pulse"></div>
        <span className="font-medium">AI Speaking...</span>
      </div>
    );
  }
  return (
    <div className="flex items-center space-x-2 text-gray-500">
      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
      <span className="font-medium">Your turn to speak</span>
    </div>
  );
};

const NewPanelsRecording = () => {
  // **HARDCODED AGENT SELECTION** - Change this to switch modes:
  const SELECTED_AGENT = 'guest'; // Change to 'guest' for different behavior
  
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
  
  // Mute controls
  const [isUserMuted, setIsUserMuted] = useState(false);
  const [isAIMuted, setIsAIMuted] = useState(false);
  
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

      const sessionData = await supabase.auth.getSession();
      const token = sessionData?.data?.session?.access_token;

      const formData = new FormData();
      formData.append("show_name", showName);
      formData.append("guest_name", guestName);
      formData.append("conversation_id", conversationId);

      const response = await fetch("http://localhost:8000/podcast/start/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Podcast started:", result);

        const hostMessageIndex = 0;
        setTranscript([
          { speaker: "AI", text: result.answer_text }
        ]);

        setConversationStarted(true);

        if (result.audio_data) {
          await playBase64Audio(result.audio_data, hostMessageIndex);
        } else {
          setTimeout(() => {
            fallbackToWebSpeech(result.answer_text, hostMessageIndex);
          }, 500);
        }

      } else {
        throw new Error(`Failed to start podcast: ${response.status}`);
      }

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
      // Check if AI is muted
      if (isAIMuted) {
        console.log("🔇 AI audio muted, skipping playback");
        return;
      }

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
    // Check if AI is muted
    if (isAIMuted) {
      console.log("🔇 AI audio muted, skipping speech synthesis");
      return;
    }

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

  // HOST MODE: Use podcast endpoints
  const handleHostMode = async (query, token) => {
    console.log("🤖 Getting HOST response for:", query);
    
    const thinkingIndex = transcript.length + 1;
    setTranscript((prev) => [
      ...prev,
      { speaker: "AI", text: "Let me think about that...", isTyping: true },
    ]);

    const podcastFormData = new FormData();
    podcastFormData.append("message", query);
    podcastFormData.append("persona", "host");
    podcastFormData.append("show_name", showName);
    podcastFormData.append("conversation_id", conversationId);
    podcastFormData.append("guest_name", guestName);
    podcastFormData.append("auto_duet", "false");

    const hostResponse = await fetch("http://localhost:8000/podcast/turn/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: podcastFormData
    });

    if (hostResponse.ok) {
      const hostResult = await hostResponse.json();
      console.log("✅ Host response received:", hostResult);

      const responseText = hostResult.answer_text || "[No response generated]";
      
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
      if (hostResult.audio_data) {
        console.log("🔊 Playing host TTS audio...");
        await playBase64Audio(hostResult.audio_data, thinkingIndex);
      } else {
        setTimeout(() => {
          fallbackToWebSpeech(responseText, thinkingIndex);
        }, 500);
      }

    } else {
      throw new Error(`Host response failed: ${hostResponse.status}`);
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
      // Check if user is muted
      if (isUserMuted) {
        console.log("🔇 User microphone is muted, cannot start recording");
        return;
      }

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

  return (
    <div className="flex h-full bg-gray-50 text-gray-800">
      {/* Left Panel - Real-time Transcription (Smaller) */}
      <div className="w-1/3 p-4 flex flex-col bg-white border-r border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <h2 className="font-semibold text-sm text-gray-800">LIVE TRANSCRIPTION</h2>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            <span>AI Active</span>
          </div>
        </div>
        
        {/* Real-time Transcription Display */}
        <div className="flex-1 bg-gray-50 rounded-lg p-3 border border-gray-200 overflow-y-auto">
          <div className="space-y-3">
            {/* Dummy Data */}
            <div className="flex justify-start">
              <div className="max-w-xs p-2 rounded-lg bg-purple-100 text-gray-800">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs font-medium opacity-70">AI AGENT</span>
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-purple-400 rounded-full animate-pulse"></div>
                    <div className="w-1 h-1 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-1 h-1 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                  </div>
                </div>
                <p className="text-xs leading-relaxed">Welcome to PodVerse! I'm your AI assistant. How can I help you today?</p>
              </div>
            </div>
            
            <div className="flex justify-end">
              <div className="max-w-xs p-2 rounded-lg bg-violet-100 text-gray-800">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs font-medium opacity-70">YOU</span>
                </div>
                <p className="text-xs leading-relaxed">Hi! Can you help me create a podcast about AI?</p>
              </div>
            </div>

            <div className="flex justify-start">
              <div className="max-w-xs p-2 rounded-lg bg-purple-100 text-gray-800">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs font-medium opacity-70">AI AGENT</span>
                </div>
                <p className="text-xs leading-relaxed">Absolutely! I'd love to help you create an AI podcast. What specific aspects of AI would you like to explore?</p>
              </div>
            </div>

            {/* Real transcript data */}
          {transcript.map((entry, idx) => (
              <div key={idx} className={`flex ${entry.speaker === "You" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-xs p-2 rounded-lg ${
                  entry.speaker === "You" 
                    ? "bg-violet-100 text-gray-800" 
                    : "bg-purple-100 text-gray-800"
                }`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs font-medium opacity-70">
                      {entry.speaker === "You" ? "YOU" : "AI AGENT"}
                    </span>
                    {currentSpeakingIndex === idx && (
                      <div className="flex space-x-1">
                        <div className={`w-1 h-1 rounded-full animate-pulse ${
                          entry.speaker === "You" ? "bg-violet-400" : "bg-purple-400"
                        }`}></div>
                        <div className={`w-1 h-1 rounded-full animate-pulse ${
                          entry.speaker === "You" ? "bg-violet-400" : "bg-purple-400"
                        }`} style={{animationDelay: '0.2s'}}></div>
                        <div className={`w-1 h-1 rounded-full animate-pulse ${
                          entry.speaker === "You" ? "bg-violet-400" : "bg-purple-400"
                        }`} style={{animationDelay: '0.4s'}}></div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed">
                    {entry.isTyping ? (
                      <span>
                        {entry.text}
                        <span className={`animate-pulse ml-1 ${
                          entry.speaker === "You" ? "text-violet-400" : "text-purple-400"
                        }`}>●</span>
                      </span>
                    ) : (
                      entry.text
                    )}
                  </p>
                </div>
              </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>
      </div>

        {/* Live Status */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <div className={`w-1.5 h-1.5 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-gray-600">Recording</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className={`w-1.5 h-1.5 rounded-full ${isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-gray-600">AI Speaking</span>
            </div>
          </div>
          <span className="text-gray-500">{transcript.length + 3} exchanges</span>
        </div>
          </div>

      {/* Right Panel - AI Agent Studio (Larger) */}
      <div className="w-2/3 p-6 flex flex-col bg-white">
        {/* Header with Connect/Disconnect */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-bold text-2xl text-gray-800 mb-1">AI Agent Studio</h1>
            <p className="text-gray-600 text-sm">Real-time conversation with AI</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              conversationStarted 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}>
              {conversationStarted ? 'Disconnect' : 'Connect'}
            </button>
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${conversationStarted ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-gray-600">{conversationStarted ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </div>

        {/* Dual Microphone Interface - Single Row with Gap */}
        <div className="flex-1 flex items-center justify-center space-x-24">
          {/* User Microphone */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${
                isRecording && !isUserMuted
                  ? 'border-violet-500 bg-violet-50 shadow-lg shadow-violet-200' 
                  : isUserMuted
                  ? 'border-gray-400 bg-gray-100'
                  : 'border-gray-300 bg-gray-50 hover:border-violet-400'
              }`}>
                <Icon name={isUserMuted ? "micOff" : "mic"} className={`w-6 h-6 ${
                  isRecording && !isUserMuted ? 'text-violet-500' : 
                  isUserMuted ? 'text-gray-400' : 'text-gray-600'
                }`} />
              </div>
              {isRecording && !isUserMuted && (
                <div className="absolute inset-0 rounded-full border-4 border-violet-500 animate-ping"></div>
              )}
              {isUserMuted && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
              )}
            </div>
            
            {/* Audio Visualization for User */}
            {isRecording && !isUserMuted && (
              <div className="flex space-x-1 h-8 items-center">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-violet-500 rounded-full animate-pulse"
                    style={{
                      animationDelay: `${i * 0.1}s`,
                      height: `${8 + (i % 3) * 4}px`,
                    }}
                  />
                ))}
              </div>
            )}
            
            <div className="text-center">
              <h3 className="font-semibold text-gray-800 mb-1">Your Voice</h3>
              <p className="text-xs text-gray-600 mb-2">
                {isUserMuted ? "Muted" : isRecording ? "Recording..." : "Click to speak"}
              </p>
              <button 
                onClick={() => setIsUserMuted(!isUserMuted)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                  isUserMuted 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {isUserMuted ? 'Unmute' : 'Mute'}
              </button>
            </div>
          </div>

          {/* AI Agent Microphone */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${
                isSpeaking && !isAIMuted
                  ? 'border-purple-500 bg-purple-50 shadow-lg shadow-purple-200' 
                  : isAIMuted
                  ? 'border-gray-400 bg-gray-100'
                  : 'border-gray-300 bg-gray-50'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isAIMuted 
                    ? 'bg-gray-400' 
                    : 'bg-gradient-to-br from-blue-400 to-purple-500'
                }`}>
                  <span className="text-white font-bold text-sm">AI</span>
                </div>
              </div>
              {isSpeaking && !isAIMuted && (
                <div className="absolute inset-0 rounded-full border-4 border-purple-500 animate-ping"></div>
              )}
              {isAIMuted && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <Icon name="volumeOff" className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </div>
            
            {/* Sora-like Bubble Animation for AI */}
            {isSpeaking && !isAIMuted && (
              <div className="relative">
                <div className="flex space-x-1 h-8 items-center">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-purple-500 rounded-full animate-pulse"
                      style={{
                        animationDelay: `${i * 0.1}s`,
                        height: `${8 + (i % 3) * 4}px`,
                      }}
                    />
                  ))}
                </div>
                {/* Sora-like bubble effect */}
                <div className="absolute -top-2 -left-2 w-6 h-6 bg-purple-200 rounded-full animate-ping opacity-75"></div>
                <div className="absolute -top-1 -left-1 w-4 h-4 bg-purple-300 rounded-full animate-ping opacity-50" style={{animationDelay: '0.5s'}}></div>
              </div>
            )}
            
            <div className="text-center">
              <h3 className="font-semibold text-gray-800 mb-1">AI Agent</h3>
              <p className="text-xs text-gray-600 mb-2">
                {isAIMuted ? "AI Halted" : isSpeaking ? "Speaking..." : "Listening"}
              </p>
              <button
                onClick={() => setIsAIMuted(!isAIMuted)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                  isAIMuted 
                    ? 'bg-orange-600 text-white hover:bg-orange-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {isAIMuted ? 'Resume AI' : 'Halt AI'}
              </button>
            </div>
          </div>
          </div>

        {/* Control Buttons - Only Start New AI */}
          <div className="flex justify-center">
            <button 
              onClick={restartRecording} 
              disabled={isProcessing}
            className={`px-8 py-3 rounded-xl transition-all duration-200 text-sm font-semibold ${
                isProcessing 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105'
              }`}
            >
            Start New AI
            </button>
        </div>

        {/* Status Bar */}
        <div className="mt-6 bg-gray-100 rounded-lg p-3 border border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${conversationStarted ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className="text-gray-600">Connected</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-gray-600">Processing</span>
              </div>
            </div>
            <span className="text-gray-500 text-xs">
              Mode: {SELECTED_AGENT.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewPanelsRecording;