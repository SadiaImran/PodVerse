import React, { useState, useEffect } from "react";
import { Upload, Users, Mic, Loader2, CheckCircle2, XCircle, Video, Play, Image as ImageIcon, Sparkles, Zap, ArrowRight, Info, Subtitles } from "lucide-react";
import { getSupabaseAuthorizedtoken } from '../../supabaseClient';
import axios from 'axios';

function AvatarVideoGenerator() {
  const [avatars, setAvatars] = useState([]);
  const [voices, setVoices] = useState([]);
  const [loadingAvatars, setLoadingAvatars] = useState(false);
  const [loadingVoices, setLoadingVoices] = useState(false);
  
  const [audioFile, setAudioFile] = useState(null);
  const [audioFileName, setAudioFileName] = useState("");
  
  // NEW: Subtitle toggle
  const [addSubtitles, setAddSubtitles] = useState(false);
  
  // Speaker A configuration
  const [speakerAAvatar, setSpeakerAAvatar] = useState(null);
  const [speakerAVoice, setSpeakerAVoice] = useState(null);
  const [speakerAUseCustom, setSpeakerAUseCustom] = useState(false);
  const [speakerAImageFile, setSpeakerAImageFile] = useState(null);
  const [speakerAImagePreview, setSpeakerAImagePreview] = useState(null);
  const [speakerAUploading, setSpeakerAUploading] = useState(false);
  const [speakerACustomAvatarId, setSpeakerACustomAvatarId] = useState(null);
  const [speakerAUseOriginalVoice, setSpeakerAUseOriginalVoice] = useState(true);
  const [speakerATemplates, setSpeakerATemplates] = useState([]);
  const [speakerASelectedTemplate, setSpeakerASelectedTemplate] = useState(null);
  const [loadingTemplatesA, setLoadingTemplatesA] = useState(false);
  
  // Speaker B configuration
  const [speakerBAvatar, setSpeakerBAvatar] = useState(null);
  const [speakerBVoice, setSpeakerBVoice] = useState(null);
  const [speakerBUseCustom, setSpeakerBUseCustom] = useState(false);
  const [speakerBImageFile, setSpeakerBImageFile] = useState(null);
  const [speakerBImagePreview, setSpeakerBImagePreview] = useState(null);
  const [speakerBUploading, setSpeakerBUploading] = useState(false);
  const [speakerBCustomAvatarId, setSpeakerBCustomAvatarId] = useState(null);
  const [speakerBUseOriginalVoice, setSpeakerBUseOriginalVoice] = useState(true);
  const [speakerBTemplates, setSpeakerBTemplates] = useState([]);
  const [speakerBSelectedTemplate, setSpeakerBSelectedTemplate] = useState(null);
  const [loadingTemplatesB, setLoadingTemplatesB] = useState(false);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAvatars();
    loadVoices();
    loadAvatarTemplates('A');
    loadAvatarTemplates('B');
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
    } catch (err) {
      console.error("Failed to load voices:", err);
      setError("Failed to load voices");
    } finally {
      setLoadingVoices(false);
    }
  };

  const loadAvatarTemplates = async (speaker) => {
    const setLoading = speaker === 'A' ? setLoadingTemplatesA : setLoadingTemplatesB;
    const setTemplates = speaker === 'A' ? setSpeakerATemplates : setSpeakerBTemplates;
    
    setLoading(true);
    try {
      const token = await getSupabaseAuthorizedtoken();
      const response = await axios.get(`http://localhost:8000/video/api/avatar-templates/${speaker}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setTemplates(response.data.templates);
      console.log(`✅ Loaded ${response.data.templates.length} templates for Speaker ${speaker}`);
    } catch (err) {
      console.error(`Failed to load templates for Speaker ${speaker}:`, err);
    } finally {
      setLoading(false);
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
    const selectedTemplate = speaker === 'A' ? speakerASelectedTemplate : speakerBSelectedTemplate;

    let fileToUpload = imageFile;
    
    if (!fileToUpload && selectedTemplate) {
      try {
        const response = await fetch(selectedTemplate.url);
        const blob = await response.blob();
        fileToUpload = new File([blob], `${selectedTemplate.id}.jpg`, { type: 'image/jpeg' });
      } catch (err) {
        setError(`Failed to load template image for Speaker ${speaker}`);
        return;
      }
    }

    if (!fileToUpload) {
      setError(`Please select an image or template for Speaker ${speaker}`);
      return;
    }

    setUploading(true);
    setError("");

    try {
      const token = await getSupabaseAuthorizedtoken();

      console.log(`📤 Uploading image for Speaker ${speaker}...`);
      const formData = new FormData();
      formData.append('file', fileToUpload);

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
      
      formData.append(
        'speaker_a_avatar', 
        speakerAUseCustom ? speakerACustomAvatarId : speakerAAvatar.avatar_id
      );
      formData.append('is_custom_avatar_a', speakerAUseCustom);
      formData.append('use_original_voice_a', speakerAUseOriginalVoice);
      if (!speakerAUseOriginalVoice && speakerAVoice) {
        formData.append('speaker_a_voice', speakerAVoice.voice_id);
      }
      
      formData.append(
        'speaker_b_avatar',
        speakerBUseCustom ? speakerBCustomAvatarId : speakerBAvatar.avatar_id
      );
      formData.append('is_custom_avatar_b', speakerBUseCustom);
      formData.append('use_original_voice_b', speakerBUseOriginalVoice);
      if (!speakerBUseOriginalVoice && speakerBVoice) {
        formData.append('speaker_b_voice', speakerBVoice.voice_id);
      }

      // NEW: Add subtitle flag
      formData.append('add_subtitles', addSubtitles);

      console.log("📤 Uploading podcast for processing...");
      console.log(`📝 Subtitles enabled: ${addSubtitles}`);

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
    if (!jobStatus) return 'bg-gradient-to-r from-purple-500 to-pink-500';
    if (jobStatus.status === 'completed') return 'bg-gradient-to-r from-green-400 to-emerald-500';
    if (jobStatus.status === 'failed') return 'bg-gradient-to-r from-red-400 to-rose-500';
    return 'bg-gradient-to-r from-purple-500 to-pink-500';
  };

  const renderSpeakerConfig = (
    speaker, 
    avatar, 
    setAvatar, 
    voice, 
    setVoice, 
    useCustom, 
    setUseCustom, 
    imageFile, 
    imagePreview, 
    uploading, 
    customAvatarId, 
    useOriginalVoice, 
    setUseOriginalVoice, 
    handleImageChange,
    templates,
    selectedTemplate,
    setSelectedTemplate,
    loadingTemplates
  ) => (
    <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-2xl hover:shadow-purple-500/20 transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl ${speaker === 'A' ? 'bg-gradient-to-br from-blue-500 to-cyan-500' : 'bg-gradient-to-br from-pink-500 to-rose-500'} flex items-center justify-center shadow-lg`}>
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-xl">Speaker {speaker}</h3>
            <p className="text-purple-200 text-sm">Configure avatar & voice</p>
          </div>
        </div>
      </div>

      {/* Toggle Custom Avatar */}
      <div className="mb-6">
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={useCustom}
              onChange={(e) => setUseCustom(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-white/20 rounded-full peer peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-pink-500 transition-all duration-300"></div>
            <div className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 peer-checked:translate-x-7 shadow-lg"></div>
          </div>
          <span className="text-white font-medium group-hover:text-purple-200 transition-colors">
            Use Custom Photo Avatar
          </span>
        </label>
      </div>

      {useCustom ? (
        /* Custom Avatar Upload */
        <div className="space-y-6">
          {/* Template Selection */}
          {templates.length > 0 && (
            <div>
              <label className="text-white font-semibold mb-3 block flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Choose from Templates
              </label>
              {loadingTemplates ? (
                <div className="flex items-center justify-center py-8 bg-white/5 rounded-2xl">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => {
                        setSelectedTemplate(template);
                        if (speaker === 'A') {
                          setSpeakerAImagePreview(template.url);
                          setSpeakerAImageFile(null);
                          setSpeakerACustomAvatarId(null);
                        } else {
                          setSpeakerBImagePreview(template.url);
                          setSpeakerBImageFile(null);
                          setSpeakerBCustomAvatarId(null);
                        }
                      }}
                      className={`cursor-pointer rounded-2xl overflow-hidden border-3 transition-all duration-300 transform hover:scale-105 ${
                        selectedTemplate?.id === template.id
                          ? 'border-purple-400 ring-4 ring-purple-300/50 shadow-xl shadow-purple-500/50'
                          : 'border-white/20 hover:border-purple-300/60'
                      }`}
                    >
                      <img
                        src={template.url}
                        alt={`Template ${template.id}`}
                        className="w-full h-24 object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 text-purple-300 text-sm mb-3">
                <ArrowRight className="w-4 h-4" />
                <span>Or upload your own photo:</span>
              </div>
            </div>
          )}
          
          <div>
            <label className="text-white font-semibold mb-3 block flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Upload Custom Photo
            </label>
            {imagePreview ? (
              <div className="relative group">
                <img
                  src={imagePreview}
                  alt={`Speaker ${speaker}`}
                  className="w-full h-56 object-cover rounded-2xl border-3 border-purple-400 shadow-2xl"
                />
                <button
                  onClick={() => {
                    if (speaker === 'A') {
                      setSpeakerAImageFile(null);
                      setSpeakerAImagePreview(null);
                      setSpeakerACustomAvatarId(null);
                      setSpeakerASelectedTemplate(null);
                    } else {
                      setSpeakerBImageFile(null);
                      setSpeakerBImagePreview(null);
                      setSpeakerBCustomAvatarId(null);
                      setSpeakerBSelectedTemplate(null);
                    }
                  }}
                  className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white p-2.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 transform hover:scale-110"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-40 border-3 border-dashed border-purple-300/50 rounded-2xl cursor-pointer bg-white/5 hover:bg-white/10 hover:border-purple-400 transition-all duration-300 group">
                <ImageIcon className="w-12 h-12 mb-3 text-purple-300 group-hover:text-purple-200 transition-colors" />
                <p className="text-base font-medium text-purple-200 group-hover:text-white transition-colors">Click to upload photo</p>
                <p className="text-sm text-purple-300 mt-1">PNG, JPG or JPEG</p>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    handleImageChange(e, speaker);
                    if (speaker === 'A') {
                      setSpeakerASelectedTemplate(null);
                    } else {
                      setSpeakerBSelectedTemplate(null);
                    }
                  }}
                />
              </label>
            )}
          </div>

          {(imageFile || selectedTemplate) && !customAvatarId && (
            <button
              onClick={() => uploadCustomAvatar(speaker)}
              disabled={uploading}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:transform-none"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Avatar...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Create Photo Avatar
                </>
              )}
            </button>
          )}

          {customAvatarId && (
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-400/60 rounded-2xl p-4 backdrop-blur-sm">
              <p className="text-green-200 font-semibold flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5" />
                Custom avatar ready!
              </p>
              <p className="text-green-300 text-sm font-mono">ID: {customAvatarId}</p>
            </div>
          )}
        </div>
      ) : (
        /* Standard Avatar Selection */
        <div className="mb-6">
          <label className="text-white font-semibold mb-3 block flex items-center gap-2">
            <Users className="w-4 h-4" />
            Select Avatar
          </label>
          <select
            value={avatar?.avatar_id || ""}
            onChange={(e) => {
              const selectedAvatar = avatars.find(a => a.avatar_id === e.target.value);
              setAvatar(selectedAvatar);
            }}
            className="w-full px-5 py-4 bg-white/10 border-2 border-purple-300/50 rounded-2xl text-white font-medium focus:outline-none focus:ring-4 focus:ring-purple-400/50 focus:border-purple-400 transition-all duration-300 backdrop-blur-sm hover:bg-white/15"
            disabled={loadingAvatars}
          >
            <option value="">Select avatar...</option>
            {avatars.map(a => (
              <option key={a.avatar_id} value={a.avatar_id} className="bg-gray-800">
                {a.avatar_name} {a.gender ? `(${a.gender})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Voice Selection */}
      <div className="space-y-4 mt-6">
        <label className="text-white font-semibold mb-3 block flex items-center gap-2">
          <Mic className="w-4 h-4" />
          Voice Settings
        </label>
        
        {/* Toggle Original Voice */}
        <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-2 border-blue-400/40 rounded-2xl p-4 backdrop-blur-sm">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={useOriginalVoice}
                onChange={(e) => setUseOriginalVoice(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-white/20 rounded-full peer peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-cyan-500 transition-all duration-300"></div>
              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-all duration-300 peer-checked:translate-x-6 shadow-md"></div>
            </div>
            <span className="text-blue-100 font-medium flex items-center gap-2 group-hover:text-white transition-colors">
              🎤 Use original voice from audio
            </span>
          </label>
        </div>

        {/* Voice Dropdown */}
        {!useOriginalVoice && (
          <div className="space-y-3">
            <select
              value={voice?.voice_id || ""}
              onChange={(e) => {
                const selectedVoice = voices.find(v => v.voice_id === e.target.value);
                setVoice(selectedVoice);
              }}
              className="w-full px-5 py-4 bg-white/10 border-2 border-purple-300/50 rounded-2xl text-white font-medium focus:outline-none focus:ring-4 focus:ring-purple-400/50 focus:border-purple-400 transition-all duration-300 backdrop-blur-sm hover:bg-white/15"
              disabled={loadingVoices}
            >
              <option value="">Select HeyGen voice...</option>
              {voices.map(v => (
                <option key={v.voice_id} value={v.voice_id} className="bg-gray-800">
                  {v.name} ({v.gender})
                </option>
              ))}
            </select>
            <div className="flex items-start gap-2 text-purple-300 text-sm bg-purple-500/10 rounded-xl p-3 border border-purple-400/20">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>HeyGen voice will replace the original speaker's voice</p>
            </div>
          </div>
        )}
      </div>

      {/* Configuration Status */}
      {((useCustom && customAvatarId) || (!useCustom && avatar)) && (useOriginalVoice || voice) && (
        <div className="mt-6 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-400/60 rounded-2xl p-4 backdrop-blur-sm animate-pulse">
          <p className="text-green-200 font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Speaker {speaker} configured successfully!
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-pink-900 p-8">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center gap-3 mb-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-lg border border-white/20 rounded-full px-6 py-3">
            <Sparkles className="w-5 h-5 text-yellow-300" />
            <span className="text-purple-200 font-semibold">AI-Powered Video Generation</span>
          </div>
          <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-pink-200 mb-4 flex items-center justify-center gap-4">
            <Video className="w-14 h-14 text-white drop-shadow-lg" />
            Podcast to Avatar Videos
          </h1>
          <p className="text-xl text-purple-200 max-w-3xl mx-auto leading-relaxed">
            Transform your podcast into stunning lip-synced avatar videos with AI-powered speaker separation and voice cloning
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid xl:grid-cols-[400px_1fr_450px] gap-8">
          {/* Left Column - Audio Upload */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-2xl hover:shadow-purple-500/20 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-xl">Audio Upload</h3>
                  <p className="text-purple-200 text-sm">Your podcast file</p>
                </div>
              </div>

              <div className="mb-6">
                {audioFileName ? (
                  <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-400/60 rounded-2xl p-6 backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <CheckCircle2 className="w-6 h-6 text-green-400" />
                      <span className="text-green-200 font-bold text-lg">File uploaded!</span>
                    </div>
                    <p className="text-green-100 font-medium mb-4 break-all">{audioFileName}</p>
                    <button
                      onClick={() => {
                        setAudioFile(null);
                        setAudioFileName("");
                      }}
                      className="text-red-300 hover:text-red-200 font-semibold flex items-center gap-2 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Remove file
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-48 border-3 border-dashed border-purple-300/50 rounded-2xl cursor-pointer bg-white/5 hover:bg-white/10 hover:border-purple-400 transition-all duration-300 group">
                    <div className="flex flex-col items-center justify-center">
                      <Upload className="w-16 h-16 mb-4 text-purple-300 group-hover:text-purple-200 transition-colors" />
                      <p className="mb-2 text-lg font-bold text-purple-200 group-hover:text-white transition-colors">
                        Click to upload
                      </p>
                      <p className="text-sm text-purple-300">WAV, MP3, or any audio format</p>
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

              <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-2 border-blue-400/40 rounded-2xl p-5 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-300 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-blue-200 font-semibold mb-1">Speaker Detection</p>
                    <p className="text-blue-200 text-sm">AI automatically separates two speakers from your audio</p>
                  </div>
                </div>
              </div>
            </div>

            {/* NEW: Subtitle Toggle Card */}
            <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-2xl hover:shadow-purple-500/20 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                  <Subtitles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-xl">Subtitles</h3>
                  <p className="text-purple-200 text-sm">Add captions to video</p>
                </div>
              </div>

              <label className="flex items-center gap-4 cursor-pointer group bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-2 border-amber-400/40 rounded-2xl p-5 hover:border-amber-400/60 transition-all duration-300">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={addSubtitles}
                    onChange={(e) => setAddSubtitles(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-16 h-8 bg-white/20 rounded-full peer peer-checked:bg-gradient-to-r peer-checked:from-amber-500 peer-checked:to-orange-500 transition-all duration-300"></div>
                  <div className="absolute left-1 top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 peer-checked:translate-x-8 shadow-lg"></div>
                </div>
                <div className="flex-1">
                  <span className="text-white font-bold text-lg block group-hover:text-amber-100 transition-colors">
                    Add Subtitles/Captions
                  </span>
                  <span className="text-purple-300 text-sm">
                    {addSubtitles ? "Subtitles will be burned into video" : "No subtitles"}
                  </span>
                </div>
              </label>

              {addSubtitles && (
                <div className="mt-4 bg-amber-500/20 border-2 border-amber-400/60 rounded-xl p-4">
                  <p className="text-amber-100 text-sm flex items-start gap-2">
                    <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Subtitles will be auto-generated from speaker transcription and burned into the final video</span>
                  </p>
                </div>
              )}
            </div>

            {/* How it Works */}
            <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-2 border-yellow-400/40 rounded-2xl p-6 backdrop-blur-sm">
              <h4 className="font-bold text-yellow-200 mb-4 flex items-center gap-2 text-lg">
                <Sparkles className="w-5 h-5" />
                How it works
              </h4>
              <ul className="space-y-3">
                {[
                  "Upload your podcast audio file",
                  "AI separates two speakers automatically",
                  "Choose preset or custom avatars",
                  "Use original voices or HeyGen TTS",
                  "Optionally add burned-in subtitles",
                  "Get lip-synced videos for each speaker"
                ].map((step, index) => (
                  <li key={index} className="flex items-start gap-3 text-yellow-200/90">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-400/20 text-yellow-300 font-bold text-sm flex-shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <span className="text-sm leading-relaxed">{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Middle Column - Speaker Configuration */}
          <div className="space-y-8">
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
              handleImageUpload,
              speakerATemplates,
              speakerASelectedTemplate,
              setSpeakerASelectedTemplate,
              loadingTemplatesA
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
              handleImageUpload,
              speakerBTemplates,
              speakerBSelectedTemplate,
              setSpeakerBSelectedTemplate,
              loadingTemplatesB
            )}
          </div>

          {/* Right Column - Processing */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-2xl sticky top-6">
              <button
                onClick={handleProcess}
                disabled={isProcessing || !audioFile}
                className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 hover:from-purple-600 hover:via-pink-600 hover:to-rose-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-5 px-8 rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 shadow-2xl hover:shadow-purple-500/50 transform hover:scale-105 disabled:transform-none text-lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6" />
                    Generate Avatar Videos
                  </>
                )}
              </button>

              {error && (
                <div className="mt-6 bg-gradient-to-r from-red-500/20 to-rose-500/20 border-2 border-red-400 rounded-2xl p-5 text-red-200 backdrop-blur-sm">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p className="font-medium">{error}</p>
                  </div>
                </div>
              )}
            </div>

            {jobStatus && (
              <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-2xl">
                <h3 className="text-white font-bold mb-6 flex items-center gap-3 text-xl">
                  <Video className="w-6 h-6" />
                  Processing Status
                </h3>

                <div className="space-y-6">
                  <div className="flex items-center gap-4 bg-white/10 rounded-2xl p-5 backdrop-blur-sm border border-white/20">
                    {jobStatus.status === 'completed' && <CheckCircle2 className="w-7 h-7 text-green-400 flex-shrink-0" />}
                    {jobStatus.status === 'failed' && <XCircle className="w-7 h-7 text-red-400 flex-shrink-0" />}
                    {(jobStatus.status === 'pending' || jobStatus.status === 'diarizing' || jobStatus.status === 'generating_videos') && (
                      <Loader2 className="w-7 h-7 text-purple-400 animate-spin flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-white font-bold text-lg">{jobStatus.message}</p>
                      <p className="text-purple-300 text-sm capitalize mt-1">{jobStatus.status}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm text-purple-200 mb-3 font-semibold">
                      <span>Progress</span>
                      <span>{jobStatus.progress}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden shadow-inner">
                      <div
                        className={`${getProgressColor()} h-full rounded-full transition-all duration-500 shadow-lg`}
                        style={{ width: `${jobStatus.progress}%` }}
                      />
                    </div>
                  </div>

                  {jobStatus.status === 'completed' && (
                    <div className="space-y-5">
                      <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-400/60 rounded-2xl p-4">
                        <h4 className="text-green-200 font-bold text-lg flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5" />
                          Videos Ready!
                        </h4>
                      </div>
                        
                      {/* Merged Video */}
                      {jobStatus.merged_video_url && (
                        <div className="bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-rose-500/20 rounded-2xl p-6 border-2 border-purple-400/60 backdrop-blur-sm">
                          <p className="text-white font-bold mb-4 flex items-center gap-2 text-lg">
                            <Video className="w-6 h-6" />
                            🎙️ Dynamic Podcast Video
                            {addSubtitles && (
                              <span className="ml-2 px-3 py-1 bg-amber-500/30 border border-amber-400/60 rounded-full text-sm flex items-center gap-1">
                                <Subtitles className="w-3 h-3" />
                                With Subtitles
                              </span>
                            )}
                          </p>
                          <video
                            src={`http://localhost:8000${jobStatus.merged_video_url}`}
                            controls
                            className="w-full rounded-xl shadow-2xl border-2 border-white/20"
                            controlsList="nodownload"
                          />
                          <a
                            href={`http://localhost:8000${jobStatus.merged_video_url}`}
                            download={`podcast_${jobId}.mp4`}
                            className="mt-4 inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                          >
                            <Upload className="w-4 h-4" />
                            Download Merged Video
                          </a>
                        </div>
                      )}
                        
                      {/* Individual Videos */}
                      <details className="bg-white/10 rounded-2xl p-5 backdrop-blur-sm border border-white/20 hover:bg-white/15 transition-all duration-300">
                        <summary className="text-white font-bold cursor-pointer flex items-center gap-2 text-base">
                          <ArrowRight className="w-5 h-5" />
                          View Individual Speaker Videos
                        </summary>
                        
                        <div className="mt-5 space-y-4">
                          {jobStatus.speaker_a_video && (
                            <div>
                              <p className="text-purple-200 font-semibold mb-2 flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Speaker A
                              </p>
                              <video 
                                src={jobStatus.speaker_a_video} 
                                controls 
                                className="w-full rounded-xl shadow-lg border-2 border-white/20" 
                              />
                            </div>
                          )}
                          
                          {jobStatus.speaker_b_video && (
                            <div>
                              <p className="text-purple-200 font-semibold mb-2 flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Speaker B
                              </p>
                              <video 
                                src={jobStatus.speaker_b_video} 
                                controls 
                                className="w-full rounded-xl shadow-lg border-2 border-white/20" 
                              />
                            </div>
                          )}
                        </div>
                      </details>
                    </div>
                  )}

                  {jobStatus.error && (
                    <div className="bg-gradient-to-r from-red-500/20 to-rose-500/20 border-2 border-red-400 rounded-2xl p-4 backdrop-blur-sm">
                      <p className="text-red-200 font-medium flex items-center gap-2">
                        <XCircle className="w-5 h-5" />
                        Error: {jobStatus.error}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AvatarVideoGenerator;