import { useState, useRef, useEffect } from "react";
import { FaUpload, FaTimes, FaVolumeUp, FaPlay, FaPause } from "react-icons/fa";
import { IoArrowBackOutline } from "react-icons/io5";

const UploadVoices = ({ formData, setFormData, handleVoiceUpload }) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [playingIndex, setPlayingIndex] = useState(null);
  const audioRef = useRef(null);

  const MAX_FILES = 10;

  const handleClick = () => {
    if (fileInputRef.current && uploadedFiles.length < MAX_FILES) {
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
    
    // Filter for audio files only
    const audioFiles = Array.from(fileList).filter(file => 
      file.type.includes('audio/') && file.size <= 10 * 1024 * 1024
    );
    
    // Respect the maximum file limit
    const filesToAdd = audioFiles.slice(0, MAX_FILES - uploadedFiles.length);
    
    if (filesToAdd.length > 0) {
      const newFiles = filesToAdd.map(file => ({
        file,
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        url: URL.createObjectURL(file)
      }));
      
      setUploadedFiles(prev => [...prev, ...newFiles]);
      
      // Also update the formData to maintain compatibility
      if (setFormData) {
        setFormData(prev => ({
          ...prev,
          customVoiceFile: filesToAdd[0], // Keep the first file in customVoiceFile for compatibility
          allVoiceFiles: [...(prev.allVoiceFiles || []), ...filesToAdd]
        }));
      }
    }
  };

  const removeFile = (id, e) => {
    e.stopPropagation();
    
    // Find the file to remove
    const fileToRemove = uploadedFiles.find(file => file.id === id);
    
    // Update the uploadedFiles state
    setUploadedFiles(prev => prev.filter(file => file.id !== id));
    
    // Update formData
    if (setFormData) {
      setFormData(prev => {
        // If it's the file in customVoiceFile, reset it
        const isCustomFile = prev.customVoiceFile && 
          prev.customVoiceFile.name === fileToRemove.file.name && 
          prev.customVoiceFile.size === fileToRemove.file.size;
        
        return {
          ...prev,
          customVoiceFile: isCustomFile ? null : prev.customVoiceFile,
          allVoiceFiles: (prev.allVoiceFiles || []).filter(file => 
            !(file.name === fileToRemove.file.name && file.size === fileToRemove.file.size)
          )
        };
      });
    }
    
    // Revoke the object URL to avoid memory leaks
    URL.revokeObjectURL(fileToRemove.url);
    
    // Stop playing if this file was playing
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
      // If this file is currently playing, pause it
      setPlayingIndex(null);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    } else {
      // If another file is playing, stop it first
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      // Start playing this file
      setPlayingIndex(id);
      audioRef.current = new Audio(url);
      audioRef.current.play();
      
      // Set up event listener for when audio ends
      audioRef.current.onended = () => {
        setPlayingIndex(null);
      };
    }
  };

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      uploadedFiles.forEach(file => {
        URL.revokeObjectURL(file.url);
      });
      
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return (
    <div className="w-full bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-800 mb-4">Upload Voice Samples</h2>
      
      <div 
        className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${
          isDragging ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-purple-400'
        } ${uploadedFiles.length >= MAX_FILES ? 'opacity-50 cursor-not-allowed' : ''}`}
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
        
        <FaUpload className="text-gray-400 text-3xl mb-2" />
        <p className="text-gray-700 font-medium mb-1">
          {uploadedFiles.length >= MAX_FILES 
            ? `Maximum ${MAX_FILES} files reached` 
            : `Click to upload or drag and drop (${uploadedFiles.length}/${MAX_FILES})`}
        </p>
        <p className="text-sm text-gray-500">MP3 or WAV (max. 10MB per file)</p>
      </div>
      
      {uploadedFiles.length > 0 && (
        <div className="mt-6">
          <h3 className="font-medium text-gray-700 mb-3">Uploaded Voice Samples</h3>
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div 
                key={file.id}
                className="flex justify-between items-center p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center">
                  <button
                    onClick={(e) => togglePlay(file.id, file.url, e)}
                    className={`w-8 h-8 mr-3 rounded-full flex items-center justify-center ${
                      playingIndex === file.id ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'
                    } hover:bg-purple-500 hover:text-white transition-colors`}
                  >
                    {playingIndex === file.id ? <FaPause size={12} /> : <FaPlay size={12} className="ml-1" />}
                  </button>
                  <div>
                    <p className="font-medium text-gray-800">{file.file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => removeFile(file.id, e)}
                  className="text-gray-500 hover:text-red-500 p-2 transition-colors"
                  aria-label="Remove file"
                >
                  <FaTimes />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <p className="text-xs text-gray-500 mt-3">Supported formats: .mp3, .wav. Max size: 10MB per file.</p>
  
    </div>
  );
};

export default UploadVoices;