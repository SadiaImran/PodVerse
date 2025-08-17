import React, { useState, useRef } from "react";
import { supabase } from "../../../connection_supabase_client";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";

// Icons
const Icon = ({ name, className }) => {
  const icons = {
    play: <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" /></svg>,
    pause: <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>,
    stop: <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" /></svg>,
    restart: <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 4v6h6" /><path d="M3.51 15a7 7 0 0 0 13.58-2h4" /></svg>,
    edit: <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>,
  };
  return icons[name] || null;
};

// Transcript bubble
const TranscriptBubble = ({ speaker, text, isTyping = false }) => (
  <div className={`mb-2 max-w-xs p-2 rounded-md flex flex-col ${
    speaker === "You" ? "bg-purple-200 self-end" : "bg-gray-200 self-start"
  }`}>
    <p className="text-xs font-semibold text-gray-700 mb-1">{speaker}</p>
    <p className="text-sm text-gray-900">
      {isTyping ? (
        <span>
          {text}
          <span className="animate-pulse">●</span>
        </span>
      ) : (
        text
      )}
    </p>
  </div>
);

// Waveform animation
const Waveform = ({ isRecording }) => (
  <div className="flex space-x-1 h-12 items-center justify-center">
    {[...Array(20)].map((_, i) => (
      <div
        key={i}
        className="w-1.5 bg-purple-600 rounded-sm origin-bottom animate-wave"
        style={{
          animationDelay: `${i * 0.1}s`,
          animationDuration: `${0.6 + (i % 3) * 0.3}s`,
          height: isRecording ? `${5 + (i % 7) * 5}px` : "2px",
        }}
      />
    ))}
    <style>{`
      @keyframes wave {
        0%, 100% { transform: scaleY(0.4); }
        50% { transform: scaleY(1); }
      }
      .animate-wave {
        animation-name: wave;
        animation-iteration-count: infinite;
        animation-timing-function: ease-in-out;
      }
    `}</style>
  </div>
);

const NewPanelsRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState([
    { speaker: "AI Guest", text: "Hello! Ready when you are." },
  ]);

  const recorderRef = useRef(null);
  const gumStreamRef = useRef(null);
  const { user } = useAuth();

  const sendChunkToBackend = async (chunkBlob) => {
    try {
      setIsProcessing(true);
      
      // Step 1: Send audio and get transcribed text immediately
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

      const transcriptionResult = transcriptionResponse.data;
      console.log("✅ Transcription response:", transcriptionResult);

      // Immediately show the user's query
      if (transcriptionResult.query) {
        setTranscript((prev) => [
          ...prev,
          { speaker: "You", text: transcriptionResult.query },
        ]);

        // Step 2: Send the transcribed text to get AI response
        console.log("🤖 Getting AI response for:", transcriptionResult.query);
        
        // Add a "thinking" message
        setTranscript((prev) => [
          ...prev,
          { speaker: "AI Guest", text: "Thinking...", isTyping: true },
        ]);

        const responseFormData = new FormData();
        responseFormData.append("query", transcriptionResult.query);

        const aiResponse = await axios.post("http://localhost:8000/respond/", responseFormData, {
          headers: {
            Authorization: `Bearer ${token}`
          }  
        });

        const aiResult = aiResponse.data;
        console.log("✅ AI response:", aiResult);

        // Replace the "thinking" message with the actual response
        setTranscript((prev) => {
          const newTranscript = [...prev];
          // Remove the last "thinking" message
          if (newTranscript[newTranscript.length - 1].isTyping) {
            newTranscript.pop();
          }
          // Add the actual AI response
          newTranscript.push({
            speaker: "AI Guest",
            text: aiResult.answer_text || aiResult.error || "[No response generated]"
          });
          return newTranscript;
        });

      } else {
        // If no transcription, show error
        setTranscript((prev) => [
          ...prev,
          { speaker: "You", text: transcriptionResult.error || "[No speech detected]" },
          { speaker: "AI Guest", text: "I couldn't understand the audio. Please try again." },
        ]);
      }
      
    } catch (error) {
      console.error("❌ Error:", error.response?.data || error.message);
      
      // Remove any "thinking" message
      setTranscript((prev) => {
        const newTranscript = [...prev];
        if (newTranscript[newTranscript.length - 1]?.isTyping) {
          newTranscript.pop();
        }
        return newTranscript;
      });

      setTranscript((prev) => [
        ...prev,
        { speaker: "You", text: "[Recording Sent]" },
        { speaker: "AI Guest", text: "[Failed to process request]" },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

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
      resetRecorder(); // 🔄 clean state before new start
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
    setTranscript([{ speaker: "AI Guest", text: "Hello! Ready when you are." }]);
    setIsRecording(false);
    setIsPaused(false);
    setIsProcessing(false);
  };

  return (
    <div className="flex h-full divide-x divide-gray-300">
      {/* Transcript Section */}
      <div className="w-1/3 p-4 flex flex-col overflow-y-auto bg-gray-50 rounded-l-lg">
        <h2 className="font-semibold mb-4 text-lg">Transcript</h2>
        <div className="flex flex-col">
          {transcript.map((entry, idx) => (
            <TranscriptBubble 
              key={idx} 
              speaker={entry.speaker} 
              text={entry.text}
              isTyping={entry.isTyping || false}
            />
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="w-2/3 p-8 flex flex-col justify-between bg-white rounded-r-lg">
        <div>
          <h2 className="font-semibold mb-6 text-lg text-center">Recording Studio</h2>
          <Waveform isRecording={isRecording && !isPaused} />

          {/* Processing indicator */}
          {isProcessing && (
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600 animate-pulse">Processing your request...</p>
            </div>
          )}

          <div className="flex justify-center space-x-4 mt-8">
            {!isRecording && !isProcessing && (
              <button onClick={startRecording} className="flex items-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition">
                <Icon name="play" className="w-5 h-5" /> <span>Start</span>
              </button>
            )}

            {isRecording && !isPaused && !isProcessing && (
              <>
                <button onClick={pauseRecording} className="flex items-center space-x-2 bg-yellow-500 text-white px-6 py-3 rounded-lg hover:bg-yellow-600 transition">
                  <Icon name="pause" className="w-5 h-5" /> <span>Pause</span>
                </button>
                <button onClick={stopRecording} className="flex items-center space-x-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition">
                  <Icon name="stop" className="w-5 h-5" /> <span>Stop</span>
                </button>
              </>
            )}

            {isRecording && isPaused && !isProcessing && (
              <>
                <button onClick={resumeRecording} className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition">
                  <Icon name="play" className="w-5 h-5" /> <span>Resume</span>
                </button>
                <button onClick={stopRecording} className="flex items-center space-x-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition">
                  <Icon name="stop" className="w-5 h-5" /> <span>Stop</span>
                </button>
              </>
            )}

            <button 
              onClick={restartRecording} 
              disabled={isProcessing}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition ${
                isProcessing 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-gray-400 text-white hover:bg-gray-500'
              }`}
            >
              <Icon name="restart" className="w-5 h-5" /> <span>Restart</span>
            </button>
          </div>
        </div>

        <div className="mt-8">
          <button
            disabled
            className="w-full py-3 rounded font-semibold flex justify-center items-center space-x-2 bg-gray-300 text-gray-600 cursor-not-allowed"
          >
            <Icon name="edit" className="w-5 h-5" /> <span>Preview & Edit (Coming Soon)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewPanelsRecording;