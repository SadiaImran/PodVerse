import React, { useState, useEffect } from "react";
import { Upload, Video, Mic, FileText, Loader2, CheckCircle2, XCircle, Play, Download, Users, Search, Volume2, Image as ImageIcon, X } from "lucide-react";
import { getSupabaseAuthorizedtoken } from '../../supabaseClient';
import axios from 'axios';

function AvatarVideoGenerator() {
  const [avatars, setAvatars] = useState([]);
  const [voices, setVoices] = useState([]);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [avatarSearchQuery, setAvatarSearchQuery] = useState("");
  const [voiceSearchQuery, setVoiceSearchQuery] = useState("");
  const [voiceLanguageFilter, setVoiceLanguageFilter] = useState("All");
  const [loadingAvatars, setLoadingAvatars] = useState(false);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [inputText, setInputText] = useState("");
  const [videoId, setVideoId] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [playingAudio, setPlayingAudio] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState(null);
  const [isCustomAvatar, setIsCustomAvatar] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isCreatingAvatar, setIsCreatingAvatar] = useState(false);

  // Load avatars and voices on component mount
  useEffect(() => {
    loadAvatars();
    loadVoices();
  }, []);

  const loadAvatars = async () => {
    setLoadingAvatars(true);
    try {
      const token = await getSupabaseAuthorizedtoken();
      const response = await axios.get("http://localhost:8000/video/api/list-avatars", {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setAvatars(response.data.avatars);
      console.log(`Loaded ${response.data.total} avatars`);
    } catch (err) {
      console.error("Failed to load avatars:", err);
      setError("Failed to load avatars. Please check your API key.");
    } finally {
      setLoadingAvatars(false);
    }
  };

  const loadVoices = async () => {
    setLoadingVoices(true);
    try {
      const token = await getSupabaseAuthorizedtoken();
      const response = await axios.get("http://localhost:8000/video/api/list-voices", {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setVoices(response.data.voices);
      console.log(`Loaded ${response.data.total} voices`);
    } catch (err) {
      console.error("Failed to load voices:", err);
      setError("Failed to load voices. Please check your API key.");
    } finally {
      setLoadingVoices(false);
    }
  };

  const filteredAvatars = avatars.filter(avatar =>
    avatar.avatar_name.toLowerCase().includes(avatarSearchQuery.toLowerCase())
  );

  const filteredVoices = voices.filter(voice => {
    const matchesSearch = voice.name.toLowerCase().includes(voiceSearchQuery.toLowerCase()) ||
                         voice.language.toLowerCase().includes(voiceSearchQuery.toLowerCase());
    const matchesLanguage = voiceLanguageFilter === "All" || voice.language === voiceLanguageFilter;
    return matchesSearch && matchesLanguage;
  });

  const uniqueLanguages = ["All", ...new Set(voices.map(v => v.language))];

  const playVoicePreview = (audioUrl, voiceId) => {
    if (playingAudio === voiceId) {
      // Stop playing
      const audio = document.getElementById(`audio-${voiceId}`);
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      setPlayingAudio(null);
    } else {
      // Start playing
      const audio = document.getElementById(`audio-${voiceId}`);
      if (audio) {
        audio.play();
        setPlayingAudio(voiceId);
      }
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError("Please upload an image file");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedImagePreview(reader.result);
    };
    reader.readAsDataURL(file);

    setUploadedImage(file);
    setError("");
    setIsCustomAvatar(true);
    setSelectedAvatar(null); // Clear selected predefined avatar
  };

  const handleRemoveUploadedImage = () => {
    setUploadedImage(null);
    setUploadedImagePreview(null);
    setIsCustomAvatar(false);
    setSelectedAvatar(null);
  };

  const handleCreateCustomAvatar = async () => {
    if (!uploadedImage) {
      setError("Please upload an image first");
      return null;
    }

    setIsCreatingAvatar(true);
    setError("");

    try {
      const token = await getSupabaseAuthorizedtoken();

      // Step 1: Upload image
      const formData = new FormData();
      formData.append('file', uploadedImage);

      const uploadResponse = await axios.post(
        "http://localhost:8000/video/api/upload-image",
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const imageKey = uploadResponse.data.image_key;
      console.log("Image uploaded, image_key:", imageKey);

      // Step 2: Create photo avatar
      const avatarName = `Custom Avatar ${Date.now()}`;
      const createResponse = await axios.post(
        "http://localhost:8000/video/api/create-photo-avatar",
        {
          name: avatarName,
          image_key: imageKey
        },
        {
          headers: {
            "Content-Type": "application/json",
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const { avatar_id, preview_image_url } = createResponse.data;
      console.log("Photo avatar created, ID:", avatar_id);

      // Create avatar object
      const createdAvatar = {
        avatar_id: avatar_id,
        avatar_name: avatarName,
        preview_image_url: preview_image_url || uploadedImagePreview
      };

      // Set the created avatar as selected
      setSelectedAvatar(createdAvatar);
      setIsCustomAvatar(true);
      setIsCreatingAvatar(false);

      return createdAvatar;

    } catch (err) {
      console.error("Create avatar error:", err);
      setError(err.response?.data?.detail || "Error creating custom avatar");
      setIsCreatingAvatar(false);
      return null;
    }
  };

  const handleGenerate = async () => {
    let avatarToUse = selectedAvatar;

    // If custom avatar is selected but not yet created, create it first
    if (isCustomAvatar && uploadedImage && (!selectedAvatar || !selectedAvatar.avatar_id)) {
      avatarToUse = await handleCreateCustomAvatar();
      if (!avatarToUse) {
        // Error already handled in handleCreateCustomAvatar
        return;
      }
    }

    if (!avatarToUse || !selectedVoice || !inputText) {
      setError("Please select an avatar, voice, and enter text");
      return;
    }

    setIsLoading(true);
    setStatus("processing");
    setError("");
    
    try {
      const token = await getSupabaseAuthorizedtoken();
      const response = await axios.post("http://localhost:8000/video/api/generate-video", {
        avatar_id: avatarToUse.avatar_id,
        voice_id: selectedVoice.voice_id,
        input_text: inputText,
        is_custom_avatar: isCustomAvatar,
      }, {
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`
        }
      });

      const vid = response.data.video_id;
      setVideoId(vid);
      console.log("Video generation started:", vid);
      
      pollStatus(vid);
    } catch (err) {
      console.error("Generate error:", err);
      setError(err.response?.data?.detail || "Error generating video");
      setStatus("failed");
      setIsLoading(false);
    }
  };

  const pollStatus = async (vid) => {
    try {
      const token = await getSupabaseAuthorizedtoken();
      const response = await axios.get(`http://localhost:8000/video/api/video-status/${vid}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });
      const { status: videoStatus, video_url } = response.data;
      
      setStatus(videoStatus);

      if (videoStatus === "completed") {
        setVideoUrl(video_url);
        setIsLoading(false);
        setError("");
        console.log("Video completed:", video_url);
      } else if (videoStatus === "failed") {
        setIsLoading(false);
        setStatus("failed");
        setError("Video generation failed");
      } else {
        // Status check every 15 seconds (changed from 3 seconds)
        setTimeout(() => pollStatus(vid), 15000);
      }
    } catch (err) {
      console.error("Status check error:", err);
      setError("Error checking video status");
      setStatus("failed");
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (videoUrl) {
      try {
        const response = await axios.get(videoUrl, {
          responseType: "blob"
        });
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `avatar-video-${videoId}.mp4`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Download error:", err);
        setError("Failed to download video");
      }
    }
  };

  const getStatusIcon = () => {
    if (status === "completed") return <CheckCircle2 className="w-5 h-5 text-green-400" />;
    if (status === "failed") return <XCircle className="w-5 h-5 text-red-400" />;
    if (isLoading) return <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />;
    return null;
  };

  const getStatusText = () => {
    if (status === "processing" || status === "pending") return "Generating your video...";
    if (status === "completed") return "Video ready!";
    if (status === "failed") return "Generation failed";
    return "Ready to generate";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Video className="w-10 h-10" />
            Avatar Video Generator
          </h1>
          <p className="text-purple-200">Create AI-powered avatar videos using HeyGen's avatars and voices</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Avatar Selection */}
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-xl">
              <label className="flex items-center gap-2 text-white font-semibold mb-4">
                <Users className="w-5 h-5" />
                Select Avatar
              </label>

              {/* Upload Custom Photo Section */}
              <div className="mb-4 p-4 bg-purple-500/10 border border-purple-400/30 rounded-lg">
                <label className="flex items-center gap-2 text-purple-200 font-medium mb-2">
                  <ImageIcon className="w-4 h-4" />
                  Upload Your Photo
                </label>
                <p className="text-purple-300 text-xs mb-3">
                  Upload a front-facing portrait photo to create a custom avatar
                </p>
                
                {uploadedImagePreview ? (
                  <div className="relative">
                    <img 
                      src={uploadedImagePreview} 
                      alt="Uploaded preview" 
                      className="w-full h-32 object-cover rounded-lg mb-2"
                    />
                    <button
                      onClick={handleRemoveUploadedImage}
                      className="absolute top-2 right-2 p-1 bg-red-500/80 hover:bg-red-500 rounded-full text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {isCustomAvatar && !selectedAvatar?.avatar_id && (
                      <button
                        onClick={handleCreateCustomAvatar}
                        disabled={isCreatingAvatar}
                        className="w-full mt-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                      >
                        {isCreatingAvatar ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Creating Avatar...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            Create Avatar
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer bg-white/5 hover:bg-white/10 transition-all">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-purple-300" />
                      <p className="mb-2 text-sm text-purple-200">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-purple-300">PNG, JPG, JPEG (MAX. 10MB)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </label>
                )}
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-3 w-5 h-5 text-purple-300" />
                <input
                  type="text"
                  placeholder="Search avatars..."
                  value={avatarSearchQuery}
                  onChange={(e) => setAvatarSearchQuery(e.target.value)}
                  disabled={isCustomAvatar}
                  className="w-full pl-10 pr-4 py-2 bg-white/10 border border-purple-300 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className={`max-h-96 overflow-y-auto space-y-2 custom-scrollbar ${isCustomAvatar ? 'opacity-50' : ''}`}>
                {loadingAvatars ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                  </div>
                ) : filteredAvatars.length === 0 ? (
                  <p className="text-purple-300 text-center py-4">No avatars found</p>
                ) : (
                  filteredAvatars.map((avatar) => (
                    <div
                      key={avatar.avatar_id}
                      onClick={() => {
                        if (!isCustomAvatar) {
                          setSelectedAvatar(avatar);
                          setIsCustomAvatar(false);
                        }
                      }}
                      className={`rounded-lg p-3 transition-all ${
                        isCustomAvatar 
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'cursor-pointer hover:bg-white/10'
                      } ${
                        selectedAvatar?.avatar_id === avatar.avatar_id && !isCustomAvatar
                          ? 'bg-purple-500/40 border-2 border-purple-400'
                          : 'bg-white/5 border border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {avatar.preview_image_url && (
                          <img 
                            src={avatar.preview_image_url} 
                            alt={avatar.avatar_name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{avatar.avatar_name}</p>
                          {avatar.gender && (
                            <p className="text-purple-300 text-xs">{avatar.gender}</p>
                          )}
                        </div>
                        {selectedAvatar?.avatar_id === avatar.avatar_id && !isCustomAvatar && (
                          <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {selectedAvatar && (
                <div className="mt-4 bg-green-500/20 border border-green-400/50 rounded-lg p-3">
                  <p className="text-green-200 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Selected: {selectedAvatar.avatar_name}
                    {isCustomAvatar && <span className="text-xs text-green-300">(Custom)</span>}
                  </p>
                </div>
              )}
            </div>

            {/* Voice Selection */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-xl">
              <label className="flex items-center gap-2 text-white font-semibold mb-4">
                <Mic className="w-5 h-5" />
                Select Voice
              </label>
              
              <div className="space-y-3 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-purple-300" />
                  <input
                    type="text"
                    placeholder="Search voices..."
                    value={voiceSearchQuery}
                    onChange={(e) => setVoiceSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/10 border border-purple-300 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                
                <select
                  value={voiceLanguageFilter}
                  onChange={(e) => setVoiceLanguageFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-purple-300 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  {uniqueLanguages.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 custom-scrollbar">
                {loadingVoices ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                  </div>
                ) : filteredVoices.length === 0 ? (
                  <p className="text-purple-300 text-center py-4">No voices found</p>
                ) : (
                  filteredVoices.map((voice) => (
                    <div
                      key={voice.voice_id}
                      onClick={() => setSelectedVoice(voice)}
                      className={`cursor-pointer rounded-lg p-3 transition-all ${
                        selectedVoice?.voice_id === voice.voice_id
                          ? 'bg-purple-500/40 border-2 border-purple-400'
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{voice.name}</p>
                          <p className="text-purple-300 text-xs">{voice.language} • {voice.gender}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {voice.preview_audio && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playVoicePreview(voice.preview_audio, voice.voice_id);
                                }}
                                className="p-2 bg-purple-500/30 hover:bg-purple-500/50 rounded-lg transition-all"
                              >
                                <Volume2 className={`w-4 h-4 ${playingAudio === voice.voice_id ? 'text-green-400' : 'text-purple-300'}`} />
                              </button>
                              <audio
                                id={`audio-${voice.voice_id}`}
                                src={voice.preview_audio}
                                onEnded={() => setPlayingAudio(null)}
                              />
                            </>
                          )}
                          {selectedVoice?.voice_id === voice.voice_id && (
                            <CheckCircle2 className="w-5 h-5 text-purple-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {selectedVoice && (
                <div className="mt-4 bg-green-500/20 border border-green-400/50 rounded-lg p-3">
                  <p className="text-green-200 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Selected: {selectedVoice.name}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Middle Column - Configuration */}
          <div className="space-y-6">
            {/* Text Script */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-xl">
              <label className="flex items-center gap-2 text-white font-semibold mb-4">
                <FileText className="w-5 h-5" />
                Video Script
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter the text script for your avatar to speak..."
                className="w-full h-64 px-4 py-3 bg-white/10 border border-purple-300 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-none"
              />
              <p className="text-purple-300 text-sm mt-2">{inputText.length} characters</p>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isLoading || isCreatingAvatar || isUploadingImage || !selectedVoice || !inputText || (!selectedAvatar && !uploadedImage)}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 disabled:hover:scale-100 shadow-lg flex items-center justify-center gap-2"
            >
              {isLoading || isCreatingAvatar || isUploadingImage ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isCreatingAvatar ? "Creating Avatar..." : isUploadingImage ? "Uploading..." : "Generating..."}
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Generate Video
                </>
              )}
            </button>

            {error && (
              <div className="bg-red-500/20 border border-red-400 rounded-xl p-4 text-red-200">
                {error}
              </div>
            )}
          </div>

          {/* Right Column - Preview */}
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-xl">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Video className="w-5 h-5" />
                Generation Status
              </h3>
              <div className="flex items-center gap-3 bg-white/5 rounded-xl p-4">
                {getStatusIcon()}
                <span className="text-white font-medium">{getStatusText()}</span>
              </div>
              
              {isLoading && (
                <div className="mt-4">
                  <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-400 to-pink-400 h-full rounded-full animate-pulse w-full"></div>
                  </div>
                  <p className="text-purple-200 text-sm mt-2 text-center">
                    This may take a few minutes...
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-xl">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Play className="w-5 h-5" />
                Video Preview
              </h3>
              
              {videoUrl ? (
                <div className="space-y-4">
                  <div className="relative w-full rounded-xl overflow-hidden bg-black">
                    <video
                      src={videoUrl}
                      controls
                      className="w-full rounded-xl shadow-lg"
                      poster={selectedAvatar?.preview_image_url}
                      crossOrigin="anonymous"
                      preload="metadata"
                      onError={(e) => {
                        console.error("Video playback error:", e);
                        setError("Video playback failed. Please try downloading the video.");
                      }}
                      onLoadedData={() => {
                        console.log("Video loaded successfully");
                      }}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleDownload}
                      className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      Download Video
                    </button>
                    <a
                      href={videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Play className="w-5 h-5" />
                      Open in New Tab
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-purple-300 rounded-xl bg-white/5">
                  {selectedAvatar?.preview_image_url ? (
                    <div className="text-center">
                      <img 
                        src={selectedAvatar.preview_image_url} 
                        alt="Avatar preview"
                        className="w-32 h-32 rounded-xl object-cover mx-auto mb-3 opacity-60"
                      />
                      <p className="text-purple-200">Preview of selected avatar</p>
                      <p className="text-purple-300 text-sm mt-2">Configure settings and generate video</p>
                    </div>
                  ) : (
                    <>
                      <Video className="w-16 h-16 text-purple-300 mb-3" />
                      <p className="text-purple-200 text-center">Your generated video will appear here</p>
                      <p className="text-purple-300 text-sm mt-2">Select avatar, voice and generate</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(168, 85, 247, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.7);
        }
      `}</style>
    </div>
  );
}

export default AvatarVideoGenerator;