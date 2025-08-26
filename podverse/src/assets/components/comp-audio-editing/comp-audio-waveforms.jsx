import React, { useRef, useEffect, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { ZoomIn, ZoomOut } from "lucide-react";

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
        {`00:${i.toString().padStart(2, "0")}`}
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
      {markers} {/* <-- markers ko yahan render karo */}
    </div>
  );
}

const Waveform = ({ url }) => {
  const waveformRef = useRef(null);
  const wavesurfer = useRef(null);
  const scrollContainerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(INITIAL_PIXELS_PER_SECOND);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const scrollStartX = useRef(0);

  useEffect(() => {
    setIsLoaded(false);
    if (waveformRef.current && url) {
      if (wavesurfer.current) {
        try {
          wavesurfer.current.destroy();
        } catch (err) {}
      }

      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: "#d1d5db",
        progressColor: "#6366f1",
        cursorColor: "#4f46e5",
        height: 80,
        barWidth: 2,
        responsive: false,
        normalize: true,
      });

      wavesurfer.current.load(url);

      wavesurfer.current.on("ready", () => {
        setDuration(wavesurfer.current.getDuration());
        wavesurfer.current.zoom(zoomLevel);
        setIsLoaded(true);
      });

      wavesurfer.current.on("audioprocess", (time) => {
        setCurrentTime(time);
        // Auto-scroll playhead
        if (scrollContainerRef.current && wavesurfer.current) {
          const px = time * zoomLevel;
          const container = scrollContainerRef.current;
          if (
            px > container.scrollLeft + container.offsetWidth - 100 ||
            px < container.scrollLeft
          ) {
            container.scrollLeft = px - container.offsetWidth / 2;
          }
        }
      });

      wavesurfer.current.on("seek", (progress) => {
        setCurrentTime(progress * duration);
      });

      wavesurfer.current.on("redraw", () => {
        setIsLoaded(true);
      });
    }

    return () => {
      if (wavesurfer.current) {
        try {
          wavesurfer.current.destroy();
        } catch (err) {}
        wavesurfer.current = null;
      }
    };
  }, [url, zoomLevel]);

  const handleZoomIn = () => {
    if (!isLoaded) return;
    const newZoom = Math.min(zoomLevel + 20, 150);
    setZoomLevel(newZoom);
    if (wavesurfer.current) wavesurfer.current.zoom(newZoom);
  };

  const handleZoomOut = () => {
    if (!isLoaded) return;
    const newZoom = Math.max(zoomLevel - 20, 10);
    setZoomLevel(newZoom);
    if (wavesurfer.current) wavesurfer.current.zoom(newZoom);
  };

  const togglePlay = () => {
    if (!wavesurfer.current) return;
    wavesurfer.current.playPause();
    setIsPlaying(!isPlaying);
  };

  const waveformWidth = Math.max(window.innerWidth, duration * zoomLevel);

  // Playhead position
  const playheadLeft = currentTime * zoomLevel;

  const handleMouseDown = (e) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    scrollStartX.current = scrollContainerRef.current.scrollLeft;
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStartX.current;
    scrollContainerRef.current.scrollLeft = scrollStartX.current - dx;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <div className="mb-6 w-full max-w-screen-zl bg-light-lightGrey border-2  rounded-lg shadow-md flex flex-col items-center justify-center p-4">
      {/* Zoom Controls */}
      <div className="flex items-center gap-3 mb-4 w-full justify-end">
        <button
          onClick={handleZoomOut}
          disabled={!isLoaded}
          className="rounded-full  hover:bg-gray-300 transition"
          aria-label="Zoom Out"
        >
          <ZoomOut size={20} />
        </button>
        <input
          type="range"
          min={10}
          max={150}
          step={10}
          value={zoomLevel}
          disabled={!isLoaded}
          onChange={(e) => {
            const newZoom = Number(e.target.value);
            setZoomLevel(newZoom);
            if (wavesurfer.current && isLoaded) wavesurfer.current.zoom(newZoom);
          }}
          className=" h-1 accent-light-purple"
        />
        <button
          onClick={handleZoomIn}
          disabled={!isLoaded}
          className="rounded-full  hover:bg-gray-300 transition"
          aria-label="Zoom In"
        >
          <ZoomIn size={20} />
        </button>
      </div>
    
      <div
        ref={scrollContainerRef}
        className="bg-light-lightGrey border-2  w-full overflow-auto cursor-grab relative"
      >
        <div style={{ position: "relative", width: `${waveformWidth}px` }}>
          {/* Time Markers */}
          <TimeMarkers
            duration={duration}
            zoomLevel={zoomLevel}
            width={waveformWidth}
            interval={5} // 5 seconds gap
          />
          {/* Waveform */}
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
      {/* Play/Pause Button */}
      {url && (
        <button
          onClick={togglePlay}
          className="mt-4 px-6 py-2 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
      )}
    </div>
  );
};

export default Waveform;
