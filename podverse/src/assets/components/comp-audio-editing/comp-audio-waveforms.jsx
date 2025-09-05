import React, { useRef, useEffect, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { ZoomIn, ZoomOut, Play, Pause } from "lucide-react";

const INITIAL_PIXELS_PER_SECOND = 30;

function TimeMarkers({ duration, zoomLevel, width, interval = 5 }) {
  // interval: kitne seconds ke gap par marker ho
  const seconds = Math.ceil(duration);
  const markers = [];
  for (let i = 0; i <= seconds; i += interval) {
    const left = i * zoomLevel;
    markers.push(
      <div
        key={i}
        style={{
          position: "absolute",
          left: `${left}px`,
          top: 0,
          fontSize: "12px",
          color: "#888",
        }}
      >
        {`00:${i.toString().padStart(2, "0")}`}{" "}
      </div>
    );
  }
  return (
    <div
      style={{
        position: "relative",
        width: `${width}px`,
        height: "18px",
        borderBottom: "2px solid #d1d5db",
        background: "#fafafd",
      }}
    >
      {markers}
    </div>
  );
}

const Waveform = ({ audioClips, totalDuration }) => {
  const waveformRef = useRef(null);
  const wavesurfer = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(INITIAL_PIXELS_PER_SECOND);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!waveformRef.current) return;

    if (wavesurfer.current) {
      wavesurfer.current.destroy();
    }

    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "#94a3b8",
      progressColor: "#22d3ee",
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 80,
      minPxPerSec: INITIAL_PIXELS_PER_SECOND,
    });

    // Load all audio clips sequentially
    const urls = audioClips.map((clip) => clip.url);
    if (urls.length > 0) {
      wavesurfer.current.load(urls);
    } else {
      wavesurfer.current.empty();
    }

    wavesurfer.current.on("ready", () => {
      setIsLoaded(true);
    });

    wavesurfer.current.on("play", () => setIsPlaying(true));
    wavesurfer.current.on("pause", () => setIsPlaying(false));
    wavesurfer.current.on("finish", () => {
      setIsPlaying(false);
      wavesurfer.current.seekTo(0);
    });

    return () => {
      wavesurfer.current.destroy();
    };
  }, [audioClips]);

  const togglePlay = () => {
    if (wavesurfer.current) {
      wavesurfer.current.playPause();
    }
  };

  const handleZoomIn = () => {
    const newZoom = zoomLevel + 10;
    setZoomLevel(newZoom);
    if (wavesurfer.current) {
      wavesurfer.current.zoom(newZoom);
    }
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(10, zoomLevel - 10);
    setZoomLevel(newZoom);
    if (wavesurfer.current) {
      wavesurfer.current.zoom(newZoom);
    }
  };

  const waveformWidth = totalDuration * zoomLevel;

  return (
    <div className="relative p-4 rounded-xl shadow-inner bg-light-lavender">
      <div className="flex items-center justify-between mb-4">
        {/* Playback controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            disabled={!isLoaded}
            className="p-2 rounded-full bg-light-purple text-white hover:bg-dark-purple transition"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            disabled={!isLoaded || zoomLevel <= 10}
            className="rounded-full  hover:bg-gray-300 transition"
            aria-label="Zoom Out"
          >
            <ZoomOut size={20} />
          </button>
          <input
            type="range"
            min="10"
            max="200"
            value={zoomLevel}
            onChange={(e) => {
              const newZoom = parseFloat(e.target.value);
              setZoomLevel(newZoom);
              if (wavesurfer.current && isLoaded)
                wavesurfer.current.zoom(newZoom);
            }}
            className=" h-1 accent-light-purple"
          />
          <button
            onClick={handleZoomIn}
            disabled={!isLoaded || zoomLevel >= 200}
            className="rounded-full  hover:bg-gray-300 transition"
            aria-label="Zoom In"
          >
            <ZoomIn size={20} />
          </button>
        </div>
      </div>

      <div
        className="bg-light-lightGrey border-2  w-full overflow-auto cursor-grab relative"
      >
        <div style={{ position: "relative", width: `${waveformWidth}px` }}>
          <TimeMarkers
            duration={totalDuration}
            zoomLevel={zoomLevel}
            width={waveformWidth}
            interval={5} // 5 seconds gap
          />
          <div
            ref={waveformRef}
            style={{
              width: `${waveformWidth}px`,
              height: "80px",
              transition: "width 0.3s",
            }}
            className="waveform"
          />
        </div>
      </div>
    </div>
  );
};
export default Waveform;