import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Upload, Users, Mic, Loader2, CheckCircle2, XCircle, Video, Play, Image as ImageIcon, Sparkles, Zap, ArrowRight, Info, Subtitles, X, TestTube } from "lucide-react";
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

  useEffect(() => {
    const initializeAudioFromNavigation = async () => {
      if (location.state?.audioFile) {
        setAudioFile(location.state.audioFile);
        setAudioFileName(location.state.audioFileName || location.state.audioFile.name || 'final_audio.wav');
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

          {(imageFile || imagePreview) && !customAvatarId && (
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-2 border-purple-400/40 rounded-2xl p-4 backdrop-blur-sm">
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
                  <div className="w-12 h-6 bg-white/20 rounded-full peer peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-pink-500 transition-all duration-300"></div>
                  <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-all duration-300 peer-checked:translate-x-6 shadow-md"></div>
                </div>
                <div className="flex-1">
                  <span className="text-white font-medium flex items-center gap-2 group-hover:text-purple-200 transition-colors">
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
                  <p className="text-purple-300 text-xs mt-1">
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
          {loadingAvatars ? (
            <div className="flex items-center justify-center py-8 bg-white/5 rounded-2xl">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4 max-h-80 overflow-y-auto pr-1">
              {avatars.map((a) => {
                const isSelected = avatar?.avatar_id === a.avatar_id;
                return (
                  <button
                    key={a.avatar_id}
                    onClick={() => setAvatar(a)}
                    className={`relative rounded-2xl overflow-hidden border-2 transition-all duration-300 text-left ${
                      isSelected
                        ? 'border-purple-400 ring-4 ring-purple-300/40 shadow-xl shadow-purple-500/40'
                        : 'border-white/15 hover:border-purple-200/40'
                    }`}
                  >
                    <div className="w-full h-32 bg-black/20">
                      {a.preview_image_url ? (
                        <img
                          src={a.preview_image_url}
                          alt={a.avatar_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
                          No preview
                        </div>
                      )}
                    </div>
                    <div className="p-3 bg-white/10 backdrop-blur-sm">
                      <p className="text-white font-semibold">{a.avatar_name}</p>
                      <p className="text-purple-200 text-xs">
                        {a.gender || 'Unknown gender'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {avatar && (
            <div className="mt-3 text-purple-200 text-sm bg-purple-500/10 rounded-xl p-3 border border-purple-400/20">
              <p>
                Selected: <span className="font-semibold text-white">{avatar.avatar_name}</span>
              </p>
            </div>
          )}
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

            {/* NEW: Split Screen Mode Toggle Card */}
            <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-2xl hover:shadow-purple-500/20 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-xl">Split Screen Mode</h3>
                  <p className="text-purple-200 text-sm">Generate separate speaker videos</p>
                </div>
              </div>

              <label className="flex items-center gap-4 cursor-pointer group bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-2 border-cyan-400/40 rounded-2xl p-5 hover:border-cyan-400/60 transition-all duration-300">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={splitScreenMode}
                    onChange={(e) => setSplitScreenMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-16 h-8 bg-white/20 rounded-full peer peer-checked:bg-gradient-to-r peer-checked:from-cyan-500 peer-checked:to-blue-500 transition-all duration-300"></div>
                  <div className="absolute left-1 top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 peer-checked:translate-x-8 shadow-lg"></div>
                </div>
                <div className="flex-1">
                  <span className="text-white font-bold text-lg block group-hover:text-cyan-100 transition-colors">
                    Enable Split Screen Videos
                  </span>
                  <span className="text-purple-300 text-sm">
                    {splitScreenMode ? "Two separate videos with timeline-synced silence" : "Standard merged video"}
                  </span>
                </div>
              </label>

              {splitScreenMode && (
                <div className="mt-4 bg-cyan-500/20 border-2 border-cyan-400/60 rounded-xl p-4">
                  <p className="text-cyan-100 text-sm flex items-start gap-2">
                    <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>
                      Each speaker will have their own full-length video with silence during the other speaker's turns. 
                      Perfect for manual split-screen editing!
                    </span>
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
                  "Enable split-screen mode for separate videos",
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
            {/* Testing Mode Toggle */}
            <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/30 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TestTube className="w-5 h-5 text-yellow-400" />
                  <div>
                    <p className="text-white font-semibold text-sm">Testing Mode</p>
                    <p className="text-purple-300 text-xs">Use sample video (1 min) instead of API</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsTestingMode(!isTestingMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isTestingMode ? 'bg-yellow-500' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isTestingMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {isTestingMode && (
                <div className="mt-3 p-3 bg-yellow-500/20 border border-yellow-400/50 rounded-xl">
                  <p className="text-yellow-200 text-xs">
                    ⚠️ Testing Mode: A sample video will be generated after 5 seconds. No actual API calls will be made.
                  </p>
                </div>
              )}
            </div>
            
            <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-2xl sticky top-6">
              <button
                onClick={handleProcess}
                disabled={isProcessing || !audioFile}
                className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 hover:from-purple-600 hover:via-pink-600 hover:to-rose-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-5 px-8 rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 shadow-2xl hover:shadow-purple-500/50 transform hover:scale-105 disabled:transform-none text-lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    {isTestingMode ? 'Testing Mode: Processing...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6" />
                    {isTestingMode ? 'Generate (Testing Mode)' : 'Generate Avatar Videos'}
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
                      
                      {/* Merged Video - Only show if NOT in split screen mode */}
                      {jobStatus.merged_video_url && !splitScreenMode && (
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
                        <div className="bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-indigo-500/20 rounded-2xl p-6 border-2 border-cyan-400/60 backdrop-blur-sm">
                          <div className="flex items-center justify-between mb-6">
                            <p className="text-white font-bold flex items-center gap-2 text-lg">
                              <Users className="w-6 h-6" />
                              Split Screen Videos Ready
                            </p>
                            <span className="px-4 py-2 bg-cyan-500/30 border border-cyan-400/60 rounded-full text-cyan-100 text-sm font-semibold flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4" />
                              Timeline-Synced
                            </span>
                          </div>

                          <div className="grid md:grid-cols-2 gap-6">
                            {/* Speaker A Video */}
                            {jobStatus.speaker_a_video && (
                              <div className="bg-white/5 rounded-xl p-4 border border-white/20">
                                <p className="text-blue-200 font-semibold mb-3 flex items-center gap-2">
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
                              <div className="bg-white/5 rounded-xl p-4 border border-white/20">
                                <p className="text-pink-200 font-semibold mb-3 flex items-center gap-2">
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
                          <div className="mt-6 bg-cyan-500/20 border-2 border-cyan-400/60 rounded-xl p-4">
                            <p className="text-cyan-100 text-sm flex items-start gap-2">
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
                        <div className="bg-gradient-to-r from-emerald-500/15 to-teal-500/15 rounded-2xl p-6 border-2 border-emerald-400/50 backdrop-blur-sm space-y-4">
                          <p className="text-emerald-100 font-semibold flex items-center gap-2 text-lg">
                            <Sparkles className="w-5 h-5" />
                            Video Saved to Supabase Storage
                          </p>
                          <a
                            href={jobStatus.supabase_video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-white font-semibold px-4 py-2 rounded-xl bg-emerald-500/80 hover:bg-emerald-500 transition-all duration-300"
                          >
                            <Upload className="w-4 h-4" />
                            View Video
                          </a>
                          <button
                            onClick={handleProceedClick}
                            disabled={!jobStatus.supabase_video_url || jobStatus.status !== 'completed'}
                            className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-indigo-500/50 flex items-center justify-center gap-2"
                          >
                            <Play className="w-5 h-5" />
                            Proceed
                          </button>
                        </div>
                      )}
                      
                      {/* Individual Videos (Collapsed Details) - Only show if NOT in split screen mode */}
                      {!splitScreenMode && (
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
                      )}
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

      {/* Proceed Modal */}
      {showProceedModal && jobStatus?.status === 'completed' && jobStatus?.supabase_video_url && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-purple-800 to-indigo-900 rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-purple-600 relative">
            <button
              onClick={() => setShowProceedModal(false)}
              className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <Sparkles className="w-16 h-16 text-yellow-300 mx-auto mb-6 animate-pulse" />
            <h2 className="text-3xl font-bold text-white mb-4">Video Ready!</h2>
            <p className="text-purple-200 leading-relaxed mb-8">
              Your podcast video has been generated and saved to Supabase storage. What would you like to do next?
            </p>
            
            <div className="flex flex-col gap-4">
              <button
                onClick={handleGenerateNewVideo}
                className="w-full px-6 py-3 bg-white/10 border border-purple-400 text-purple-200 rounded-xl font-semibold hover:bg-white/20 transition-all duration-300 shadow-md flex items-center justify-center gap-2"
              >
                <Video className="w-5 h-5" />
                Generate New Video
              </button>
              
              <button
                onClick={handleProceedToEditing}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Proceed with Video Editing
              </button>
            </div>
            
            <p className="text-purple-300 text-xs mt-6">
              Note: Your edited video will overwrite the original in Supabase storage
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default AvatarVideoGenerator;