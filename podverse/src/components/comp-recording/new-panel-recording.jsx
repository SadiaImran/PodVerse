import React, { useState, useEffect, useRef } from "react";
import { useAuth } from '../../context/AuthContext';


const Icon = ({ name, className }) => {
  // Basic inline SVG icons, can add more if needed
  const icons = {
    play: (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
    pause: (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="6" y="4" width="4" height="16" />
        <rect x="14" y="4" width="4" height="16" />
      </svg>
    ),
    stop: (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="6" y="6" width="12" height="12" />
      </svg>
    ),
    restart: (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M1 4v6h6" />
        <path d="M3.51 15a7 7 0 0 0 13.58-2h4" />
      </svg>
    ),
    edit: (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
      </svg>
    ),
  };
  return icons[name] || null;
};

const silenceThreshold = 0.01; // Adjust based on mic sensitivity
const silenceDuration = 800; // milliseconds of silence to count as "pause"
let audioContext, sourceNode, processorNode, lastSoundTime = Date.now();
let mediaStream;




const TranscriptBubble = ({ speaker, text }) => (
  <div
    className={`mb-2 max-w-xs p-2 rounded-md flex flex-col ${
      speaker === "You" ? "bg-purple-200 self-end" : "bg-gray-200 self-start"
    }`}
  >
    <p className="text-xs font-semibold text-gray-700 mb-1">{speaker}</p>
    <p className="text-sm text-gray-900">{text}</p>
  </div>
);

const Waveform = ({ isRecording }) => {
  // Simple animated bars simulating waveform when recording
  return (
    <div className="flex space-x-1 h-12 items-center justify-center">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className={`w-1.5 bg-purple-600 rounded-sm origin-bottom animate-wave`}
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
};

const NewPanelsRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState([
    { speaker: "AI Guest", text: "Hello! Ready when you are." },
  ]);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const { userData } = useAuth();

 
  const sendChunkToBackend = async (chunkBlob) => {
    const formData = new FormData();
    formData.append("audio", chunkBlob, "chunk.wav");
    formData.append("user_id", userData._id.toString());
  
    try {
      const response = await fetch("http://localhost:8000/query_audio/", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
  
      if (data.query) {
        setTranscript((prev) => [
          ...prev,
          { speaker: "You", text: data.query }
        ]);
      }
  
      if (data.answer_text) {
        setTranscript((prev) => [
          ...prev,
          { speaker: "AI Guest", text: data.answer_text }
        ]);
      }
  
      if (data.audio_file_url) {
        setAudioUrl(data.audio_file_url);
      }
  
    } catch (err) {
      console.error("Error sending audio chunk:", err);
    }
  };
  
  const audioContextRef = useRef(null);
  const recorderRef = useRef(null);
  const gumStreamRef = useRef(null);
  
  const startRecording = async () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    gumStreamRef.current = stream;

    const input = audioContext.createMediaStreamSource(stream);

    // Silence detection setup (as above) here...

    const recorder = new window.Recorder(input, { numChannels: 1 });
    recorder.record();

    recorderRef.current = recorder;

    setIsRecording(true);
    setIsPaused(false);
  } catch (err) {
    console.error("Recording failed to start:", err);
  }
};

  
  const stopRecording = () => {
    const recorder = recorderRef.current;
    const gumStream = gumStreamRef.current;
  
    if (!recorder) {
      console.warn("Recorder is not initialized");
      return;
    }
  
    recorder.stop();
  
    if (gumStream) {
      gumStream.getTracks().forEach(track => track.stop());
    }
  
    recorder.exportWAV(async (blob) => {
      await sendChunkToBackend(blob);
    });
  
    setIsRecording(false);
    setIsPaused(false);
  };
  
  const pauseRecording = () => {
    const recorder = recorderRef.current;
    const gumStream = gumStreamRef.current;
  
    if (recorder && isRecording) {
      recorder.stop();
      if (gumStream) {
        gumStream.getTracks().forEach(track => track.stop());
      }
      setIsPaused(true);
    }
  };
  
  const resumeRecording = () => {
    // Resume by restarting a fresh recording session
    startRecording();
  };
  
  const restartRecording = () => {
    const recorder = recorderRef.current;
    const gumStream = gumStreamRef.current;
  
    if (recorder && isRecording) {
      recorder.stop();
      if (gumStream) {
        gumStream.getTracks().forEach(track => track.stop());
      }
      recorderRef.current = null;
      gumStreamRef.current = null;
    }
  
    setTranscript([
      { speaker: "AI Guest", text: "Hello! Ready when you are." }
    ]);
    setAudioUrl(null);
    setIsRecording(false);
    setIsPaused(false);
  };
  

  return (
    <div className="flex h-full divide-x divide-gray-300">
      {/* Transcript Section */}
      <div className="w-1/3 p-4 flex flex-col overflow-y-auto bg-gray-50 rounded-l-lg">
        <h2 className="font-semibold mb-4 text-lg">Transcript</h2>
        <div className="flex flex-col">
          {transcript.length === 0 && (
            <p className="text-gray-500 italic">Transcript will appear here...</p>
          )}
          {transcript.map((entry, idx) => (
            <TranscriptBubble key={idx} speaker={entry.speaker} text={entry.text} />
          ))}
        </div>
      </div>

      {/* Recording Controls Section */}
      <div className="w-2/3 p-8 flex flex-col justify-between bg-white rounded-r-lg">
        <div>
          <h2 className="font-semibold mb-6 text-lg text-center">Recording Studio</h2>

          <Waveform isRecording={isRecording && !isPaused} />

          <div className="flex justify-center space-x-4 mt-8">
            {!isRecording && (
              <button
                onClick={startRecording}
                className="flex items-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition"
              >
                <Icon name="play" className="w-5 h-5" />
                <span>Start</span>
              </button>
            )}

            {isRecording && !isPaused && (
              <>
                <button
                  onClick={pauseRecording}
                  className="flex items-center space-x-2 bg-yellow-500 text-white px-6 py-3 rounded-lg hover:bg-yellow-600 transition"
                >
                  <Icon name="pause" className="w-5 h-5" />
                  <span>Pause</span>
                </button>
                <button
                  onClick={stopRecording}
                  className="flex items-center space-x-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition"
                >
                  <Icon name="stop" className="w-5 h-5" />
                  <span>Stop</span>
                </button>
              </>
            )}

            {isRecording && isPaused && (
              <>
                <button
                  onClick={resumeRecording}
                  className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
                >
                  <Icon name="play" className="w-5 h-5" />
                  <span>Resume</span>
                </button>
                <button
                  onClick={stopRecording}
                  className="flex items-center space-x-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition"
                >
                  <Icon name="stop" className="w-5 h-5" />
                  <span>Stop</span>
                </button>
              </>
            )}

            <button
              onClick={restartRecording}
              className="flex items-center space-x-2 bg-gray-400 text-white px-6 py-3 rounded-lg hover:bg-gray-500 transition"
            >
              <Icon name="restart" className="w-5 h-5" />
              <span>Restart</span>
            </button>
          </div>

          {audioUrl && (
            <div className="mt-8 rounded border border-gray-300 p-3 bg-gray-50">
              <audio controls src={audioUrl} className="w-full rounded" />
            </div>
          )}
        </div>

        {/* Preview/Edit Button */}
        <div className="mt-8">
          <button
            disabled={!audioUrl}
            className={`w-full py-3 rounded font-semibold flex justify-center items-center space-x-2 transition ${
              audioUrl
                ? "bg-purple-600 text-white hover:bg-purple-700"
                : "bg-gray-300 text-gray-600 cursor-not-allowed"
            }`}
            onClick={() => alert("Preview/Edit feature coming soon!")}
          >
            <Icon name="edit" className="w-5 h-5" />
            <span>Preview & Edit</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewPanelsRecording;
