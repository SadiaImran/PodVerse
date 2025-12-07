import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Upload, Users, Mic, Loader2, CheckCircle2, XCircle, Video, Play, Image as ImageIcon, Sparkles, Zap, ArrowRight, Info, Subtitles, X, TestTube, Pause } from "lucide-react";
import { getSupabaseAuthorizedtoken } from '../../supabaseClient';
import axios from 'axios';
import { useAuth } from "../../context/AuthContext";

const dataUrlToFile = (dataUrl, filename) => {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'audio/wav';
  const binary = atob(arr[1]);
  const len = binary.length;
  const u8arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    u8arr[i] = binary.charCodeAt(i);
  }
  return new File([u8arr], filename, { type: mime });
};

function AvatarVideoGenerator() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [avatars, setAvatars] = useState([]);
  const [voices, setVoices] = useState([]);
  const [loadingAvatars, setLoadingAvatars] = useState(false);
  const [loadingVoices, setLoadingVoices] = useState(false);
  
  const [audioFile, setAudioFile] = useState(null);
  const [audioFileName, setAudioFileName] = useState("");
  
  // NEW: Subtitle toggle
  const [addSubtitles, setAddSubtitles] = useState(false);
  
  // Testing Mode Toggle
  const [isTestingMode, setIsTestingMode] = useState(false);

  const [splitScreenMode, setSplitScreenMode] = useState(false);
  
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
  const [speakerARemoveBg, setSpeakerARemoveBg] = useState(false);
  const [speakerAProcessingBg, setSpeakerAProcessingBg] = useState(false);
  const [speakerAOriginalImage, setSpeakerAOriginalImage] = useState(null); 
  
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
  const [speakerBRemoveBg, setSpeakerBRemoveBg] = useState(false);
  const [speakerBProcessingBg, setSpeakerBProcessingBg] = useState(false);
  const [speakerBOriginalImage, setSpeakerBOriginalImage] = useState(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [videoGenMeta, setVideoGenMeta] = useState(null);
  const [showProceedModal, setShowProceedModal] = useState(false);
  
  const handleMoveToVideoEditor = () => {
    if (jobStatus?.supabase_video_url) {
      try {
        sessionStorage.setItem('videoEditorSource', jobStatus.supabase_video_url);
        sessionStorage.setItem('originalVideoPath', jobStatus.video_storage_path || '');
        sessionStorage.setItem('videoJobId', jobStatus.job_id || '');
        if (jobStatus.transcript_storage_path) {
          sessionStorage.setItem('transcriptStoragePath', jobStatus.transcript_storage_path);
        }
        if (jobStatus.transcript_supabase_url) {
          sessionStorage.setItem('transcriptSignedUrl', jobStatus.transcript_supabase_url);
        }
      } catch (err) {
        console.warn('Unable to cache editor source:', err);
      }
      navigate('/video-editor', { 
        state: { 
          videoUrl: jobStatus.supabase_video_url,
          videoPath: jobStatus.video_storage_path,
          videoName: jobStatus.video_storage_path ? jobStatus.video_storage_path.split('/').pop() : `podcast_${jobStatus.job_id}.mp4`,
          originalVideoPath: jobStatus.video_storage_path,
          jobId: jobStatus.job_id,
          transcriptStoragePath: jobStatus.transcript_storage_path,
          transcriptSignedUrl: jobStatus.transcript_supabase_url
        } 
      });
    } else {
      navigate('/video-editor');
    }
  };

  const handleProceedClick = () => {
    console.log('Proceed button clicked, opening modal');
    setShowProceedModal(true);
  };

  const handleGenerateNewVideo = () => {
    // Reset state for new video generation
    setJobId(null);
    setJobStatus(null);
    setShowProceedModal(false);
    setAudioFile(null);
    setAudioFileName(null);
    // Clear session storage
    sessionStorage.removeItem('videoEditorSource');
    sessionStorage.removeItem('originalVideoPath');
    sessionStorage.removeItem('videoJobId');
    sessionStorage.removeItem('transcriptStoragePath');
    sessionStorage.removeItem('transcriptSignedUrl');
  };

  const handleProceedToEditing = () => {
    setShowProceedModal(false);
    handleMoveToVideoEditor();
  };

  const [error, setError] = useState("");
  const [skipDiarization, setSkipDiarization] = useState(false);
  const [precomputedUtterances, setPrecomputedUtterances] = useState(null);

  // Convert script data to utterances format for skipping diarization
  const convertScriptToUtterances = (scriptData, totalDuration) => {
    if (!scriptData || !Array.isArray(scriptData)) return null;
    
    let currentTime = 0;
    const utterances = [];
    
    scriptData.forEach((line, index) => {
      // Estimate duration based on text length (rough estimate: 150 words per minute)
      const wordCount = (line.text || '').split(/\s+/).length;
      const estimatedDuration = (wordCount / 150) * 60 * 1000; // Convert to milliseconds
      
      const start = currentTime;
      const end = currentTime + estimatedDuration;
      
      // Map HOST/GUEST to A/B (or use existing speaker field if available)
      let speaker = 'A';
      if (line.speaker_label) {
        speaker = line.speaker_label === 'HOST' ? 'A' : 'B';
      } else if (line.speaker) {
        // If speaker is already A/B, use it directly
        speaker = line.speaker === 'A' || line.speaker === 'B' ? line.speaker : 'A';
      }
      
      utterances.push({
        speaker: speaker,
        text: line.text || '',
        start: start / 1000, // Convert to seconds
        end: end / 1000,
        id: line.id || `utterance_${index}`
      });
      
      currentTime = end + 300; // Add 300ms gap between utterances
    });
    
    console.log(`✅ Converted ${utterances.length} script lines to utterances`);
    return utterances;
  };

  useEffect(() => {
    const initializeAudioFromNavigation = async () => {
      if (location.state?.audioFile) {
        setAudioFile(location.state.audioFile);
        setAudioFileName(location.state.audioFileName || location.state.audioFile.name || 'final_audio.wav');
        
        // Check if coming from automatic audio generation
        if (location.state?.fromAutoAudio && location.state?.scriptData) {
          setSkipDiarization(true);
          // Convert script data to utterances format
          const utterances = convertScriptToUtterances(location.state.scriptData, location.state.audioDuration || 0);
          setPrecomputedUtterances(utterances);
          console.log('✅ Skipping diarization - using precomputed utterances from script');
        }
        
        navigate('.', { replace: true, state: null });
        sessionStorage.removeItem('videoGenAudioDataUrl');
        sessionStorage.removeItem('videoGenAudioName');
        sessionStorage.removeItem('videoGenAudioUrl');
        sessionStorage.removeItem('videoGenAudioSource');
      } else {
        // Check for Supabase URL first (preferred)
        const supabaseUrl = sessionStorage.getItem('editedAudioSupabaseUrl') || sessionStorage.getItem('videoGenAudioUrl');
        const audioSource = sessionStorage.getItem('videoGenAudioSource');
        const cachedName = sessionStorage.getItem('videoGenAudioName');
        
        if (supabaseUrl && audioSource === 'supabase' && cachedName) {
          // Download from Supabase URL
          try {
            console.log('📥 Loading audio from Supabase URL:', supabaseUrl);
            const response = await fetch(supabaseUrl);
            if (response.ok) {
              const blob = await response.blob();
              const file = new File([blob], cachedName, { type: blob.type || 'audio/wav' });
              setAudioFile(file);
              setAudioFileName(cachedName);
              console.log('✅ Audio loaded from Supabase');
            } else {
              throw new Error('Failed to download from Supabase URL');
            }
          } catch (err) {
            console.warn('Failed to load audio from Supabase URL:', err);
            // Fall through to try blob
          } finally {
            sessionStorage.removeItem('editedAudioSupabaseUrl');
            sessionStorage.removeItem('videoGenAudioUrl');
            sessionStorage.removeItem('videoGenAudioSource');
          }
        } else {
          // Fallback to blob (may not exist if too large)
          const cachedDataUrl = sessionStorage.getItem('videoGenAudioDataUrl');
          if (cachedDataUrl && cachedName) {
            try {
              const restoredFile = dataUrlToFile(cachedDataUrl, cachedName);
              setAudioFile(restoredFile);
              setAudioFileName(cachedName);
            } catch (err) {
              console.warn('Failed to restore cached audio for video generation:', err);
            } finally {
              sessionStorage.removeItem('videoGenAudioDataUrl');
              sessionStorage.removeItem('videoGenAudioName');
              sessionStorage.removeItem('videoGenAudioSource');
            }
          }
        }
      }

      try {
        const metaRaw = sessionStorage.getItem('videoGenMeta');
        if (metaRaw) {
          setVideoGenMeta(JSON.parse(metaRaw));
        }
      } catch (err) {
        console.warn('Failed to parse video generation metadata:', err);
      }

      // Check sessionStorage for script data from automatic audio generation
      const scriptDataStr = sessionStorage.getItem('autoAudioScriptData');
      const audioDurationStr = sessionStorage.getItem('autoAudioDuration');
      
      if (scriptDataStr && !skipDiarization) {
        try {
          const scriptData = JSON.parse(scriptDataStr);
          const audioDuration = parseFloat(audioDurationStr || '0');
          setSkipDiarization(true);
          const utterances = convertScriptToUtterances(scriptData, audioDuration);
          setPrecomputedUtterances(utterances);
          console.log('✅ Loaded script data from sessionStorage - will skip diarization');
        } catch (err) {
          console.warn('Failed to parse script data from sessionStorage:', err);
        }
      }
    };

    initializeAudioFromNavigation();
  }, [location.state, navigate]);

  useEffect(() => {
    loadAvatars();
    loadVoices();
    loadAvatarTemplates('A');
    loadAvatarTemplates('B');
  }, []);

  useEffect(() => {
    if (!jobId || !jobStatus) return;
    
    // Skip polling for test job IDs (testing mode)
    if (jobId.startsWith('test_')) {
      console.log('🧪 Testing Mode: Skipping backend polling for test job');
      return;
    }
    
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

  useEffect(() => {
    if (jobStatus?.supabase_video_url) {
      try {
        sessionStorage.setItem('videoEditorSource', jobStatus.supabase_video_url);
      } catch (err) {
        console.warn('Failed to cache video editor source:', err);
      }
    }
  }, [jobStatus?.supabase_video_url]);

  useEffect(() => {
    if (jobStatus?.transcript_storage_path) {
      try {
        sessionStorage.setItem('transcriptStoragePath', jobStatus.transcript_storage_path);
      } catch (err) {
        console.warn('Failed to cache transcript storage path:', err);
      }
    }
    if (jobStatus?.transcript_supabase_url) {
      try {
        sessionStorage.setItem('transcriptSignedUrl', jobStatus.transcript_supabase_url);
      } catch (err) {
        console.warn('Failed to cache transcript URL:', err);
      }
    }
  }, [jobStatus?.transcript_storage_path, jobStatus?.transcript_supabase_url]);

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

  const handleRemoveBackground = async (speaker) => {
    const imageFile = speaker === 'A' ? speakerAImageFile : speakerBImageFile;
    const setProcessing = speaker === 'A' ? setSpeakerAProcessingBg : setSpeakerBProcessingBg;
    const setImagePreview = speaker === 'A' ? setSpeakerAImagePreview : setSpeakerBImagePreview;
    const setImageFile = speaker === 'A' ? setSpeakerAImageFile : setSpeakerBImageFile;
    const setOriginalImage = speaker === 'A' ? setSpeakerAOriginalImage : setSpeakerBOriginalImage;
    const originalImage = speaker === 'A' ? speakerAOriginalImage : speakerBOriginalImage;
    const removeBg = speaker === 'A' ? speakerARemoveBg : speakerBRemoveBg;
  
    if (!imageFile && !originalImage) {
      setError(`Please upload an image first for Speaker ${speaker}`);
      return;
    }
  
    setProcessing(true);
    setError("");
  
    try {
      const token = await getSupabaseAuthorizedtoken();
  
      // If toggling OFF, restore original
      if (!removeBg && originalImage) {
        setImagePreview(URL.createObjectURL(originalImage));
        setImageFile(originalImage);
        setProcessing(false);
        return;
      }
  
      // Store original if first time
      if (!originalImage && imageFile) {
        setOriginalImage(imageFile);
      }
  
      const formData = new FormData();
      formData.append('file', originalImage || imageFile);
  
      console.log(`🎨 Removing background for Speaker ${speaker}...`);
  
      const response = await axios.post(
        'http://localhost:8000/video/api/remove-background',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        }
      );
  
      // Convert base64 to File object
      const base64Data = response.data.image_data;
      const base64Response = await fetch(base64Data);
      const blob = await base64Response.blob();
      const processedFile = new File([blob], `speaker_${speaker}_no_bg.png`, { type: 'image/png' });
  
      setImageFile(processedFile);
      setImagePreview(URL.createObjectURL(processedFile));
  
      console.log(`✅ Background removed for Speaker ${speaker}`);
  
    } catch (err) {
      console.error(`Background removal error for Speaker ${speaker}:`, err);
      setError(err.response?.data?.detail || `Failed to remove background for Speaker ${speaker}`);
    } finally {
      setProcessing(false);
    }
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

      const effectiveUserId = (videoGenMeta?.userId || user?.id || '').trim();
      let effectiveKbId = videoGenMeta?.kbId || sessionStorage.getItem('current_kb_id') || '';
      if (!effectiveKbId) {
        try {
          const kbInfoRaw = sessionStorage.getItem('selectedKnowledgeBase');
          if (kbInfoRaw) {
            effectiveKbId = JSON.parse(kbInfoRaw)?.id || '';
          }
        } catch {
          effectiveKbId = '';
        }
      }
      const fallbackTitle = audioFileName
        ? audioFileName.replace(/\.[^/.]+$/, '')
        : 'Untitled_Podcast';
      let effectiveTitle =
        videoGenMeta?.podcastTitle ||
        fallbackTitle ||
        'Untitled_Podcast';

      formData.append('user_id', effectiveUserId || 'user_unknown');
      formData.append('kb_id', effectiveKbId || 'kb_unknown');
      formData.append('podcast_title', effectiveTitle);
      
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

      formData.append('split_screen_mode', splitScreenMode);

      // NEW: Skip diarization if utterances are precomputed (from automatic audio generation)
      if (skipDiarization && precomputedUtterances) {
        formData.append('skip_diarization', 'true');
        formData.append('precomputed_utterances', JSON.stringify(precomputedUtterances));
        console.log('📤 Sending precomputed utterances to skip diarization');
      }

      // Check if testing mode is enabled
      if (isTestingMode) {
        console.log("🧪 Testing Mode: Simulating video generation...");
        
        // Generate a fake job ID
        const testJobId = `test_${Date.now()}`;
        setJobId(testJobId);
        
        // Simulate progress updates
        setJobStatus({
          job_id: testJobId,
          status: 'pending',
          progress: 0,
          message: 'Testing Mode: Starting simulation...'
        });
        
        // Simulate progress over 5 seconds
        let progress = 0;
        const progressInterval = setInterval(() => {
          progress += 20; // 20% per update for faster progress
          if (progress <= 50) {
            setJobStatus(prev => ({
              ...prev,
              progress,
              message: `Testing Mode: Processing... ${progress}%`
            }));
          } else if (progress <= 80) {
            setJobStatus(prev => ({
              ...prev,
              status: 'generating_videos',
              progress,
              message: `Testing Mode: Generating videos... ${progress}%`
            }));
          } else if (progress < 100) {
            setJobStatus(prev => ({
              ...prev,
              progress,
              message: `Testing Mode: Finalizing... ${progress}%`
            }));
          }
        }, 1000); // Update every 1 second (20% per update, 5 seconds total)
        
        // After 5 seconds, complete with test video from modules folder
        setTimeout(async () => {
          clearInterval(progressInterval);
          
          // Use local test video from modules folder
          const testVideoUrl = `http://localhost:8000/test-video/test_video.mp4`;
          const testThumbnailUrl = "https://picsum.photos/id/1025/1280/720";
          
          // Upload test video to Supabase
          let supabaseVideoUrl = testVideoUrl; // Fallback to local URL
          let videoStoragePath = `test_video_${testJobId}.mp4`;
          
          try {
            console.log("📤 Testing Mode: Uploading test video to Supabase...");
            const token = await getSupabaseAuthorizedtoken();
            
            // Download test video
            const videoResponse = await fetch(testVideoUrl);
            if (!videoResponse.ok) {
              throw new Error('Failed to download test video');
            }
            const videoBlob = await videoResponse.blob();
            
            // Get metadata for filename
            const metaRaw = sessionStorage.getItem('videoGenMeta');
            let userId = 'unknown';
            let kbId = 'kb_unknown';
            let podcastTitle = 'test_podcast';
            
            if (metaRaw) {
              try {
                const meta = JSON.parse(metaRaw);
                userId = meta.userId || userId;
                kbId = meta.kbId || kbId;
                podcastTitle = meta.podcastTitle || podcastTitle;
              } catch (e) {
                console.warn('Failed to parse metadata for test video upload');
              }
            }
            
            // Create FormData for upload
            const formData = new FormData();
            const videoFile = new File([videoBlob], `test_video_${testJobId}.mp4`, { type: 'video/mp4' });
            formData.append('file', videoFile);
            formData.append('project_name', 'test_video');
            formData.append('render_id', testJobId);
            
            // Upload to Supabase
            const uploadResponse = await axios.post(
              'http://localhost:8000/videos/upload-video',
              formData,
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'multipart/form-data'
                }
              }
            );
            
            if (uploadResponse.data.success && uploadResponse.data.video_url) {
              supabaseVideoUrl = uploadResponse.data.video_url;
              videoStoragePath = uploadResponse.data.storage_path || videoStoragePath;
              console.log("✅ Testing Mode: Test video uploaded to Supabase:", supabaseVideoUrl);
            } else {
              console.warn("⚠️ Testing Mode: Supabase upload failed, using local URL");
            }
          } catch (uploadErr) {
            console.warn("⚠️ Testing Mode: Error uploading to Supabase:", uploadErr);
            // Continue with local URL as fallback
          }
          
          setJobStatus({
            job_id: testJobId,
            status: 'completed',
            progress: 100,
            message: 'Testing Mode: Video ready!',
            merged_video_url: supabaseVideoUrl,
            supabase_video_url: supabaseVideoUrl,
            video_storage_path: videoStoragePath,
            thumbnail_url: testThumbnailUrl,
            speaker_a_video: supabaseVideoUrl,
            speaker_b_video: supabaseVideoUrl
          });
          
          setIsProcessing(false);
          console.log("✅ Testing Mode: Test video ready, Supabase URL:", supabaseVideoUrl);
        }, 5000); // 5 seconds (testing mode - fast)
        
        return;
      }
      
      // Real Mode: Use actual API
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
    if (!jobStatus) return '';
    if (jobStatus.status === 'completed') return 'bg-gradient-to-r from-green-400 to-emerald-500';
    if (jobStatus.status === 'failed') return 'bg-gradient-to-r from-red-400 to-rose-500';
    return '';
  };
  
  const getProgressStyle = () => {
    if (!jobStatus || jobStatus.status === 'completed' || jobStatus.status === 'failed') return {};
    return {};
  };

  // Derived preview data for elegant layout card
  const speakerAPreviewImage = speakerAUseCustom
    ? speakerAImagePreview || speakerAAvatar?.preview_image_url
    : speakerAAvatar?.preview_image_url;

  const speakerBPreviewImage = speakerBUseCustom
    ? speakerBImagePreview || speakerBAvatar?.preview_image_url
    : speakerBAvatar?.preview_image_url;

  const speakerAVoiceLabel = speakerAUseOriginalVoice
    ? 'Original voice from audio'
    : speakerAVoice
      ? `${speakerAVoice.name}${speakerAVoice.gender ? ` (${speakerAVoice.gender})` : ''}`
      : 'No voice selected';

  const speakerBVoiceLabel = speakerBUseOriginalVoice
    ? 'Original voice from audio'
    : speakerBVoice
      ? `${speakerBVoice.name}${speakerBVoice.gender ? ` (${speakerBVoice.gender})` : ''}`
      : 'No voice selected';

  const primaryAudioLabel = audioFileName || 'No audio selected yet';

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
  ) => {
    const [isPlayingPreview, setIsPlayingPreview] = useState(false);
    const audioRef = useRef(null);

    const handlePlayPreview = () => {
      if (!voice?.preview_audio) return;
      
      if (isPlayingPreview) {
        audioRef.current?.pause();
        setIsPlayingPreview(false);
      } else {
        audioRef.current?.play();
        setIsPlayingPreview(true);
      }
    };

    const handleAudioEnded = () => {
      setIsPlayingPreview(false);
    };

    return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 sm:p-5 border border-light-lavender/40 shadow-xl hover:shadow-2xl transition-all duration-500 shadow-light-purple/5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${speaker === 'A' ? 'bg-light-purple shadow-light-purple/30' : 'bg-gradient-to-br from-pink-500 via-rose-500 to-pink-600 shadow-pink-500/30'}`}>
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-slate-900 font-bold text-base mb-0.5">Speaker {speaker}</h3>
            <p className="text-slate-500 text-xs font-medium">Avatar & voice</p>
          </div>
        </div>
      </div>

      {/* Toggle Custom Avatar */}
      <div className="mb-4">
        <label className="flex items-center gap-2.5 cursor-pointer group backdrop-blur-sm rounded-xl p-2.5 hover:shadow-md transition-all duration-300 bg-gradient-to-r from-light-lavender/30 to-pink-50/50 border-2 border-light-lavender/50">
          <div className="relative">
            <input
              type="checkbox"
              checked={useCustom}
              onChange={(e) => setUseCustom(e.target.checked)}
              className="sr-only peer"
            />
            <div className={`w-11 h-6 rounded-full shadow-inner transition-all duration-300 ${useCustom ? 'bg-gradient-to-r from-light-purple to-pink-500' : 'bg-slate-200'}`}></div>
            <div className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-lg ${useCustom ? 'translate-x-5' : ''}`}></div>
          </div>
          <span className="text-slate-800 font-semibold transition-colors text-xs sm:text-sm text-light-purple/80">
            Custom Avatar
          </span>
        </label>
      </div>

      {useCustom ? (
        <div className="space-y-6">
          {/* Custom Avatar Upload */}
          {/* Template Selection */}
          {templates.length > 0 && (
            <div>
              <label className="text-slate-900 font-bold mb-4 block flex items-center gap-2.5 text-base sm:text-lg">
                <div className="w-6 h-6 rounded-lg bg-light-purple flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                Choose from Templates
              </label>
              {loadingTemplates ? (
                <div className="flex items-center justify-center py-12 rounded-2xl border border-light-lavender/50 bg-gradient-to-br from-light-lavender/30 to-light-purple/30">
                  <Loader2 className="w-10 h-10 animate-spin text-light-purple" />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-5">
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
                      className={`cursor-pointer rounded-2xl overflow-hidden border-2 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-xl ${
                        selectedTemplate?.id === template.id
                          ? 'ring-4 shadow-2xl bg-white/80 backdrop-blur-sm'
                          : 'bg-white/80 backdrop-blur-sm'
                      }`}
                    >
                      <img
                        src={template.url}
                        alt={`Template ${template.id}`}
                        className="w-full h-24 sm:h-28 object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm mb-4 font-semibold rounded-lg px-3 py-2 border border-light-lavender/50 bg-light-lavender/30 text-light-purple">
                <ArrowRight className="w-4 h-4" />
                <span>Or upload your own photo:</span>
              </div>
            </div>
          )}
          
          <div>
            <label className="text-slate-900 font-bold mb-4 block flex items-center gap-2.5 text-base sm:text-lg">
              <div className="w-6 h-6 rounded-lg bg-light-purple flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-white" />
              </div>
              Upload Custom Photo
            </label>
            {imagePreview ? (
              <div className="relative group">
                <img
                  src={imagePreview}
                  alt={`Speaker ${speaker}`}
                  className="w-full h-56 sm:h-64 object-cover rounded-2xl border-2 border-light-purple/60 shadow-2xl"
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
                  className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white p-2.5 rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 transform hover:scale-110 backdrop-blur-sm border-2 border-white/30"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-40 sm:h-44 border-2 border-dashed border-light-purple/60 rounded-2xl cursor-pointer backdrop-blur-sm transition-all duration-300 group shadow-md hover:shadow-lg bg-gradient-to-br from-light-lavender/30 to-light-purple/30 hover:from-light-lavender/40 hover:to-light-purple/40 hover:border-light-purple/80">
                <div className="w-14 h-14 sm:w-16 sm:h-16 mb-3 rounded-2xl bg-light-purple flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <ImageIcon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                </div>
                <p className="text-base sm:text-lg font-bold text-light-purple transition-colors group-hover:text-light-purple">Click to upload photo</p>
                <p className="text-sm mt-1 font-medium text-light-purple">PNG, JPG or JPEG</p>
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

          {(imageFile || imagePreview) && !customAvatarId && (
            <div className="backdrop-blur-sm border-2 border-light-lavender/60 rounded-2xl p-4 shadow-md bg-gradient-to-r from-light-lavender/30 to-pink-50/30">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={speaker === 'A' ? speakerARemoveBg : speakerBRemoveBg}
                    onChange={async (e) => {
                      if (speaker === 'A') {
                        setSpeakerARemoveBg(e.target.checked);
                      } else {
                        setSpeakerBRemoveBg(e.target.checked);
                      }
                      await handleRemoveBackground(speaker);
                    }}
                    disabled={speaker === 'A' ? speakerAProcessingBg : speakerBProcessingBg}
                    className="sr-only peer"
                  />
                  <div className={`w-12 h-6 rounded-full shadow-inner transition-all duration-300 ${(speaker === 'A' ? speakerARemoveBg : speakerBRemoveBg) ? 'bg-gradient-to-r from-light-purple to-pink-500' : 'bg-slate-200'}`}></div>
                  <div className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-md ${(speaker === 'A' ? speakerARemoveBg : speakerBRemoveBg) ? 'translate-x-6' : ''}`}></div>
                </div>
                <div className="flex-1">
                  <span className="text-slate-900 font-semibold flex items-center gap-2 transition-colors text-sm sm:text-base text-light-purple/80">
                    {(speaker === 'A' ? speakerAProcessingBg : speakerBProcessingBg) ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Removing background...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Remove Background
                      </>
                    )}
                  </span>
                  <p className="text-slate-600 text-xs mt-1 font-medium">
                    {(speaker === 'A' ? speakerAProcessingBg : speakerBProcessingBg) 
                      ? "Processing..." 
                      : (speaker === 'A' ? speakerARemoveBg : speakerBRemoveBg)
                        ? "✅ Background removed"
                        : "Original image with background"}
                  </p>
                </div>
              </label>
            </div>
          )}

          {(imageFile || selectedTemplate) && !customAvatarId && (
            <button
              onClick={() => uploadCustomAvatar(speaker)}
              disabled={uploading}
              className="w-full disabled:from-gray-400 disabled:via-gray-500 disabled:to-gray-600 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 disabled:transform-none disabled:cursor-not-allowed bg-gradient-to-r from-light-secondary via-light-accent to-light-secondary disabled:from-gray-400 disabled:via-gray-500 disabled:to-gray-600"
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
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200/60 rounded-2xl p-5 shadow-lg">
              <p className="text-emerald-700 font-bold flex items-center gap-2 mb-2 text-base">
                <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                Custom avatar ready!
              </p>
              <p className="text-emerald-700 text-sm font-mono bg-white/60 rounded-lg p-2 border border-emerald-200/50">ID: {customAvatarId}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-4">
          {/* Standard Avatar Selection */}
          <label className="text-slate-900 font-bold mb-3 block flex items-center gap-2 text-sm sm:text-base">
            <Users className="w-4 h-4 text-light-purple" />
            Select Avatar
          </label>
          {loadingAvatars ? (
            <div className="flex items-center justify-center py-8 rounded-xl border border-light-lavender/50 bg-gradient-to-br from-light-lavender/30 to-light-purple/30">
              <Loader2 className="w-8 h-8 animate-spin text-light-purple" />
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
              {avatars.map((a) => {
                const isSelected = avatar?.avatar_id === a.avatar_id;
                return (
                  <button
                    key={a.avatar_id}
                    onClick={() => setAvatar(a)}
                    // className={`relative rounded-lg overflow-hidden border-2 transition-all duration-300 text-left transform hover:scale-[1.02] ${
                    //   isSelected
                    //     ? 'ring-2 shadow-lg bg-white'
                    //     : 'bg-white hover:shadow-md'
                    // }`}
                    className={isSelected ? 'border-light-purple ring-2 ring-light-lavender/50 shadow-lg shadow-light-purple/40 bg-gradient-to-br from-light-lavender/30 to-light-purple/30' : 'border-light-lavender/60 hover:border-light-purple/80'}
                  >
                    <div className="w-full aspect-square bg-gradient-to-br from-slate-100 to-slate-200">
                      {a.preview_image_url ? (
                        <img
                          src={a.preview_image_url}
                          alt={a.avatar_name}
                          className="w-full h-full object-cover object-center"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px] font-medium">
                          No preview
                        </div>
                      )}
                    </div>
                    <div className="p-1.5 bg-white">
                      <p className="text-slate-900 font-semibold text-[10px] truncate leading-tight">{a.avatar_name}</p>
                      <p className="text-[9px] font-medium mt-0.5 text-light-purple">
                        {a.gender || 'Unknown'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {avatar && (
            <div className="mt-3 text-xs backdrop-blur-sm rounded-lg p-2.5 border-2 border-light-lavender/60 shadow-md bg-gradient-to-r from-light-lavender/30 to-light-purple/30 text-light-purple">
              <p className="font-semibold">
                Selected: <span className="font-bold text-light-purple">{avatar.avatar_name}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Voice Selection */}
      <div className="space-y-4 mt-6">
        <label className="text-slate-900 font-bold mb-3 block flex items-center gap-2.5 text-base sm:text-lg">
          <Mic className="w-5 h-5 text-light-purple" />
          Voice Settings
        </label>
        
        {/* Toggle Original Voice */}
        <div className="bg-gradient-to-r from-blue-50/90 to-cyan-50/90 backdrop-blur-sm border-2 border-blue-200/60 rounded-2xl p-4 shadow-md">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={useOriginalVoice}
                onChange={(e) => setUseOriginalVoice(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-slate-200 rounded-full peer peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-cyan-500 transition-all duration-300 shadow-inner"></div>
              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-all duration-300 peer-checked:translate-x-6 shadow-md"></div>
            </div>
            <span className="text-blue-800 font-semibold flex items-center gap-2 group-hover:text-blue-900 transition-colors text-sm sm:text-base">
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
              className="w-full px-5 py-4 bg-white/90 backdrop-blur-sm border-2 border-light-lavender/60 rounded-2xl text-slate-900 font-semibold focus:outline-none focus:ring-4 focus:ring-light-lavender/50 focus:border-light-purple transition-all duration-300 shadow-md hover:bg-light-lavender/20"
              disabled={loadingVoices}
            >
              <option value="">Select HeyGen voice...</option>
              {voices.map(v => (
                <option key={v.voice_id} value={v.voice_id} className="bg-white">
                  {v.name} ({v.gender})
                </option>
              ))}
            </select>
            <div className="flex items-start gap-2.5 text-sm backdrop-blur-sm rounded-xl p-3.5 border-2 border-light-lavender/60 shadow-md bg-gradient-to-r from-light-lavender/30 to-light-purple/30 text-light-purple">
              <div className="w-5 h-5 rounded-lg bg-light-purple flex items-center justify-center flex-shrink-0 mt-0.5">
                <Info className="w-3.5 h-3.5 text-white" />
              </div>
              <p className="font-medium">HeyGen voice will replace the original speaker's voice</p>
            </div>
          </div>
        )}
      </div>

      {/* Configuration Status */}
      {((useCustom && customAvatarId) || (!useCustom && avatar)) && (useOriginalVoice || voice) && (
        <div className="mt-6 bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200/60 rounded-2xl p-4 shadow-lg animate-pulse">
          <p className="text-emerald-800 font-bold flex items-center gap-2.5 text-base">
            <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
            Speaker {speaker} configured successfully!
          </p>
        </div>
      )}
    </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-light-lavender/20 to-light-purple/30 py-4 px-2 sm:px-4">
      <div className="w-full">
        {/* Header - Left Aligned */}
        <div className="mb-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-500 mb-2 flex items-center gap-2.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-light-purple flex items-center justify-center shadow-lg relative">
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full blur-sm opacity-60 bg-light-secondary"></div>
              <div className="absolute -bottom-1 -left-1 w-3 h-3 rounded-full blur-sm opacity-60 bg-light-lavender"></div>
              <Video className="w-5 h-5 sm:w-6 sm:h-6 text-white relative z-10" />
            </div>
            <span>Create Avatar Video from Podcast</span>
          </h1>
        </div>

        {/* Main Content - Full Width */}
        <div className="w-full space-y-4">
          {/* Audio Upload - Improved UI */}
          <div className="w-full">
            <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm max-w-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-light-purple flex items-center justify-center shadow-md">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-slate-700 font-semibold text-base">Upload Podcast Audio</h3>
                  <p className="text-slate-500 text-xs mt-0.5">Select your audio file to begin</p>
                </div>
              </div>

              <div>
                {audioFileName ? (
                  <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center shadow-sm">
                          <CheckCircle2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-emerald-800 font-semibold text-sm">File Uploaded</p>
                          <p className="text-emerald-600 text-xs mt-0.5 truncate max-w-xs">{audioFileName}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setAudioFile(null);
                          setAudioFileName("");
                        }}
                        className="text-red-600 hover:text-red-700 font-medium flex items-center gap-1.5 transition-colors text-xs px-3 py-1.5 rounded-lg hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-light-purple/80 hover:border-light-lavender rounded-xl cursor-pointer bg-slate-50/50 hover:bg-slate-100/70 transition-all duration-300 group">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 mb-3 rounded-xl bg-light-purple flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300">
                        <Upload className="w-8 h-8 text-white" />
                      </div>
                      <p className="mb-1.5 text-sm font-semibold text-slate-700 transition-colors text-light-purple/80 group-hover:text-light-purple">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-slate-500 font-medium">WAV, MP3, M4A or any audio format</p>
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
            </div>

            </div>

            {/* Speaker Configuration - Horizontal */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

          {/* Generate & Preview Section - Side by Side */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.8fr] gap-4">
            {/* Generate Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-5 border border-light-lavender/50 shadow-md">
              <h3 className="text-slate-900 font-bold text-base mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-light-purple" />
                Generate Video
              </h3>
              
              <div className="space-y-4">
                {/* Options Row */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Subtitles Toggle */}
                  <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                    <Subtitles className="w-4 h-4 text-slate-600" />
                    <span className="text-sm font-medium text-slate-700">Subtitles</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={addSubtitles}
                        onChange={(e) => setAddSubtitles(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className={`w-9 h-5 rounded-full transition-colors ${addSubtitles ? 'bg-light-purple' : 'bg-slate-300'}`}></div>
                      <div className={`absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${addSubtitles ? 'translate-x-4' : ''}`}></div>
                    </label>
                  </div>

                  {/* Split Screen Toggle */}
                  <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                    <Users className="w-4 h-4 text-slate-600" />
                    <span className="text-sm font-medium text-slate-700">Split Screen</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={splitScreenMode}
                        onChange={(e) => setSplitScreenMode(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className={`w-9 h-5 rounded-full transition-colors ${splitScreenMode ? 'bg-light-purple' : 'bg-slate-300'}`}></div>
                      <div className={`absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${splitScreenMode ? 'translate-x-4' : ''}`}></div>
                    </label>
                  </div>

                  {/* Testing Mode Toggle */}
                  <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                    <TestTube className="w-4 h-4 text-slate-600" />
                    <span className="text-sm font-medium text-slate-700">Test Mode</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isTestingMode}
                        onChange={(e) => setIsTestingMode(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:bg-yellow-500 transition-colors"></div>
                      <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
                    </label>
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleProcess}
                  disabled={isProcessing || !audioFile}
                  className={`w-full disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md disabled:shadow-none ${isProcessing || !audioFile ? 'bg-slate-400' : 'bg-light-purple hover:bg-light-purple/90'}`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{isTestingMode ? 'Testing...' : 'Processing...'}</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      <span>Generate Video</span>
                    </>
                  )}
                </button>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700">
                    <div className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Preview Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-light-lavender/50 shadow-md">
              <h3 className="text-slate-900 font-bold text-lg mb-5 flex items-center gap-2">
                <Video className="w-6 h-6 text-light-purple" />
                Preview
              </h3>
              
              <div className="space-y-4">
                {/* Audio Status */}
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Mic className="w-5 h-5 text-slate-600" />
                    <span className="text-sm font-bold text-slate-700">Audio</span>
                  </div>
                  <p className="text-sm text-slate-600 truncate font-medium" title={primaryAudioLabel}>
                    {primaryAudioLabel}
                  </p>
                </div>

                {/* Speakers Preview */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Speaker A */}
                  <div className="rounded-lg border border-light-lavender/60 bg-gradient-to-br from-light-lavender/20 to-light-purple/20 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-light-purple bg-light-lavender/40 flex items-center justify-center flex-shrink-0">
                        {speakerAPreviewImage ? (
                          <img
                            src={speakerAPreviewImage}
                            alt="Speaker A"
                            className="w-full h-full object-cover object-center"
                          />
                        ) : (
                          <Users className="w-6 h-6 text-light-purple" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs uppercase font-bold text-light-purple mb-1">Speaker A</p>
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {speakerAUseCustom ? 'Custom' : speakerAAvatar?.avatar_name || 'Not set'}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 truncate font-medium" title={speakerAVoiceLabel}>
                      {speakerAVoiceLabel}
                    </p>
                  </div>

                  {/* Speaker B */}
                  <div className="rounded-lg border border-pink-200/60 bg-gradient-to-br from-pink-50/50 to-rose-50/50 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-pink-400 bg-pink-100 flex items-center justify-center flex-shrink-0">
                        {speakerBPreviewImage ? (
                          <img
                            src={speakerBPreviewImage}
                            alt="Speaker B"
                            className="w-full h-full object-cover object-center"
                          />
                        ) : (
                          <Users className="w-6 h-6 text-pink-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs uppercase font-bold text-pink-600 mb-1">Speaker B</p>
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {speakerBUseCustom ? 'Custom' : speakerBAvatar?.avatar_name || 'Not set'}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 truncate font-medium" title={speakerBVoiceLabel}>
                      {speakerBVoiceLabel}
                    </p>
                  </div>
                </div>

                {/* Settings Summary */}
                <div className="flex items-center gap-4 bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <div className="flex items-center gap-2">
                    <Subtitles className={`w-5 h-5 ${addSubtitles ? 'text-amber-500' : 'text-slate-400'}`} />
                    <span className="text-sm font-semibold text-slate-700">{addSubtitles ? 'On' : 'Off'}</span>
                  </div>
                  <span className="h-5 w-px bg-slate-300" />
                  <div className="flex items-center gap-2">
                    <Users className={`w-5 h-5 ${splitScreenMode ? 'text-cyan-500' : 'text-slate-400'}`} />
                    <span className="text-sm font-semibold text-slate-700">
                      {splitScreenMode ? 'Split' : 'Single'}
                    </span>
                  </div>
                  <span className="h-5 w-px bg-slate-300" />
                  <div className="flex items-center gap-2">
                    <Sparkles className={`w-5 h-5 ${audioFileName ? 'text-green-500' : 'text-slate-400'}`} />
                    <span className="text-sm font-semibold text-slate-700">
                      {audioFileName ? 'Ready' : 'Waiting'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {jobStatus && (
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-light-lavender/40 shadow-xl shadow-light-purple/5">
                <h3 className="text-slate-900 font-bold mb-6 flex items-center gap-3 text-lg sm:text-xl">
                  <div className="w-10 h-10 rounded-xl bg-light-purple flex items-center justify-center shadow-md">
                    <Video className="w-6 h-6 text-white" />
                  </div>
                  Processing Status
                </h3>

                <div className="space-y-6">
                  <div className="flex items-center gap-4 backdrop-blur-sm rounded-2xl p-5 border-2 border-light-lavender/60 shadow-lg bg-gradient-to-r from-light-lavender/30 to-light-purple/30">
                    {jobStatus.status === 'completed' && (
                      <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-md flex-shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                    )}
                    {jobStatus.status === 'failed' && (
                      <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center shadow-md flex-shrink-0">
                        <XCircle className="w-6 h-6 text-white" />
                      </div>
                    )}
                    {(jobStatus.status === 'pending' || jobStatus.status === 'diarizing' || jobStatus.status === 'generating_videos') && (
                      <div className="w-10 h-10 rounded-xl bg-light-purple flex items-center justify-center shadow-md flex-shrink-0">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-slate-900 font-bold text-base sm:text-lg">{jobStatus.message}</p>
                      <p className="text-slate-600 text-sm capitalize mt-1 font-semibold">{jobStatus.status}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm text-slate-700 mb-3 font-bold">
                      <span>Progress</span>
                      <span>{jobStatus.progress}%</span>
                    </div>
                    <div className="w-full rounded-full h-4 overflow-hidden shadow-inner border bg-light-lavender border-light-lavender" >
                      <div
                        className={`h-full rounded-full transition-all duration-500 shadow-lg`}
                        style={{ width: `${jobStatus.progress}%`, ...getProgressStyle() }}
                      />
                    </div>
                  </div>

                  {jobStatus.status === 'completed' && (
                    <div className="space-y-5">
                      <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200/60 rounded-2xl p-5 shadow-lg">
                        <h4 className="text-emerald-700 font-bold text-lg flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-md">
                            <CheckCircle2 className="w-5 h-5 text-white" />
                          </div>
                          Videos Ready!
                        </h4>
                      </div>
                      
                      {/* Merged Video - Only show if NOT in split screen mode */}
                      {jobStatus.merged_video_url && !splitScreenMode && (
                        <div className="bg-gradient-to-r from-light-lavender/30 via-pink-50 to-rose-50 rounded-2xl p-6 border-2 border-light-lavender/60 backdrop-blur-sm">
                          <p className="text-gray-900 font-bold mb-4 flex items-center gap-2 text-lg">
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
                            src={jobStatus.merged_video_url.startsWith('http') ? jobStatus.merged_video_url : `http://localhost:8000${jobStatus.merged_video_url}`}
                            controls
                            className="w-full rounded-xl shadow-2xl border-2 border-white/20"
                            controlsList="nodownload"
                          />
                          <a
                            href={jobStatus.merged_video_url.startsWith('http') ? jobStatus.merged_video_url : `http://localhost:8000${jobStatus.merged_video_url}`}
                            download={`podcast_${jobId}.mp4`}
                            className="mt-4 inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                          >
                            <Upload className="w-4 h-4" />
                            Download Merged Video
                          </a>
                        </div>
                      )}

                      {/* NEW: Split Screen Mode - Show both videos prominently */}
                      {splitScreenMode && (jobStatus.speaker_a_video || jobStatus.speaker_b_video) && (
                        <div className="bg-gradient-to-r from-cyan-50 via-blue-50 to-light-lavender/30 rounded-2xl p-6 border-2 border-cyan-200 backdrop-blur-sm">
                          <div className="flex items-center justify-between mb-6">
                            <p className="text-gray-900 font-bold flex items-center gap-2 text-lg">
                              <Users className="w-6 h-6" />
                              Split Screen Videos Ready
                            </p>
                            <span className="px-4 py-2 bg-cyan-100 border border-cyan-200 rounded-full text-cyan-700 text-sm font-semibold flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4" />
                              Timeline-Synced
                            </span>
                          </div>

                          <div className="grid md:grid-cols-2 gap-6">
                            {/* Speaker A Video */}
                            {jobStatus.speaker_a_video && (
                              <div className="bg-white rounded-xl p-4 border border-blue-100">
                                <p className="text-blue-700 font-semibold mb-3 flex items-center gap-2">
                                  <Users className="w-5 h-5" />
                                  Speaker A (Full Timeline)
                                </p>
                                <video
                                  src={jobStatus.speaker_a_video}
                                  controls
                                  className="w-full rounded-lg shadow-lg border-2 border-blue-400/40 mb-3"
                                />
                                <a
                                  href={jobStatus.speaker_a_video}
                                  download={`podcast_speaker_a_${jobId}.mp4`}
                                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold px-4 py-2 rounded-xl transition-all duration-300 shadow-lg text-sm"
                                >
                                  <Upload className="w-4 h-4" />
                                  Download Speaker A
                                </a>
                              </div>
                            )}

                            {/* Speaker B Video */}
                            {jobStatus.speaker_b_video && (
                              <div className="bg-white rounded-xl p-4 border border-pink-100">
                                <p className="text-pink-700 font-semibold mb-3 flex items-center gap-2">
                                  <Users className="w-5 h-5" />
                                  Speaker B (Full Timeline)
                                </p>
                                <video
                                  src={jobStatus.speaker_b_video}
                                  controls
                                  className="w-full rounded-lg shadow-lg border-2 border-pink-400/40 mb-3"
                                />
                                <a
                                  href={jobStatus.speaker_b_video}
                                  download={`podcast_speaker_b_${jobId}.mp4`}
                                  className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold px-4 py-2 rounded-xl transition-all duration-300 shadow-lg text-sm"
                                >
                                  <Upload className="w-4 h-4" />
                                  Download Speaker B
                                </a>
                              </div>
                            )}
                          </div>

                          {/* Info Box */}
                          <div className="mt-6 bg-cyan-50 border-2 border-cyan-200 rounded-xl p-4">
                            <p className="text-cyan-800 text-sm flex items-start gap-2">
                              <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
                              <span>
                                <strong>Perfect for editing:</strong> Both videos have the same duration with synchronized silence periods.
                                Import them into your video editor for easy split-screen layout!
                              </span>
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Supabase Storage Info */}
                      {jobStatus.supabase_video_url && jobStatus.status === 'completed' && (
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 border-2 border-emerald-200 backdrop-blur-sm space-y-4">
                          <p className="text-emerald-800 font-semibold flex items-center gap-2 text-lg">
                            <Sparkles className="w-5 h-5" />
                            Video Saved to Supabase Storage
                          </p>
                          <a
                            href={jobStatus.supabase_video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-white font-semibold px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 transition-all duration-300"
                          >
                            <Upload className="w-4 h-4" />
                            View Video
                          </a>
                          <button
                            onClick={handleProceedClick}
                            disabled={!jobStatus.supabase_video_url || jobStatus.status !== 'completed'}
                            className="w-full bg-light-purple hover:bg-light-purple/90 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-light-purple/50 flex items-center justify-center gap-2"
                          >
                            <Play className="w-5 h-5" />
                            Proceed
                          </button>
                        </div>
                      )}
                      
                      {/* Individual Videos (Collapsed Details) - Only show if NOT in split screen mode */}
                      {!splitScreenMode && (
                        <details className="bg-white rounded-2xl p-5 border border-light-lavender/40 transition-all duration-300 hover:bg-light-lavender/20">
                          <summary className="text-gray-900 font-bold cursor-pointer flex items-center gap-2 text-base">
                            <ArrowRight className="w-5 h-5" />
                            View Individual Speaker Videos
                          </summary>
                          
                          <div className="mt-5 space-y-4">
                            {jobStatus.speaker_a_video && (
                              <div>
                                <p className="font-semibold mb-2 flex items-center gap-2 text-light-purple">
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
                                <p className="font-semibold mb-2 flex items-center gap-2 text-light-purple">
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
                      )}
                    </div>
                  )}

                  {jobStatus.error && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
                      <p className="text-red-700 font-medium flex items-center gap-2">
                        <XCircle className="w-5 h-5" />
                        Error: {jobStatus.error}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* Proceed Modal */}
          {showProceedModal && jobStatus?.status === 'completed' && jobStatus?.supabase_video_url && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center border-2 border-light-purple/30 relative backdrop-blur-xl bg-light-purple">
                <button
                  onClick={() => setShowProceedModal(false)}
                  className="absolute top-4 right-4 text-white/80 hover:text-white transition-all duration-300 hover:scale-110 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-2xl animate-pulse">
                  <Sparkles className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Video Ready!</h2>
                <p className="leading-relaxed mb-8 font-medium text-sm sm:text-base text-light-lavender/90">
                  Your podcast video has been generated and saved to Supabase storage. What would you like to do next?
                </p>
                
                <div className="flex flex-col gap-3 sm:gap-4">
                  <button
                    onClick={handleGenerateNewVideo}
                    className="w-full px-6 py-3.5 bg-white/10 backdrop-blur-sm border-2 border-light-purple/50 text-light-lavender/90 rounded-xl font-bold hover:bg-white/20 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 transform hover:scale-[1.02]"
                  >
                    <Video className="w-5 h-5" />
                    Generate New Video
                  </button>
                  
                  <button
                    onClick={handleProceedToEditing}
                    className="w-full px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-bold hover:from-emerald-600 hover:to-green-700 transition-all duration-300 shadow-xl hover:shadow-2xl flex items-center justify-center gap-2 transform hover:scale-[1.02]"
                  >
                    <Play className="w-5 h-5" />
                    Proceed with Video Editing
                  </button>
                </div>
                
                <p className="text-xs mt-6 font-medium text-light-lavender/70">
                  Note: Your edited video will overwrite the original in Supabase storage
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AvatarVideoGenerator;