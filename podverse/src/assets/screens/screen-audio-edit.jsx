import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugin/wavesurfer.regions.min.js";
import { Play, Pause, Square, Upload, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import BaseLayout from "../components/layouts/BaseLayout";
import { Sidebar } from "../components/comp-audio-editing/comp-audio-edit-sidebar";
import { MainPanel } from "../components/comp-audio-editing/comp-audio-edit-main-panel";
import { useAuth } from "../context/AuthContext";
import { getSupabaseAuthorizedtoken } from "../supabaseClient";

const stripQueryString = (value = '') => value.split('?')[0];

const extractFileName = (value = '') => {
  const withoutQuery = stripQueryString(value);
  const parts = withoutQuery.split('/');
  return parts[parts.length - 1] || withoutQuery;
};

const getFriendlyTrackName = (value = '', fallback = 'Track') => {
  const baseName = extractFileName(value) || fallback;
  const underscoreIndex = baseName.indexOf('_');
  const friendly = underscoreIndex > 0 ? baseName.slice(0, underscoreIndex) : baseName;
  return friendly || fallback;
};

const sanitizeFileName = (value = '', fallbackPrefix = 'track') => {
  const extracted = extractFileName(value) || `${fallbackPrefix}.wav`;
  const sanitized = extracted.replace(/[^a-zA-Z0-9._-]/g, '_');
  if (sanitized) {
    return sanitized;
  }
  return `${fallbackPrefix}_${Date.now()}.wav`;
};

const buildSanitizedFileName = (value = '', fallbackPrefix = 'track') => {
  const base = value && value.includes('.') ? value : `${value || fallbackPrefix}.wav`;
  return sanitizeFileName(base, fallbackPrefix);
};

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const AUDIO_EDIT_API = 'http://localhost:8000/audio-edit';

const mergeAudioBlobs = async (audioBlobs, filenames) => {
  const form = new FormData();
  audioBlobs.forEach((blob, index) => {
    const fileName = filenames[index] || `track_${index + 1}.wav`;
    const file = new File([blob], fileName, { type: blob.type || 'audio/wav' });
    form.append('files', file);
  });

  const response = await fetch(`${AUDIO_EDIT_API}/merge_audio`, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to merge audio tracks');
  }

  return response.blob();
};

const downloadAudioAsBlob = async (url) => {
  const response = await fetch(url);
  const blob = await response.blob();
  return blob;
};

const uploadAudioToBackend = async (blob, filename, endpoint, formData = {}) => {
  const safeName = buildSanitizedFileName(filename || 'track.wav');
  const file = new File([blob], safeName, { type: blob.type || 'audio/wav' });
  const form = new FormData();
  form.append('file', file);
  
  Object.entries(formData).forEach(([key, value]) => {
      form.append(key, value);
  });
  
  const response = await fetch(`${AUDIO_EDIT_API}${endpoint}`, {
      method: 'POST',
      body: form,
  });
  
  if (!response.ok) {
      throw new Error(`Backend error: ${response.statusText}`);
  }
  
  return response.blob();
};

const AudioEditor = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // State for audio tracks/clips
  const [audioClips, setAudioClips] = useState([]);
  const [audioBuffers, setAudioBuffers] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [volume, setVolume] = useState(75);
  const [zoom, setZoom] = useState(1);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [recordingLoaded, setRecordingLoaded] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizedAudioUrl, setFinalizedAudioUrl] = useState(null);
  const [finalizedAudioName, setFinalizedAudioName] = useState(null);
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const finalizedAudioBlobRef = useRef(null);

  // Refs
  const waveformContainerRef = useRef(null);
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const regionsRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioCtxRef = useRef(null);

  const getMinZoomLevel = useCallback(() => {
    if (!waveformContainerRef.current || !totalDuration) return 0.1;

    const containerWidth = waveformContainerRef.current.clientWidth - 48;
    const minZoom = containerWidth / (totalDuration * 50);
    return Math.max(minZoom, 0.1);
  }, [totalDuration]);

  // Init WaveSurfer
  useEffect(() => {
    if (!waveformRef.current) return;

    const regions = RegionsPlugin.create();
    regionsRef.current = regions;

    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "#8b5cf6", // Purple theme
      progressColor: "#a855f7",
      barWidth: 2,
      barGap: 1,
      height: 120,
      dragToSeek: true,
      plugins: [regions],
      backend: 'WebAudio',
      mediaControls: false,
    });

    wavesurferRef.current = wavesurfer;

    wavesurfer.on("play", () => setIsPlaying(true));
    wavesurfer.on("pause", () => setIsPlaying(false));
    wavesurfer.on("timeupdate", (time) => setCurrentTime(time));
    wavesurfer.on("ready", () => setTotalDuration(wavesurfer.getDuration()));

    wavesurfer.on("audioprocess", (time) => {
      setCurrentTime(time);
    });

    wavesurfer.on("finish", () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    wavesurfer.on("error", (e) => {
      console.error("WaveSurfer error:", e);
    });

    return () => {
      try {
        wavesurfer.destroy();
      } catch (e) {
        console.error("Error destroying wavesurfer:", e);
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => { });
        audioCtxRef.current = null;
      }
    };
  }, []);

  // Store original recording path for overwrite
  const [originalRecordingPath, setOriginalRecordingPath] = useState(null);

  // Store recording filename for finalize
  const [recordingFilename, setRecordingFilename] = useState(null);

  // Load recording from URL if provided (from recording modal)
  useEffect(() => {
    if (recordingLoaded || audioClips.length > 0) return; // Don't reload if already loaded or clips exist

    const recordingUrl = location.state?.recordingUrl || sessionStorage.getItem('recordingUrl');
    const storedFilename = sessionStorage.getItem('recordingFilename') || 'recording.ogg';

    if (recordingUrl) {
      // Store the filename in state for later use in finalize
      setRecordingFilename(storedFilename);

      // Load recording as audio track
      const loadRecordingFromUrl = async () => {
        try {
          console.log('Loading recording from URL:', recordingUrl);

          // Create audio element to get duration
          const audio = new Audio();
          audio.crossOrigin = 'anonymous';
          audio.preload = 'auto';
          audio.src = recordingUrl;

          await new Promise((resolve, reject) => {
            let timeoutRef;
            const cleanup = () => {
              audio.removeEventListener('loadedmetadata', onLoaded);
              audio.removeEventListener('error', onError);
              if (timeoutRef) {
                clearTimeout(timeoutRef);
              }
            };

            const onLoaded = () => {
              cleanup();
              resolve();
            };

            const onError = (e) => {
              cleanup();
              reject(e instanceof Error ? e : new Error('Failed to load audio metadata'));
            };

            audio.addEventListener('loadedmetadata', onLoaded);
            audio.addEventListener('error', onError);

            timeoutRef = setTimeout(() => {
              cleanup();
              reject(new Error('Timeout loading audio'));
            }, 20000); // Allow up to 20s for signed URLs / large files
          });

          const duration = audio.duration;
          const clipId = `recording-${Date.now()}`;
          const friendlyName = getFriendlyTrackName(storedFilename || recordingUrl, 'Recording');

          const clip = {
            id: clipId,
            name: storedFilename || friendlyName,
            displayName: friendlyName,
            originalName: storedFilename || extractFileName(recordingUrl),
            url: recordingUrl,
            duration,
            startTime: 0,
            endTime: duration,
            color: 'bg-green-500'
          };

          // Try to load audio buffer for waveform
          try {
            const response = await fetch(recordingUrl);
            const arrayBuffer = await response.arrayBuffer();
            const audioContext = new AudioContext();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            setAudioBuffers(prev => ({ ...prev, [clipId]: audioBuffer }));
          } catch (bufferError) {
            console.warn('Could not load audio buffer for waveform:', bufferError);
          }

          setAudioClips([clip]);
          setRecordingLoaded(true);

          // Extract and store original recording path before cleanup
          let storagePath = null;
          if (recordingUrl.includes('/storage/v1/object/sign/recordings/')) {
            const urlParts = recordingUrl.split('/storage/v1/object/sign/recordings/');
            if (urlParts.length > 1) {
              storagePath = urlParts[1].split('?')[0]; // Remove query params
            }
          } else if (recordingUrl.includes('/storage/v1/object/public/recordings/')) {
            const urlParts = recordingUrl.split('/storage/v1/object/public/recordings/');
            if (urlParts.length > 1) {
              storagePath = urlParts[1].split('?')[0];
            }
          }

          // Fallback to filename if path extraction failed
          if (!storagePath && storedFilename) {
            storagePath = storedFilename;
          }

          // Store original path for overwrite
          if (storagePath) {
            setOriginalRecordingPath(storagePath);
            sessionStorage.setItem('originalRecordingPath', storagePath);
            console.log('📁 Original recording path stored for overwrite:', storagePath);
          }

          // Clean up sessionStorage (but keep originalRecordingPath)
          sessionStorage.removeItem('recordingUrl');
          sessionStorage.removeItem('recordingFilename');

          console.log('Recording loaded successfully');
        } catch (error) {
          console.error('Error loading recording from URL:', error);
          // Clean up sessionStorage on error too
          sessionStorage.removeItem('recordingUrl');
          sessionStorage.removeItem('recordingFilename');
        }
      };

      loadRecordingFromUrl();
    }
  }, [location.state, recordingLoaded, audioClips.length]);

  // Format time helper
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Helper: Convert AudioBuffer → Blob (WAV)
  const audioBufferToWav = (buffer) => {
    const numOfChan = buffer.numberOfChannels,
      length = buffer.length * numOfChan * 2 + 44,
      bufferArray = new ArrayBuffer(length),
      view = new DataView(bufferArray),
      channels = [],
      sampleRate = buffer.sampleRate;

    let offset = 0;
    let pos = 0;

    const setUint16 = (data) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };
    const setUint32 = (data) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    // RIFF header
    setUint32(0x46464952);
    setUint32(length - 8);
    setUint32(0x45564157);

    // fmt chunk
    setUint32(0x20746d66);
    setUint32(16);
    setUint16(1);
    setUint16(numOfChan);
    setUint32(sampleRate);
    setUint32(sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2);
    setUint16(16);

    // data chunk
    setUint32(0x61746164);
    setUint32(length - pos - 4);

    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        const sample = Math.max(-1, Math.min(1, channels[i][offset]));
        view.setInt16(
          pos,
          sample < 0 ? sample * 0x8000 : sample * 0x7fff,
          true
        );
        pos += 2;
      }
      offset++;
    }

    return new Blob([bufferArray], { type: "audio/wav" });
  };

  const loadCombinedAudio = useCallback(async (clips) => {
    if (clips.length === 0) return;

    try {
      // For individual tracks, we don't need to combine them
      // Just set the total duration to the longest track
      const maxDuration = Math.max(...clips.map(clip => clip.duration));
      setTotalDuration(maxDuration);

      // No need for regions since we're using individual track waveforms
      console.log(`Loaded ${clips.length} tracks, max duration: ${maxDuration}s`);
    } catch (err) {
      console.error("Error loading combined audio:", err);
    }
  }, []);

  // Handle adding stock audio from Sidebar to main panel
  const handleAddStockAudio = async (stockTrack) => {
    try {
      console.log('Adding stock audio to main panel:', stockTrack);
      const friendlyName = getFriendlyTrackName(
        stockTrack.displayName || stockTrack.name || stockTrack.filename || stockTrack.id,
        'Track'
      );
      const normalizedTrack = {
        ...stockTrack,
        displayName: stockTrack.displayName || friendlyName,
        name: stockTrack.name || friendlyName,
        originalName: stockTrack.originalName || stockTrack.name || stockTrack.filename || stockTrack.path || friendlyName
      };

      // Create audio buffer for the stock track
      const newBuffers = { ...audioBuffers };

      try {
        // Fetch the audio file and create buffer
        const response = await fetch(normalizedTrack.url);
        const arrayBuffer = await response.arrayBuffer();
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        newBuffers[normalizedTrack.id] = audioBuffer;
      } catch (bufferError) {
        console.error('Error loading audio buffer for stock track:', bufferError);
      }

      // Add to audio clips
      const updatedClips = [...audioClips, normalizedTrack];
      setAudioClips(updatedClips);
      setAudioBuffers(newBuffers);

      // Small delay to ensure URL is properly set before loading
      setTimeout(async () => {
        await loadCombinedAudio(updatedClips);
      }, 100);

      console.log('Stock audio added successfully to main panel');
    } catch (error) {
      console.error('Error adding stock audio to main panel:', error);
      alert('Error adding audio to panel: ' + error.message);
    }
  };

  const handleFinalizeAudio = useCallback(async () => {
    if (audioClips.length === 0) {
      alert('Please add at least one track before finalizing.');
      return;
    }
    setIsFinalizing(true);
    try {
      const sortedClips = [...audioClips].sort(
        (a, b) => (a.startTime || 0) - (b.startTime || 0)
      );

      const audioBlobs = [];
      const filenames = [];

      for (let i = 0; i < sortedClips.length; i++) {
        const clip = sortedClips[i];
        const response = await fetch(clip.url);
        if (!response.ok) {
          throw new Error(`Failed to download audio for track ${clip.displayName || clip.name}`);
        }
        const blob = await response.blob();
        audioBlobs.push(blob);

        const label =
          clip.displayName ||
          clip.name ||
          clip.originalName ||
          `track_${i + 1}`;
        const fallback = label.replace(/\s+/g, '_').toLowerCase() || `track_${i + 1}`;
        filenames.push(buildSanitizedFileName(`${label}.wav`, fallback));
      }

      const mergedBlob = await mergeAudioBlobs(audioBlobs, filenames);
      const finalName = `edited_audio_${new Date()
        .toISOString()
        .replace(/[:.]/g, '-')}.wav`;

      if (finalizedAudioUrl) {
        URL.revokeObjectURL(finalizedAudioUrl);
      }

      const objectUrl = URL.createObjectURL(mergedBlob);
      finalizedAudioBlobRef.current = mergedBlob;
      setFinalizedAudioUrl(objectUrl);
      setFinalizedAudioName(finalName);

      let kbIdFromStorage = sessionStorage.getItem('current_kb_id');
      if (!kbIdFromStorage) {
        const kbInfoRaw = sessionStorage.getItem('selectedKnowledgeBase');
        if (kbInfoRaw) {
          try {
            const parsed = JSON.parse(kbInfoRaw);
            kbIdFromStorage = parsed?.id || parsed?.selectedKbId || null;
          } catch {
            kbIdFromStorage = null;
          }
        }
      }
      kbIdFromStorage = kbIdFromStorage || 'kb_unknown';

      let storedPodcastTitle = '';
      try {
        const configRaw = sessionStorage.getItem('podcastConfig');
        if (configRaw) {
          storedPodcastTitle = JSON.parse(configRaw)?.podcastName || '';
        }
      } catch {
        storedPodcastTitle = '';
      }

      const metaPayload = {
        userId: user?.id || null,
        kbId: kbIdFromStorage || 'kb_unknown',
        podcastTitle:
          storedPodcastTitle ||
          (recordingFilename ? recordingFilename.replace(/\.[^/.]+$/, '') : '') ||
          finalName.replace('.wav', ''),
      };

      try {
        sessionStorage.setItem('videoGenMeta', JSON.stringify(metaPayload));
      } catch (err) {
        console.warn('Unable to persist videoGen metadata:', err);
      }

      // Upload edited audio to Supabase
      let supabaseAudioUrl = null;
      let supabaseStoragePath = null;
      try {
        console.log('📤 Uploading edited audio to Supabase...');
        const token = await getSupabaseAuthorizedtoken();
        const audioFile = new File([mergedBlob], finalName, { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('file', audioFile);
        formData.append('user_id', metaPayload.userId || 'unknown');
        formData.append('kb_id', metaPayload.kbId);
        formData.append('podcast_title', metaPayload.podcastTitle);

        // Add original recording path to overwrite if available
        const originalPath = originalRecordingPath || sessionStorage.getItem('originalRecordingPath');
        if (originalPath) {
          formData.append('original_recording_path', originalPath);
          console.log('🔄 Will overwrite original recording:', originalPath);
        }

        const uploadResponse = await fetch('http://localhost:8000/audios/upload-edited-audio', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          console.log('✅ Edited audio uploaded to Supabase:', uploadResult.audio_url);
          supabaseAudioUrl = uploadResult.audio_url;
          supabaseStoragePath = uploadResult.storage_path || originalPath || null;

          if (supabaseStoragePath) {
            setOriginalRecordingPath(supabaseStoragePath);
            sessionStorage.setItem('originalRecordingPath', supabaseStoragePath);
          }

          if (supabaseAudioUrl) {
            sessionStorage.setItem('recordingUrl', supabaseAudioUrl);
            sessionStorage.setItem('recordingFilename', finalName);
          }

          // Store Supabase URL for video generation (preferred over blob)
          sessionStorage.setItem('editedAudioSupabaseUrl', supabaseAudioUrl);
        } else {
          const errorText = await uploadResponse.text();
          console.warn('⚠️ Failed to upload edited audio to Supabase:', errorText);
        }
      } catch (uploadErr) {
        console.warn('⚠️ Error uploading edited audio to Supabase:', uploadErr);
        // Continue even if upload fails
      }

      // Store audio info for video generation
      // Prefer Supabase URL if available, otherwise try to store blob (may fail if too large)
      if (supabaseAudioUrl) {
        // Use Supabase URL instead of blob
        sessionStorage.setItem('videoGenAudioUrl', supabaseAudioUrl);
        sessionStorage.setItem('videoGenAudioName', finalName);
        sessionStorage.setItem('videoGenAudioSource', 'supabase'); // Mark as Supabase URL
      } else {
        // Fallback: try to store blob (may fail for large files)
        try {
          const dataUrl = await blobToDataUrl(mergedBlob);
          sessionStorage.setItem('videoGenAudioDataUrl', dataUrl);
          sessionStorage.setItem('videoGenAudioName', finalName);
          sessionStorage.setItem('videoGenAudioSource', 'blob'); // Mark as blob
        } catch (err) {
          console.warn('Unable to cache finalized audio for navigation (blob too large):', err);
          // Still store the name and object URL reference
          sessionStorage.setItem('videoGenAudioName', finalName);
          sessionStorage.setItem('videoGenAudioObjectUrl', objectUrl);
          sessionStorage.setItem('videoGenAudioSource', 'objectUrl'); // Mark as object URL
        }
      }

      setFinalizeModalOpen(true);
    } catch (error) {
      console.error('Finalize audio error:', error);
      alert(error.message || 'Failed to finalize audio. Please try again.');
    } finally {
      setIsFinalizing(false);
    }
  }, [audioClips, finalizedAudioUrl]);

  const handleKeepEditing = useCallback(() => {
    setFinalizeModalOpen(false);
  }, []);

  const handleGoToVideoGeneration = useCallback(() => {
    if (!finalizedAudioBlobRef.current || !finalizedAudioName) {
      alert('Please finalize your audio before continuing.');
      return;
    }

    const audioFile = new File(
      [finalizedAudioBlobRef.current],
      finalizedAudioName,
      { type: finalizedAudioBlobRef.current.type || 'audio/wav' }
    );

    // Check if script data exists (from automatic audio generation)
    const scriptDataStr = sessionStorage.getItem('autoAudioScriptData');
    const audioDuration = parseFloat(sessionStorage.getItem('autoAudioDuration') || '0');
    let scriptData = null;
    
    if (scriptDataStr) {
      try {
        scriptData = JSON.parse(scriptDataStr);
        console.log('✅ Found script data from automatic audio generation');
      } catch (e) {
        console.warn('Failed to parse script data:', e);
      }
    }

    navigate('/video-generation', {
      state: {
        source: 'audio-edit',
        audioFile,
        audioFileName: finalizedAudioName,
        fromAutoAudio: !!scriptData,
        scriptData: scriptData,
        audioDuration: audioDuration
      },
    });
  }, [finalizedAudioName, navigate]);

  const handleTracksChange = useCallback(async (updatedTracks) => {
    setAudioClips(updatedTracks);
    await loadCombinedAudio(updatedTracks);
  }, [loadCombinedAudio]);

  // Handle file upload from Sidebar - THIS IS THE KEY FUNCTION
  const handleFileUpload = async (files) => {
    const newClips = [];
    const newBuffers = { ...audioBuffers };

    // Process all files in parallel for better performance
    const filePromises = Array.from(files).map(async (file) => {
      if (!file.type.startsWith("audio/")) return null;

      try {
        const audio = new Audio();
        const url = URL.createObjectURL(file);
        audio.src = url;

        await new Promise((resolve) => {
          audio.addEventListener("loadedmetadata", () => resolve());
        });

        const duration = audio.duration;
        const clipId = `clip-${Date.now()}-${Math.random()}`;

        const friendlyName = getFriendlyTrackName(file.name, 'Track');
        const clip = {
          id: clipId,
          name: file.name || friendlyName,
          displayName: friendlyName,
          originalName: file.name || friendlyName,
          url,
          duration,
          startTime: 0, // All tracks start from the beginning
          endTime: duration,
          file,
          color: 'bg-light-purple'
        };

        // Load audio buffer for individual track waveforms
        try {
          const arrayBuffer = await file.arrayBuffer();
          const audioContext = new AudioContext();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          newBuffers[clipId] = audioBuffer;
        } catch (bufferError) {
          console.error('Error loading audio buffer:', bufferError);
        }

        return clip;
      } catch (error) {
        console.error('Error processing file:', file.name, error);
        return null;
      }
    });

    // Wait for all files to be processed
    const processedClips = await Promise.all(filePromises);
    const validClips = processedClips.filter(clip => clip !== null);

    if (validClips.length > 0) {
      const updatedClips = [...audioClips, ...validClips];
      setAudioClips(updatedClips);
      setAudioBuffers(newBuffers);
      await loadCombinedAudio(updatedClips);
    }
  };

  // Handle clip removal
  const removeClip = async (clipId) => {
    const updatedClips = audioClips.filter((clip) => clip.id !== clipId);
    setAudioClips(updatedClips);

    // Remove from audio buffers
    const newBuffers = { ...audioBuffers };
    delete newBuffers[clipId];
    setAudioBuffers(newBuffers);

    if (updatedClips.length > 0) {
      await loadCombinedAudio(updatedClips);
    } else {
      wavesurferRef.current?.empty();
      regionsRef.current?.clearRegions();
      setTotalDuration(0);
      setCurrentTime(0);
    }
  };

  // Playback controls
  const togglePlayback = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    setZoom(prev => Math.min(3, prev + 0.2));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(0.1, prev - 0.2));
  };

  useEffect(() => {
    return () => {
      if (finalizedAudioUrl) {
        URL.revokeObjectURL(finalizedAudioUrl);
      }
    };
  }, [finalizedAudioUrl]);

  // Handle Magic Silence Removal
  const handleRemoveSilence = useCallback(async (trackId) => {
    const track = audioClips.find(t => t.id === trackId);
    if (!track) return;

    const friendlyName = getFriendlyTrackName(track.name || track.originalName, 'Track');
    const fallbackPrefix = friendlyName.replace(/\s+/g, '_').toLowerCase() || 'track';

    // Notification
    const loadingNotif = document.createElement('div');
    loadingNotif.textContent = `Removing silence from ${friendlyName}...`;
    loadingNotif.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    document.body.appendChild(loadingNotif);

    try {
      // Download original audio
      const audioBlob = await downloadAudioAsBlob(track.url);
      
      // Send to backend
      const processedBlob = await uploadAudioToBackend(
        audioBlob,
        buildSanitizedFileName(`${friendlyName}.wav`, fallbackPrefix),
        '/remove-silence',
        { threshold: -40, duration: 0.5 }
      );

      // Create new track object
      const newUrl = URL.createObjectURL(processedBlob);
      
      // Get new duration
      const audio = new Audio(newUrl);
      await new Promise(resolve => {
        audio.addEventListener('loadedmetadata', () => resolve());
      });
      const newDuration = audio.duration;

      // Update audio clips
      setAudioClips(prev => prev.map(t => {
        if (t.id === trackId) {
          return {
            ...t,
            url: newUrl,
            duration: newDuration,
            name: `${t.name} (Cleaned)`,
            displayName: `${t.displayName} (Cleaned)`
          };
        }
        return t;
      }));

      // Refresh buffers
      try {
        const arrayBuffer = await processedBlob.arrayBuffer();
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        setAudioBuffers(prev => ({ ...prev, [trackId]: audioBuffer }));
      } catch (e) {
        console.error("Buffer update failed:", e);
      }

      // Success notification
      document.body.removeChild(loadingNotif);
      const notification = document.createElement('div');
      notification.textContent = 'Silence removed successfully!';
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      document.body.appendChild(notification);
      setTimeout(() => document.body.removeChild(notification), 3000);

    } catch (error) {
      console.error("Silence removal failed:", error);
      document.body.removeChild(loadingNotif);
      alert('Failed to remove silence: ' + error.message);
    }
  }, [audioClips]);

  return (
    <BaseLayout homeScreen={false} autoCollapse={true}>
      <div className="min-h-screen bg-gray-50">
        <div className="flex h-screen">
          {/* Pass props to Sidebar */}
          <Sidebar
            onFileUpload={handleFileUpload}
            audioTracks={audioClips}
            onAddStockAudio={handleAddStockAudio}
          />

          {/* Pass props to MainPanel */}
          <MainPanel
            audioTracks={audioClips}
            audioBuffers={audioBuffers}
            onRemoveTrack={removeClip}
            onTracksChange={handleTracksChange}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            currentTime={currentTime}
            setCurrentTime={setCurrentTime}
            totalDuration={totalDuration}
            volume={volume}
            setVolume={setVolume}
            zoom={zoom}
            setZoom={setZoom}
            onFinalizeAudio={handleFinalizeAudio}
            isFinalizing={isFinalizing}
            canFinalize={audioClips.length > 0}
            onRemoveSilence={handleRemoveSilence} 
          />
        </div>

        {/* Hidden WaveSurfer container for audio processing */}
        <div
          ref={waveformRef}
          className="hidden"
        ></div>

        {finalizeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 space-y-6 animate-slide-in-right">
              <div className="flex items-center gap-3 text-light-purple font-semibold">
                <Play className="w-6 h-6" />
                <span>Audio Finalized</span>
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-gray-900">Great work! Your edit is ready.</h2>
                <p className="text-gray-600 leading-relaxed">
                  {finalizedAudioName || 'Your audio'} has been merged and is ready for the next step.
                  You can keep refining here or jump into Video Generation to bring it to life.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleKeepEditing}
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Continue Editing
                </button>
                <button
                  onClick={handleGoToVideoGeneration}
                  className="flex-1 px-4 py-3 rounded-xl bg-light-purple text-white font-semibold shadow-md hover:shadow-lg hover:bg-light-purple/90 transition-all"
                >
                  Go to Video Generation
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BaseLayout>
  );
};

export default AudioEditor;