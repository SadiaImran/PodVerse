import React, { useState, useRef, useEffect, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugin/wavesurfer.regions.min.js";
import { Play, Pause, Square, Upload, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import BaseLayout from "../components/layouts/BaseLayout";
import { Sidebar } from "../components/comp-audio-editing/comp-audio-edit-sidebar";
import { MainPanel } from "../components/comp-audio-editing/comp-audio-edit-main-panel";

const AudioEditor = () => {
  const [audioClips, setAudioClips] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [selectedClipId, setSelectedClipId] = useState(null);

  // Added missing ref
const waveformContainerRef = useRef(null);  
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const regionsRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioCtxRef = useRef(null);


    const getMinZoomLevel = useCallback(() => {
  if (!waveformContainerRef.current || !totalDuration) return 0.1;
  
  const containerWidth = waveformContainerRef.current.clientWidth - 48; // subtract padding
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
      waveColor: "blue",
      progressColor: "lightblue",
      barWidth: 2,
      barGap: 1,
      height: 120,
      dragToSeek: true,
      plugins: [regions],
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
    return () => {
      wavesurfer.destroy();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  // ✅ Format time helper
const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60); // 0–59 range
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};


  // 🔥 Helper: Convert AudioBuffer → Blob (WAV)
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
    if (!wavesurferRef.current || clips.length === 0) return;

    try {
      const getAudioContext = () => {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContext();
        }
        return audioCtxRef.current;
      };

      const ctx = getAudioContext();

      const decodedBuffers = await Promise.all(
        clips.map(async (clip) => {
          const arrayBuffer = await clip.file.arrayBuffer();
          return await ctx.decodeAudioData(arrayBuffer.slice(0));
        })
      );

      const sampleRate = ctx.sampleRate;
      const totalDur = decodedBuffers.reduce((sum, b) => sum + b.duration, 0);
      const length = Math.ceil(totalDur * sampleRate);
      const offline = new OfflineAudioContext(1, length, sampleRate);

      let offset = 0;
      decodedBuffers.forEach((buffer) => {
        const src = offline.createBufferSource();
        src.buffer = buffer;
        src.connect(offline.destination);
        src.start(offset);
        offset += buffer.duration;
      });

      const rendered = await offline.startRendering();
      const blob = audioBufferToWav(rendered);

      await wavesurferRef.current.loadBlob(blob);

      setTotalDuration(rendered.duration);
      regionsRef.current?.clearRegions();

      let current = 0;
      clips.forEach((clip, index) => {
        const start = current;
        const end = current + clip.duration;
        regionsRef.current?.addRegion({
          id: clip.id,
          start,
          end,
          color: `rgba(0,0,255,0.2)`,
          content: clip.name,
          resize: false,
          drag: false,
        });
        current = end;
      });
    } catch (err) {
      console.error("Error loading combined audio:", err);
    }
  }, []);

  const handleFileUpload = async (files) => {
    const newClips = [];
    let currentEndTime = totalDuration;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("audio/")) continue;

      const audio = new Audio();
      const url = URL.createObjectURL(file);
      audio.src = url;

      await new Promise((resolve) => {
        audio.addEventListener("loadedmetadata", () => resolve());
      });

      const duration = audio.duration;

      newClips.push({
        id: `clip-${Date.now()}-${Math.random()}`,
        name: file.name,
        url,
        duration,
        startTime: currentEndTime,
        endTime: currentEndTime + duration,
        file,
      });

      currentEndTime += duration;
    }

    if (newClips.length > 0) {
      const updatedClips = [...audioClips, ...newClips];
      setAudioClips(updatedClips);
      await loadCombinedAudio(updatedClips);
    }
  };

  const removeClip = async (clipId) => {
  // Filter out the removed clip
  const updatedClips = audioClips.filter((clip) => clip.id !== clipId);

  // Update state
  setAudioClips(updatedClips);

  // If there are clips left, reload waveform
  if (updatedClips.length > 0) {
    await loadCombinedAudio(updatedClips);
  } else {
    // If no clips left → clear waveform
    wavesurferRef.current.empty();
    regionsRef.current?.clearRegions();
    setTotalDuration(0);
    setCurrentTime(0);
  }
};

const TimeMarkers = ({ duration, zoom, interval = 5 }) => {
  if (!duration) return null;

  const pixelsPerSecond = zoom * 50; 
  const totalWidth = duration * pixelsPerSecond;
  const seconds = Math.ceil(duration);

  const markers = [];
  for (let i = 0; i <= seconds; i += interval) {
    const left = i * pixelsPerSecond;
    markers.push(
      <div
        key={i}
        style={{
          position: "absolute",
          left: `${left}px`,
          top: 0,
          fontSize: "12px",
          color: "#666",
          transform: "translateX(-50%)",
        }}
      >
        {formatTime(i)}   {/* ✅ ab properly MM:SS dikhayega */}
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: `${totalWidth}px`,
        height: "20px",
        borderBottom: "1px solid #ccc",
        background: "#fafafa",
      }}
    >
      {markers}
    </div>
  );
};

  return (
    <BaseLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="flex h-screen">
            {/* Left Sidebar */}
          <Sidebar></Sidebar>
          {/* Main Content */}
         

          <MainPanel></MainPanel>
        </div>



      </div>
    </BaseLayout>
  );
};

export default AudioEditor;

