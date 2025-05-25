import { useState, useRef, useEffect } from "react";
import { Upload, X, Play, Pause, Mic, Square, Download, Save, FileAudio, Clock, RotateCcw } from "lucide-react";
import { IoMdArrowRoundBack } from "react-icons/io";
import { PiSpeakerHighBold } from "react-icons/pi";
import { HiOutlineUpload } from "react-icons/hi";
import { uploadToCloudinary } from "../../../utils/uploadToCloudinary";

// Recording Component
const VoiceRecorder = ({ onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingText, setRecordingText] = useState("Hello, this is a test recording for voice cloning. Please speak clearly and naturally.");
  
  const mediaRecorderRef = useRef(null);
  const audioRef = useRef(null);
  const timerRef = useRef(null);

  // Sample texts for user to read
  const sampleTexts = [
    "Hello, this is a test recording for voice cloning. Please speak clearly and naturally.",
    "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet.",
    "I love to read books and listen to music in my free time. Technology has changed our lives significantly.",
    "Good morning! How are you doing today? I hope you're having a wonderful time.",
    "Voice cloning technology allows us to create realistic synthetic speech from audio samples."
  ];

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setAudioBlob(blob);
        onRecordingComplete && onRecordingComplete(blob, recordingText);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Error accessing microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const playRecording = () => {
    if (audioBlob) {
      const audioUrl = URL.createObjectURL(audioBlob);
      audioRef.current = new Audio(audioUrl);
      
      audioRef.current.onended = () => {
        setIsPlaying(false);
      };
      
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const pauseRecording = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setRecordingTime(0);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const selectRandomText = () => {
    const randomIndex = Math.floor(Math.random() * sampleTexts.length);
    setRecordingText(sampleTexts[randomIndex]);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="flex items-center gap-2 mb-4">
        <Mic className="text-blue-600" size={20} />
        <h3 className="text-lg font-semibold text-gray-800">Voice Recorder</h3>
      </div>

      {/* Text to Read */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-gray-700">Text to Read:</label>
          <button
            onClick={selectRandomText}
            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
          >
            Random Text
          </button>
        </div>
        <textarea
          value={recordingText}
          onChange={(e) => setRecordingText(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
          placeholder="Enter text to read for recording..."
        />
      </div>

      {/* Recording Controls */}
      <div className="flex items-center justify-center gap-4 mb-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 bg-red-500 text-white px-6 py-3 rounded-full hover:bg-red-600 transition-colors shadow-lg hover:shadow-xl"
          >
            <Mic size={20} />
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 bg-gray-600 text-white px-6 py-3 rounded-full hover:bg-gray-700 transition-colors shadow-lg"
          >
            <Square size={20} />
            Stop Recording
          </button>
        )}

        {isRecording && (
          <div className="flex items-center gap-2 text-red-600 font-mono text-lg">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <Clock size={16} />
            {formatTime(recordingTime)}
          </div>
        )}
      </div>

      {/* Recording Preview */}
      {audioBlob && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Recording Preview</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Duration: {formatTime(recordingTime)}</span>
              <button
                onClick={resetRecording}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={isPlaying ? pauseRecording : playRecording}
              className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            
            <button
              onClick={resetRecording}
              className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <RotateCcw size={16} />
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// File Upload Component
const FileUploader = ({ uploadedFiles = [], setUploadedFiles, maxFiles = 10 }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [playingIndex, setPlayingIndex] = useState(null);
  const fileInputRef = useRef(null);
  const audioRef = useRef(null);

  const handleClick = () => {
    if (fileInputRef.current && uploadedFiles.length < maxFiles) {
      fileInputRef.current.click();
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files);
    }
  };

  const handleFileChange = (fileList) => {
    if (!fileList || fileList.length === 0) return;

    // Convert FileList to Array and filter audio files
    const audioFiles = Array.from(fileList).filter(file => {
      const isAudio = file.type.startsWith('audio/');
      const isValidSize = file.size <= 10 * 1024 * 1024;
      
      if (!isAudio) {
        alert(`${file.name} is not an audio file`);
      }
      if (!isValidSize) {
        alert(`${file.name} is too large (max 10MB)`);
      }
      
      return isAudio && isValidSize;
    });

    if (audioFiles.length === 0) return;

    // Create new file objects
    const newFiles = audioFiles.map(file => ({
      file,
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      url: URL.createObjectURL(file),
      name: file.name,
      type: 'upload'
    }));

    // Call the parent's setUploadedFiles function with the new files
    setUploadedFiles([...uploadedFiles, ...newFiles]);
  };

  const removeFile = (id, e) => {
    e.stopPropagation();
    
    const fileToRemove = uploadedFiles.find(file => file.id === id);
    setUploadedFiles(prev => prev.filter(file => file.id !== id));
    
    if (fileToRemove?.url) {
      URL.revokeObjectURL(fileToRemove.url);
    }
    
    if (playingIndex === id) {
      setPlayingIndex(null);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  };

  const togglePlay = (id, url, e) => {
    e.stopPropagation();
    
    if (playingIndex === id) {
      setPlayingIndex(null);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      setPlayingIndex(id);
      audioRef.current = new Audio(url);
      audioRef.current.play();
      
      audioRef.current.onended = () => {
        setPlayingIndex(null);
      };
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-br from-green-50 to-emerald-50">
      <div className="flex items-center gap-2 mb-4">
        <Upload className="text-green-600" size={20} />
        <h3 className="text-lg font-semibold text-gray-800">Upload Audio Files</h3>
      </div>

      <div 
        className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${
          isDragging ? 'border-green-500 bg-green-100' : 'border-gray-300 hover:border-green-400'
        } ${uploadedFiles.length >= maxFiles ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          multiple
          onChange={(e) => handleFileChange(e.target.files)}
          className="hidden"
        />
        
        <Upload className="text-gray-400 text-3xl mb-2" size={48} />
        <p className="text-gray-700 font-medium mb-1">
          {uploadedFiles.length >= maxFiles 
            ? `Maximum ${maxFiles} files reached` 
            : `Click to upload or drag and drop (${uploadedFiles.length}/${maxFiles})`}
        </p>
        <p className="text-sm text-gray-500">MP3, WAV, M4A (max. 10MB per file)</p>
      </div>
      
      {uploadedFiles.length > 0 && (
        <div className="mt-6">
          <h4 className="font-medium text-gray-700 mb-3">Uploaded Files ({uploadedFiles.length})</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {uploadedFiles.map((file) => (
              <div 
                key={file.id}
                className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  <button
                    onClick={(e) => togglePlay(file.id, file.url, e)}
                    className={`w-8 h-8 mr-3 rounded-full flex items-center justify-center ${
                      playingIndex === file.id ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
                    } hover:bg-green-500 hover:text-white transition-colors`}
                  >
                    {playingIndex === file.id ? <Pause size={12} /> : <Play size={12} />}
                  </button>
                  <div>
                    <p className="font-medium text-gray-800 flex items-center gap-2">
                      {file.type === 'recording' && <Mic size={14} className="text-red-500" />}
                      {file.file?.name || file.name || 'Recording'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {file.file ? (file.file.size / (1024 * 1024)).toFixed(2) + ' MB' : 'Audio Recording'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => removeFile(file.id, e)}
                  className="text-gray-500 hover:text-red-500 p-2 transition-colors"
                  aria-label="Remove file"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Voice Cloning Controls Component
const VoiceCloneControls = ({ uploadedFiles, onClone, canClone, onSaveVoice }) => {
  const [cloneText, setCloneText] = useState("This is a test for voice cloning.");
  const [clonedAudios, setClonedAudios] = useState([]);
  const [isCloning, setIsCloning] = useState(false);
  const [playingClone, setPlayingClone] = useState(null);
  const audioRef = useRef(null);

  const sampleTexts = [
    "This is a test for voice cloning.",
    "Hello, how are you doing today?",
    "The weather is beautiful outside.",
    "I enjoy listening to music and reading books.",
    "Technology has revolutionized our daily lives."
  ];

  const handleClone = async () => {
    if (!cloneText.trim()) {
      alert("Please enter text to clone!");
      return;
    }

    setIsCloning(true);
    
    try {
      // Check system status first
      const healthCheck = await fetch("http://localhost:5000/health");
      const status = await healthCheck.json();
      
      if (!status.status === "ready") {
        alert("System is still initializing. Please wait a moment and try again.");
        return;
      }

      // Continue with cloning
      const formDataToSend = new FormData();

      uploadedFiles.forEach(fileObj => {
        formDataToSend.append("file_upload", fileObj.file);
      });

      formDataToSend.append("text", cloneText);

      try {
        const endpoint = "http://localhost:5000/api/voice-clone/";
        const response = await fetch(endpoint, {
          method: "POST",
          body: formDataToSend,
        });

        if (response.ok) {
          const result = await response.json();
          console.log("Clone successful:", result);
          const audioURL = "http://localhost:5000" + result.output_audio;

          setClonedAudios(prev => [...prev, { text: cloneText, url: audioURL }]);

        } else {
          const errText = await response.text();
          console.error("Clone error response:", errText);
        }
        
      } catch (error) {
        console.error("Error in cloning:", error);
        alert(error.response?.data?.detail || "Error connecting to server");
      } finally {
        setIsCloning(false);
      }

    } catch (error) {
      console.error("Error in cloning:", error);
      alert(error.response?.data?.detail || "Error connecting to server");
      setIsCloning(false);
    }
  };

  const toggleClonePlay = (id, url) => {
    if (playingClone === id) {
      setPlayingClone(null);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      setPlayingClone(id);
      audioRef.current = new Audio(url);
      audioRef.current.play();
      
      audioRef.current.onended = () => {
        setPlayingClone(null);
      };
    }
  };

  const selectRandomText = () => {
    const randomIndex = Math.floor(Math.random() * sampleTexts.length);
    setCloneText(sampleTexts[randomIndex]);
  };

//   const uploadToCloudinary = async () => {
//   const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
//   const resourceType = 'auto';
//   const api = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

//   const uploadedUrls = [];

//   for (const fileObj of uploadedFiles) {
//     const data = new FormData();
//     data.append("file", fileObj.file);
//     data.append("upload_preset", "audios_preset");

//     try {
//       const res = await axios.post(api, data);
//       const { secure_url } = res.data;
//       console.log("Uploaded:", secure_url);
//       uploadedUrls.push(secure_url);
//     } catch (error) {
//       console.error("Cloudinary upload error:", error);
//     }
//   }

//   return uploadedUrls;
// };
//   const handleCheckFiles = async () => {
//   if (uploadedFiles.length === 0) {
//     alert("Please upload at least one voice sample!");
//     setCanClone(false);
//   } 
//   // else {
//   //   try {
//   //     const audioURLs = await uploadToCloudinary();
//   //     console.log("Uploaded to Cloudinary:", audioURLs);

//   //     const voicesPayload = audioURLs.map((url, index) => ({
//   //       name: `Matilda`,  
//   //       category: ["English", "American", "Female", "Informative", "Educational"],  
//   //       audioSrc: url,
//   //       description: "A professional woman with a pleasing alto pitch. Suitable for many use cases."
//   //     }));

//   //     console.log("Sending to backend:", voicesPayload);

//   //     const backendUrl = `${import.meta.env.VITE_BACKEND_BASEURL}/api/default-voices`;
//   //     const response = await axios.post(backendUrl, voicesPayload);
//   //     console.log("Backend response:", response.data);
      
//   //     setCanClone(true);
//   //     alert("Files uploaded successfully! You can now clone.");
//   //   } catch (error) {
//   //     console.error("Error during upload:", error);
//   //     if (error.response) {
//   //       console.error("Backend error response:", error.response.data);
//   //       console.error("Status:", error.response.status);
//   //       console.error("Headers:", error.response.headers);
//   //     } else if (error.request) {
//   //       console.error("No response received from server. Request:", error.request);
//   //     } else {
//   //       console.error("Error message:", error.message);
//   //     }
//   //     alert("Error uploading files. Please check console for details.");
//   //   }
//   // }
// };

  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="flex items-center gap-2 mb-4">
        <FileAudio className="text-purple-600" size={20} />
        <h3 className="text-lg font-semibold text-gray-800">Voice Cloning</h3>
      </div>

      {/* Clone Text Input */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-gray-700">Text to Clone:</label>
          <button
            onClick={selectRandomText}
            className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 transition-colors"
          >
            Random Text
          </button>
        </div>
        <textarea
          value={cloneText}
          onChange={(e) => setCloneText(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          rows={3}
          placeholder="Enter text to clone with your voice..."
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          // onClick={handleClone}
          onClick={async () => {
            try {
    const uploadedUrls = await uploadToCloudinary(uploadedFiles, "audios_preset"); // or videos_preset, etc.
    console.log("Uploaded:", uploadedUrls);
  } catch (error) {
    alert("Upload failed. See console.");
  }

          }}
          
          className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors 
            bg-purple-600 text-white hover:bg-purple-700"
          }`}
        >
              <FileAudio size={16} />
             Check Files
          
        </button>

        <button
          onClick={handleClone}
          disabled={uploadedFiles.length === 0}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
            uploadedFiles.length > 0
              ? "bg-light-purple text-white hover:bg-light-secondary"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          <Save size={16} />
          Clone Voice
        </button>
      </div>

      {/* Cloned Audio Results */}
      {clonedAudios.length > 0 && (
        <div>
          <h4 className="text-md font-semibold text-gray-800 mb-3">Cloned Voice Outputs</h4>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {clonedAudios.map((audio) => (
              <div key={audio.id} className="p-4 border border-gray-200 rounded-lg bg-white">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm text-gray-700 italic">"{audio.text}"</p>
                  <button
                    onClick={() => toggleClonePlay(audio.id, audio.url)}
                    className={`flex items-center gap-1 px-3 py-1 rounded text-sm ${
                      playingClone === audio.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    } transition-colors`}
                  >
                    {playingClone === audio.id ? <Pause size={14} /> : <Play size={14} />}
                    {playingClone === audio.id ? 'Pause' : 'Play'}
                  </button>
                </div>
                <audio controls className="w-full">
                  <source src={audio.url} type="audio/wav" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Files List Component
const FilesList = ({ files, onDelete }) => {
  return (
    <div className="mt-6 border border-gray-200 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Uploaded Files</h3>
      <div className="space-y-2">
        {files.map((file) => (
          <div 
            key={file.id}
            className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
          >
            <div className="flex items-center gap-2">
              {file.type === 'recording' ? (
                <Mic size={16} className="text-red-500" />
              ) : (
                <FileAudio size={16} className="text-blue-500" />
              )}
              <span className="text-sm">{file.name || 'Recording'}</span>
            </div>
            <button
              onClick={() => onDelete(file.id)}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// Main Component
const VoiceUploadSystem = ({ formData, setFormData, handleVoiceUpload }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]); // Initialize as empty array
  const [canClone, setCanClone] = useState(false);
  const [activeTab, setActiveTab] = useState('record');

  const handleRecordingComplete = (audioBlob, text) => {
    const recordingFile = {
      file: new File([audioBlob], `recording-${Date.now()}.wav`, { 
        type: 'audio/wav' 
      }),
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      url: URL.createObjectURL(audioBlob),
      name: 'Voice Recording',
      type: 'recording',
      text: text
    };
    
    setUploadedFiles(prev => [...prev, recordingFile]);
  };

  const handleSaveVoice = async () => {
    if (uploadedFiles.length === 0) {
      alert("Please upload or record at least one voice sample!");
      return;
    }

    try {
      console.log("Saving voice model with files:", uploadedFiles);
      alert("Voice model saved successfully!");
    } catch (error) {
      console.error("Error saving voice model:", error);
      alert("Error saving voice model. Please try again.");
    }
  };

  const handleDelete = (fileId) => {
    setUploadedFiles(prev => {
      const fileToDelete = prev.find(f => f.id === fileId);
      if (fileToDelete?.url) {
        URL.revokeObjectURL(fileToDelete.url);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  return (
    <div className="w-full max-w-6xl space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-light-purple font-subheadingDMSans mb-2">Voice Cloning Studio</h1>
        <p className="text-light-grey font-bodyRoboto">Record your voice or upload audio files to create a custom voice model</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-center">
        {/* Use Sample Voice */}
        <div
          onClick={() => setActiveTab('record')}
          className={`px-6 py-2 rounded-md transition-colors ${
            activeTab === 'record'
              ? 'border-2 border-blue-300 shadow-sm font-medium'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 text-blue-600 p-2 rounded-full">
              <Mic className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-medium text-lg">Record Voice</h4>
              <p className="text-gray-600 text-sm">Record just here.</p>
            </div>
          </div>
        </div>

        {/* Custom Upload */}
        <div
          onClick={() => setActiveTab('upload')}
          className={`px-6 py-2 rounded-md transition-colors ${
            activeTab === 'upload'
              ? 'border-2 border-green-200 shadow-sm font-medium'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 bg-green-100 text-green-600 p-2 rounded-full">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-medium text-lg">Upload Your Voice</h4>
              <p className="text-sm text-gray-500">Choose your own voice.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content based on active tab */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          {activeTab === 'record' ? (
            <VoiceRecorder onRecordingComplete={handleRecordingComplete} />
          ) : (
            <FileUploader 
              uploadedFiles={uploadedFiles}
              setUploadedFiles={setUploadedFiles} // Pass the setState function directly
              maxFiles={10}
            />
          )}
        </div>

        <div>
          <VoiceCloneControls
            uploadedFiles={uploadedFiles}
            canClone={canClone}
            onSaveVoice={handleSaveVoice}
          />
        </div>
      </div>

      {/* Files List */}
      {uploadedFiles.length > 0 && (
        <FilesList 
          files={uploadedFiles}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
};

export default VoiceUploadSystem;
