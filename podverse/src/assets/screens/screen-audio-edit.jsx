import React, { useState, useRef, useEffect, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugin/wavesurfer.regions.min.js";
import { Play, Pause, Square, Upload, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import BaseLayout from "../components/layouts/BaseLayout";


const AudioEditor = () => {
  const [audioClips, setAudioClips] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
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
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Audio Editor</h1>
      
              {/* Upload Button */}
              <button
                onClick={() => fileInputRef.current.click()}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-colors font-medium"
              >
                <Upload size={20} />
                Upload Audio
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="audio/*"
                className="hidden"
      
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              />
            </div>
            {/* Track List */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="p-4 flex-shrink-0">
                <h2 className="text-sm font-semibold text-gray-600 mb-3">
                  Track List ({audioClips.length})
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                {audioClips.length === 0 ?
                 (
                  <div className="text-gray-500 text-sm italic">No audio clips uploaded yet.</div>
                 ) : (
                  <div className="space-y-2">
                    {audioClips.map((clip) => (
                      <div
                        key={clip.id}
                        onClick={() => highlightClip(clip.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all hover:border-blue-300 ${
                          selectedClipId === clip.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 text-sm truncate">
                              {clip.name}
                            </h3>
                            <div className="text-xs text-gray-500 mt-1">
                              <div>{formatTime(clip.duration)}</div>
                              <div>{formatTime(clip.startTime)} - {formatTime(clip.endTime)}</div>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeClip(clip.id);
                            }}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>         
            </div>
          </div>
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top Controls Bar */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                {/* Playback Controls */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => wavesurferRef.current.playPause()}
                      disabled={!audioClips.length}
                      className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-full transition-colors"
                    >
                      {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                    </button>
      
                    <button
                      onClick={() => wavesurferRef.current.stop()}
                      disabled={!audioClips.length}
                      className="flex items-center justify-center w-10 h-10 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-600 rounded-full transition-colors"
                    >
                      <Square size={16} />
                    </button>
                  </div>
                  {/* Time Display */}
                  <div className="text-gray-600 font-mono text-sm">
                    {formatTime(currentTime)} / {formatTime(totalDuration)}
                  </div>
                </div>
                {/* Zoom Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const newZoom = Math.max(zoom / 1.5, 0.1);
                      setZoom(newZoom);
                      if (wavesurferRef.current) {
                        wavesurferRef.current.zoom(newZoom * 50);
                      }
                    }}
                    disabled={!audioClips.length || zoom <= getMinZoomLevel()}
                    className="p-2 text-gray-600 hover:text-gray-800 disabled:text-gray-300 hover:bg-gray-100 rounded transition-colors"
                  >
                    <ZoomOut size={18} />
                  </button>
                  <button
                    onClick={() => {
                        const newZoom = Math.min(zoom * 1.5, 10);
                        setZoom(newZoom);
                      if (wavesurferRef.current) {
                        wavesurferRef.current.zoom(newZoom * 50);
                      }
                    }}
                    disabled={!audioClips.length}
                    className="p-2 text-gray-600 hover:text-gray-800 disabled:text-gray-300 hover:bg-gray-100 rounded transition-colors"
                  >
                    <ZoomIn size={18} />
                  </button>
                </div>
              </div>
            </div>
      
            {/* Waveform Container */}
            <div
            ref={waveformContainerRef}   
            className="border-t border-b border-t-gray-300 border-b-gray-300 overflow-x-auto overflow-y-hidden flex-1"
            >
            <div className="h-full ">
              <div className="p-6 h-full"
               style={{ 
    width: totalDuration > 0 ? `${totalDuration * zoom * 50 + 48}px` : '100%',
    minWidth: '100%'
  }}
             >
              {/* Time markers above waveform */}
              <TimeMarkers duration={totalDuration} zoom={zoom} interval={5} />
              {/* Waveform itself */}
                <div
                  ref={waveformRef}
                  className="w-full h-32"
                  style={{ 
    width: totalDuration > 0 ? `${totalDuration * zoom * 50}px` : '100%' 
  }}
                />
              </div>
            </div>
            </div>    
          </div>
        </div>
      </div>
    </BaseLayout>
  );
};

export default AudioEditor;

