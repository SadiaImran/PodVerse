import React, { useState, useRef, useEffect, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugin/wavesurfer.regions.min.js";
import { Play, Pause, Square, Upload, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import BaseLayout from "../components/layouts/BaseLayout";
import { Sidebar } from "../components/comp-audio-editing/comp-audio-edit-sidebar";
import { MainPanel } from "../components/comp-audio-editing/comp-audio-edit-main-panel";

const AudioEditor = () => {
  // State for audio tracks/clips
  const [audioClips, setAudioClips] = useState([]);
  const [audioBuffers, setAudioBuffers] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [volume, setVolume] = useState(75);
  const [zoom, setZoom] = useState(1);
  const [selectedClipId, setSelectedClipId] = useState(null);

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
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

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
      
      // Create audio buffer for the stock track
      const newBuffers = { ...audioBuffers };
      
      try {
        // Fetch the audio file and create buffer
        const response = await fetch(stockTrack.url);
        const arrayBuffer = await response.arrayBuffer();
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        newBuffers[stockTrack.id] = audioBuffer;
      } catch (bufferError) {
        console.error('Error loading audio buffer for stock track:', bufferError);
      }

      // Add to audio clips
      const updatedClips = [...audioClips, stockTrack];
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

        const clip = {
          id: clipId,
          name: file.name,
          url,
          duration,
          startTime: 0, // All tracks start from the beginning
          endTime: duration,
          file,
          color: 'bg-purple-500'
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
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            currentTime={currentTime}
            setCurrentTime={setCurrentTime}
            totalDuration={totalDuration}
            volume={volume}
            setVolume={setVolume}
            zoom={zoom}
            setZoom={setZoom}
          />
        </div>

        {/* Hidden WaveSurfer container for audio processing */}
        <div 
          ref={waveformRef} 
          className="hidden"
        ></div>
      </div>
    </BaseLayout>
  );
};

export default AudioEditor;