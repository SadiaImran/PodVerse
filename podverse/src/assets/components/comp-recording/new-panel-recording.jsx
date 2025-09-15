import React, { useState, useRef, useEffect } from "react";
import { supabase } from "../../../connection_supabase_client";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";

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
    <div className="flex h-full divide-x divide-gray-200 bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Transcript Section */}
      <div className="w-1/3 p-6 flex flex-col overflow-y-auto bg-white/80 backdrop-blur-sm rounded-l-lg shadow-inner">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-xl text-gray-800">{showName}</h2>
          <div className="flex items-center space-x-2 text-sm">
            <Icon name="volume" className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500">{transcript.length} exchanges</span>
          </div>
        </div>
        
        <div className="flex flex-col space-y-2 flex-1">
          {transcript.map((entry, idx) => (
            <TranscriptBubble 
              key={idx} 
              speaker={entry.speaker} 
              text={entry.text}
              isTyping={entry.isTyping || false}
              isSpeaking={currentSpeakingIndex === idx}
            />
          ))}
          <div ref={transcriptEndRef} />
        </div>
      </div>

      {/* Controls Section */}
      <div className="w-2/3 p-8 flex flex-col justify-between bg-white rounded-r-lg">
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="font-bold text-2xl text-gray-800 mb-2">Podcast Studio</h2>
            <StatusIndicator 
              isRecording={isRecording && !isPaused} 
              isProcessing={isProcessing} 
              isSpeaking={isSpeaking}
              conversationStarted={conversationStarted}
            />
          </div>

          <Waveform isRecording={isRecording && !isPaused} isSpeaking={isSpeaking} />

          {/* Main Control Buttons */}
          <div className="flex justify-center space-x-4">
            {/* START PODCAST BUTTON */}
            {!conversationStarted && !isProcessing && (
              <button 
                onClick={startConversation} 
                className="flex items-center space-x-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-8 py-4 rounded-full hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Icon name="podcast" className="w-6 h-6" /> 
                <span className="font-medium">Start Podcast</span>
              </button>
            )}

            {/* RECORDING BUTTONS */}
            {conversationStarted && !isRecording && !isProcessing && !isSpeaking && (
              <button 
                onClick={startRecording} 
                className="flex items-center space-x-3 bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-4 rounded-full hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Icon name="mic" className="w-6 h-6" /> 
                <span className="font-medium">Record Response</span>
              </button>
            )}

            {isRecording && !isPaused && !isProcessing && (
              <>
                <button 
                  onClick={pauseRecording} 
                  className="flex items-center space-x-2 bg-yellow-500 text-white px-6 py-3 rounded-full hover:bg-yellow-600 transition-all duration-200 shadow-lg"
                >
                  <Icon name="pause" className="w-5 h-5" /> <span>Pause</span>
                </button>
                <button 
                  onClick={stopRecording} 
                  className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-full hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg"
                >
                  <Icon name="stop" className="w-5 h-5" /> <span>Send</span>
                </button>
              </>
            )}

            {isSpeaking && (
              <button 
                onClick={stopSpeaking} 
                className="flex items-center space-x-2 bg-red-500 text-white px-6 py-3 rounded-full hover:bg-red-600 transition-all duration-200 shadow-lg"
              >
                <Icon name="stop" className="w-5 h-5" /> <span>Stop Speaking</span>
              </button>
            )}
          </div>

          {/* Secondary Controls */}
          <div className="flex justify-center">
            <button 
              onClick={restartRecording} 
              disabled={isProcessing}
              className={`flex items-center space-x-2 px-6 py-2 rounded-full transition-all duration-200 ${
                isProcessing 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
              }`}
            >
              <Icon name="restart" className="w-4 h-4" /> <span>New Podcast</span>
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-700 font-medium mb-2">🎙️ Podcast Conversation Mode</p>
            <p className="text-xs text-blue-600">
              {!conversationStarted 
                ? SELECTED_AGENT === 'host' 
                  ? "Click 'Start Podcast' to begin with AI host introduction!"
                  : "Click 'Start Podcast' to begin - you'll speak first!"
                : "Continue the podcast conversation by recording your responses!"
              }
            </p>
            {/* Debug info - remove in production */}
            <p className="text-xs text-gray-500 mt-1">
              Current mode: {SELECTED_AGENT.toUpperCase()} (change SELECTED_AGENT variable to switch)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewPanelsRecording;