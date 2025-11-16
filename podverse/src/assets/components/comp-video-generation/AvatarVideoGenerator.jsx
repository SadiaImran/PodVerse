import React, { useState, useEffect } from "react";
import { Upload, Users, Mic, Loader2, CheckCircle2, XCircle, Video, Play, Image as ImageIcon } from "lucide-react";
import { getSupabaseAuthorizedtoken } from '../../supabaseClient';
import axios from 'axios';

function AvatarVideoGenerator() {
  const [avatars, setAvatars] = useState([]);
  const [voices, setVoices] = useState([]);
  const [loadingAvatars, setLoadingAvatars] = useState(false);
  const [loadingVoices, setLoadingVoices] = useState(false);
  
  const [audioFile, setAudioFile] = useState(null);
  const [audioFileName, setAudioFileName] = useState("");
  
  // Speaker A configuration
  const [speakerAAvatar, setSpeakerAAvatar] = useState(null);
  const [speakerAVoice, setSpeakerAVoice] = useState(null);
  const [speakerAUseCustom, setSpeakerAUseCustom] = useState(false);
  const [speakerAImageFile, setSpeakerAImageFile] = useState(null);
  const [speakerAImagePreview, setSpeakerAImagePreview] = useState(null);
  const [speakerAUploading, setSpeakerAUploading] = useState(false);
  const [speakerACustomAvatarId, setSpeakerACustomAvatarId] = useState(null);
  const [speakerAUseOriginalVoice, setSpeakerAUseOriginalVoice] = useState(true);
  
  // Speaker B configuration
  const [speakerBAvatar, setSpeakerBAvatar] = useState(null);
  const [speakerBVoice, setSpeakerBVoice] = useState(null);
  const [speakerBUseCustom, setSpeakerBUseCustom] = useState(false);
  const [speakerBImageFile, setSpeakerBImageFile] = useState(null);
  const [speakerBImagePreview, setSpeakerBImagePreview] = useState(null);
  const [speakerBUploading, setSpeakerBUploading] = useState(false);
  const [speakerBCustomAvatarId, setSpeakerBCustomAvatarId] = useState(null);
  const [speakerBUseOriginalVoice, setSpeakerBUseOriginalVoice] = useState(true);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAvatars();
    loadVoices();
  }, []);

  useEffect(() => {
    if (!jobId || !jobStatus) return;
    
    if (jobStatus.status === 'completed' || jobStatus.status === 'failed') {
      setIsProcessing(false);
      return;
    }

    const interval = setInterval(async () => {
      try {
        const token = await getSupabaseAuthorizedtoken();
        const response = await axios.get(
          `http://localhost:8000/video/api/podcast/job/${jobId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        setJobStatus(response.data);
        
        if (response.data.status === 'completed' || response.data.status === 'failed') {
          setIsProcessing(false);
        }
      } catch (err) {
        console.error('Failed to poll job status:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [jobId, jobStatus]);

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
      
      if (response.data.avatars.length >= 2) {
        setSpeakerAAvatar(response.data.avatars[0]);
        setSpeakerBAvatar(response.data.avatars[1]);
      }
    } catch (err) {
      console.error("Failed to load avatars:", err);
      setError("Failed to load avatars");
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
      
      const englishVoices = response.data.voices.filter(v => 
        v.language.toLowerCase().includes('english')
      );
      
      setVoices(englishVoices);
      
      // Don't auto-select voices anymore (optional)
    } catch (err) {
      console.error("Failed to load voices:", err);
      setError("Failed to load voices");
    } finally {
      setLoadingVoices(false);
    }
  };

  const handleAudioUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      setError("Please upload an audio file");
      return;
    }

    setAudioFile(file);
    setAudioFileName(file.name);
    setError("");
  };

  const handleImageUpload = (event, speaker) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError(`Please upload an image file for Speaker ${speaker}`);
      return;
    }

    const preview = URL.createObjectURL(file);
    
    if (speaker === 'A') {
      setSpeakerAImageFile(file);
      setSpeakerAImagePreview(preview);
    } else {
      setSpeakerBImageFile(file);
      setSpeakerBImagePreview(preview);
    }
    
    setError("");
  };

  const uploadCustomAvatar = async (speaker) => {
    const imageFile = speaker === 'A' ? speakerAImageFile : speakerBImageFile;
    const setUploading = speaker === 'A' ? setSpeakerAUploading : setSpeakerBUploading;
    const setCustomAvatarId = speaker === 'A' ? setSpeakerACustomAvatarId : setSpeakerBCustomAvatarId;

    if (!imageFile) {
      setError(`Please select an image for Speaker ${speaker}`);
      return;
    }

    setUploading(true);
    setError("");

    try {
      const token = await getSupabaseAuthorizedtoken();

      // Step 1: Upload image
      console.log(`📤 Uploading image for Speaker ${speaker}...`);
      const formData = new FormData();
      formData.append('file', imageFile);

      const uploadResponse = await axios.post(
        'http://localhost:8000/video/api/upload-image',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const imageKey = uploadResponse.data.image_key;
      console.log(`✅ Image uploaded, key: ${imageKey}`);

      // Step 2: Create photo avatar
      console.log(`🎭 Creating photo avatar for Speaker ${speaker}...`);
      const avatarResponse = await axios.post(
        'http://localhost:8000/video/api/create-photo-avatar',
        {
          name: `Podcast Speaker ${speaker} - ${Date.now()}`,
          image_key: imageKey
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const avatarId = avatarResponse.data.avatar_id;
      console.log(`✅ Photo avatar created: ${avatarId}`);

      setCustomAvatarId(avatarId);
      setError("");

    } catch (err) {
      console.error(`Upload error for Speaker ${speaker}:`, err);
      setError(err.response?.data?.detail || `Failed to upload custom avatar for Speaker ${speaker}`);
    } finally {
      setUploading(false);
    }
  };

  const handleProcess = async () => {
    if (!audioFile) {
      setError("Please upload an audio file");
      return;
    }

    // Validate Speaker A
    if (speakerAUseCustom) {
      if (!speakerACustomAvatarId) {
        setError("Please upload and create custom avatar for Speaker A");
        return;
      }
    } else if (!speakerAAvatar) {
      setError("Please select an avatar for Speaker A");
      return;
    }

    if (!speakerAUseOriginalVoice && !speakerAVoice) {
      setError("Please select a voice for Speaker A or use original voice");
      return;
    }

    // Validate Speaker B
    if (speakerBUseCustom) {
      if (!speakerBCustomAvatarId) {
        setError("Please upload and create custom avatar for Speaker B");
        return;
      }
    } else if (!speakerBAvatar) {
      setError("Please select an avatar for Speaker B");
      return;
    }

    if (!speakerBUseOriginalVoice && !speakerBVoice) {
      setError("Please select a voice for Speaker B or use original voice");
      return;
    }

    setIsProcessing(true);
    setError("");
    setJobStatus(null);

    try {
      const token = await getSupabaseAuthorizedtoken();
      
      const formData = new FormData();
      formData.append('audio_file', audioFile);
      
      // Speaker A configuration
      formData.append(
        'speaker_a_avatar', 
        speakerAUseCustom ? speakerACustomAvatarId : speakerAAvatar.avatar_id
      );
      formData.append('is_custom_avatar_a', speakerAUseCustom);
      formData.append('use_original_voice_a', speakerAUseOriginalVoice);
      if (!speakerAUseOriginalVoice && speakerAVoice) {
        formData.append('speaker_a_voice', speakerAVoice.voice_id);
      }
      
      // Speaker B configuration
      formData.append(
        'speaker_b_avatar',
        speakerBUseCustom ? speakerBCustomAvatarId : speakerBAvatar.avatar_id
      );
      formData.append('is_custom_avatar_b', speakerBUseCustom);
      formData.append('use_original_voice_b', speakerBUseOriginalVoice);
      if (!speakerBUseOriginalVoice && speakerBVoice) {
        formData.append('speaker_b_voice', speakerBVoice.voice_id);
      }

      console.log("📤 Uploading podcast for processing...");

      const response = await axios.post(
        'http://localhost:8000/video/api/podcast/process',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const { job_id } = response.data;
      setJobId(job_id);
      setJobStatus({
        job_id: job_id,
        status: 'pending',
        progress: 0,
        message: 'Starting...'
      });

      console.log("✅ Processing started:", job_id);
    } catch (err) {
      console.error("Process error:", err);
      setError(err.response?.data?.detail || "Failed to start processing");
      setIsProcessing(false);
    }
  };

  const getProgressColor = () => {
    if (!jobStatus) return 'bg-purple-400';
    if (jobStatus.status === 'completed') return 'bg-green-400';
    if (jobStatus.status === 'failed') return 'bg-red-400';
    return 'bg-purple-400';
  };

  const renderSpeakerConfig = (speaker, avatar, setAvatar, voice, setVoice, useCustom, setUseCustom, imageFile, imagePreview, uploading, customAvatarId, useOriginalVoice, setUseOriginalVoice, handleImageChange) => (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-xl">
      <label className="flex items-center gap-2 text-white font-semibold mb-4">
        <Users className="w-5 h-5" />
        Speaker {speaker} Configuration
      </label>

      {/* Toggle Custom Avatar */}
      <div className="mb-4 flex items-center gap-2">
        <input
          type="checkbox"
          id={`custom-${speaker}`}
          checked={useCustom}
          onChange={(e) => setUseCustom(e.target.checked)}
          className="w-4 h-4 rounded border-purple-300 text-purple-500 focus:ring-purple-400"
        />
        <label htmlFor={`custom-${speaker}`} className="text-purple-200 text-sm cursor-pointer">
          Use Custom Photo Avatar
        </label>
      </div>

      {useCustom ? (
        /* Custom Avatar Upload */
        <div className="space-y-4">
          <div>
            <label className="text-purple-200 text-sm mb-2 block">Upload Photo</label>
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt={`Speaker ${speaker}`}
                  className="w-full h-48 object-cover rounded-lg border-2 border-purple-400"
                />
                <button
                  onClick={() => {
                    if (speaker === 'A') {
                      setSpeakerAImageFile(null);
                      setSpeakerAImagePreview(null);
                      setSpeakerACustomAvatarId(null);
                    } else {
                      setSpeakerBImageFile(null);
                      setSpeakerBImagePreview(null);
                      setSpeakerBCustomAvatarId(null);
                    }
                  }}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer bg-white/5 hover:bg-white/10 transition-all">
                <ImageIcon className="w-8 h-8 mb-2 text-purple-300" />
                <p className="text-sm text-purple-200">Click to upload photo</p>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleImageChange(e, speaker)}
                />
              </label>
            )}
          </div>

          {imageFile && !customAvatarId && (
            <button
              onClick={() => uploadCustomAvatar(speaker)}
              disabled={uploading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Avatar...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Create Photo Avatar
                </>
              )}
            </button>
          )}

          {customAvatarId && (
            <div className="bg-green-500/20 border border-green-400/50 rounded-lg p-3">
              <p className="text-green-200 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Custom avatar ready!
              </p>
              <p className="text-green-300 text-xs mt-1">ID: {customAvatarId}</p>
            </div>
          )}
        </div>
      ) : (
        /* Standard Avatar Selection */
        <div className="mb-4">
          <label className="text-purple-200 text-sm mb-2 block">Avatar</label>
          <select
            value={avatar?.avatar_id || ""}
            onChange={(e) => {
              const selectedAvatar = avatars.find(a => a.avatar_id === e.target.value);
              setAvatar(selectedAvatar);
            }}
            className="w-full px-4 py-2 bg-white/10 border border-purple-300 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
            disabled={loadingAvatars}
          >
            <option value="">Select avatar...</option>
            {avatars.map(a => (
              <option key={a.avatar_id} value={a.avatar_id}>
                {a.avatar_name} {a.gender ? `(${a.gender})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Voice Selection (always shown) */}
      <div className="space-y-3">
        <label className="text-purple-200 text-sm mb-2 block">Voice</label>
        
        {/* Toggle Original Voice */}
        <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-400/30 rounded-lg p-3">
          <input
            type="checkbox"
            id={`original-voice-${speaker}`}
            checked={useOriginalVoice}
            onChange={(e) => setUseOriginalVoice(e.target.checked)}
            className="w-4 h-4 rounded border-blue-300 text-blue-500 focus:ring-blue-400"
          />
          <label htmlFor={`original-voice-${speaker}`} className="text-blue-200 text-sm cursor-pointer flex-1">
            🎤 Use original voice from audio
          </label>
        </div>

        {/* Voice Dropdown (only if not using original) */}
        {!useOriginalVoice && (
          <select
            value={voice?.voice_id || ""}
            onChange={(e) => {
              const selectedVoice = voices.find(v => v.voice_id === e.target.value);
              setVoice(selectedVoice);
            }}
            className="w-full px-4 py-2 bg-white/10 border border-purple-300 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
            disabled={loadingVoices}
          >
            <option value="">Select HeyGen voice...</option>
            {voices.map(v => (
              <option key={v.voice_id} value={v.voice_id}>
                {v.name} ({v.gender})
              </option>
            ))}
          </select>
        )}

        {!useOriginalVoice && (
          <p className="text-purple-300 text-xs">
            ℹ️ HeyGen voice will replace the original speaker's voice
          </p>
        )}
      </div>

      {/* Configuration Status */}
      {((useCustom && customAvatarId) || (!useCustom && avatar)) && (useOriginalVoice || voice) && (
        <div className="mt-4 bg-green-500/20 border border-green-400/50 rounded-lg p-3">
          <p className="text-green-200 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Speaker {speaker} configured
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Video className="w-10 h-10" />
            Podcast to Avatar Videos
          </h1>
          <p className="text-purple-200">
            Convert your podcast into lip-synced avatar videos with custom or preset avatars
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Audio Upload */}
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-xl">
              <label className="flex items-center gap-2 text-white font-semibold mb-4">
                <Upload className="w-5 h-5" />
                Upload Podcast Audio
              </label>

              <div className="mb-4">
                {audioFileName ? (
                  <div className="bg-green-500/20 border border-green-400/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      <span className="text-green-200 font-medium">File uploaded</span>
                    </div>
                    <p className="text-green-300 text-sm">{audioFileName}</p>
                    <button
                      onClick={() => {
                        setAudioFile(null);
                        setAudioFileName("");
                      }}
                      className="mt-2 text-red-300 hover:text-red-200 text-sm"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer bg-white/5 hover:bg-white/10 transition-all">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-purple-300" />
                      <p className="mb-2 text-sm text-purple-200">
                        <span className="font-semibold">Click to upload</span>
                      </p>
                      <p className="text-xs text-purple-300">WAV, MP3, or any audio format</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="audio/*"
                      onChange={handleAudioUpload}
                    />
                  </label>
                )}
              </div>

              <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-3">
                <p className="text-blue-200 text-sm">
                  ℹ️ <strong>Speaker Detection:</strong><br/>
                  AI automatically separates two speakers
                </p>
              </div>
            </div>
          </div>

          {/* Middle Column - Speaker Configuration */}
          <div className="space-y-6">
            {renderSpeakerConfig(
              'A',
              speakerAAvatar,
              setSpeakerAAvatar,
              speakerAVoice,
              setSpeakerAVoice,
              speakerAUseCustom,
              setSpeakerAUseCustom,
              speakerAImageFile,
              speakerAImagePreview,
              speakerAUploading,
              speakerACustomAvatarId,
              speakerAUseOriginalVoice,
              setSpeakerAUseOriginalVoice,
              handleImageUpload
            )}

            {renderSpeakerConfig(
              'B',
              speakerBAvatar,
              setSpeakerBAvatar,
              speakerBVoice,
              setSpeakerBVoice,
              speakerBUseCustom,
              setSpeakerBUseCustom,
              speakerBImageFile,
              speakerBImagePreview,
              speakerBUploading,
              speakerBCustomAvatarId,
              speakerBUseOriginalVoice,
              setSpeakerBUseOriginalVoice,
              handleImageUpload
            )}
          </div>

          {/* Right Column - Processing Status */}
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-xl">
              <button
                onClick={handleProcess}
                disabled={isProcessing || !audioFile}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Generate Avatar Videos
                  </>
                )}
              </button>

              {error && (
                <div className="mt-4 bg-red-500/20 border border-red-400 rounded-xl p-4 text-red-200">
                  {error}
                </div>
              )}
            </div>

            {jobStatus && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-xl">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  Processing Status
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-white/5 rounded-xl p-4">
                    {jobStatus.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                    {jobStatus.status === 'failed' && <XCircle className="w-5 h-5 text-red-400" />}
                    {(jobStatus.status === 'pending' || jobStatus.status === 'diarizing' || jobStatus.status === 'generating_videos') && (
                      <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                    )}
                    <div className="flex-1">
                      <p className="text-white font-medium">{jobStatus.message}</p>
                      <p className="text-purple-300 text-sm capitalize">{jobStatus.status}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm text-purple-200 mb-2">
                      <span>Progress</span>
                      <span>{jobStatus.progress}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div
                        className={`${getProgressColor()} h-full rounded-full transition-all duration-500`}
                        style={{ width: `${jobStatus.progress}%` }}
                      />
                    </div>
                  </div>

                  {jobStatus.status === 'completed' && (
                    <div className="space-y-4">
                        <h4 className="text-green-400 font-semibold">✅ Videos Ready!</h4>
                        
                        {/* Show merged video if available */}
                        {jobStatus.merged_video && (
                        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-4 border-2 border-purple-400">
                            <p className="text-white font-bold mb-2 flex items-center gap-2">
                            <Video className="w-5 h-5" />
                            🎙️ Dynamic Podcast Video
                            </p>
                            <video
                            src={jobStatus.merged_video}
                            controls
                            className="w-full rounded-lg"
                            />
                        </div>
                        )}
                        
                        {/* Individual videos */}
                        <details className="bg-white/5 rounded-lg p-3">
                        <summary className="text-white font-medium cursor-pointer">
                            View Individual Speaker Videos
                        </summary>
                        
                        <div className="mt-3 space-y-3">
                            {jobStatus.speaker_a_video && (
                            <div>
                                <p className="text-purple-200 text-sm mb-1">Speaker A</p>
                                <video src={jobStatus.speaker_a_video} controls className="w-full rounded-lg" />
                            </div>
                            )}
                            
                            {jobStatus.speaker_b_video && (
                            <div>
                                <p className="text-purple-200 text-sm mb-1">Speaker B</p>
                                <video src={jobStatus.speaker_b_video} controls className="w-full rounded-lg" />
                            </div>
                            )}
                        </div>
                        </details>
                    </div>
                    )}

                  {jobStatus.error && (
                    <div className="bg-red-500/20 border border-red-400 rounded-lg p-3">
                      <p className="text-red-200 text-sm">Error: {jobStatus.error}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-200 mb-2">ℹ️ How it works</h4>
              <ul className="text-yellow-200/80 text-sm space-y-1 list-disc list-inside">
                <li>Upload podcast audio</li>
                <li>AI separates two speakers</li>
                <li>Choose preset or custom avatars</li>
                <li>Use original voices or HeyGen TTS</li>
                <li>Get 2 lip-synced videos</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AvatarVideoGenerator;