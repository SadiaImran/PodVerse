import { useState, useEffect, useRef } from "react";
import { Search, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useEditorContext } from "../../../contexts/editor-context";
import { useTimelinePositioning } from "../../../hooks/use-timeline-positioning";

import { usePexelsVideos } from "../../../hooks/use-pexels-video";
import { useAspectRatio } from "../../../hooks/use-aspect-ratio";
import { useTimeline } from "../../../contexts/timeline-context";
import { ClipOverlay, Overlay, OverlayType } from "../../../types";
import { VideoDetails } from "./video-details";

const POPULAR_VIDEO_CATEGORIES = ["Nature", "Technology", "Business", "People", "Abstract"];

interface PexelsVideoFile {
  quality: string;
  link: string;
}

interface PexelsVideo {
  id: number | string;
  image: string;
  video_files: PexelsVideoFile[];
}

/**
 * VideoOverlayPanel is a component that provides video search and management functionality.
 * It allows users to:
 * - Search and browse videos from the Pexels API
 * - Add videos to the timeline as overlays
 * - Manage video properties when a video overlay is selected
 *
 * The component has two main states:
 * 1. Search/Browse mode: Shows a search input and grid of video thumbnails
 * 2. Edit mode: Shows video details panel when a video overlay is selected
 *
 * @component
 * @example
 * ```tsx
 * <VideoOverlayPanel />
 * ```
 */
export const VideoOverlayPanel: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentCategory, setCurrentCategory] = useState<string>("Nature");
  const { videos, isLoading, fetchVideos } = usePexelsVideos();
  const {
    addOverlay,
    overlays,
    durationInFrames,
    selectedOverlayId,
    changeOverlay,
  } = useEditorContext();
  const { findNextAvailablePosition } = useTimelinePositioning();
  const { getAspectRatioDimensions } = useAspectRatio();
  const { visibleRows } = useTimeline();
  const [localOverlay, setLocalOverlay] = useState<Overlay | null>(null);

  useEffect(() => {
    if (selectedOverlayId === null) {
      setLocalOverlay(null);
      return;
    }

    const selectedOverlay = overlays.find(
      (overlay) => overlay.id === selectedOverlayId
    );

    if (selectedOverlay?.type === OverlayType.VIDEO) {
      setLocalOverlay(selectedOverlay);
    }
  }, [selectedOverlayId, overlays]);

  // Load default videos based on category
  useEffect(() => {
    if (videos.length === 0 && !isLoading && currentCategory) {
      fetchVideos(currentCategory);
    }
  }, [currentCategory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      fetchVideos(searchQuery);
    }
  };

  const handleAddClip = (video: PexelsVideo) => {
    const { width, height } = getAspectRatioDimensions();

    const { from, row } = findNextAvailablePosition(
      overlays,
      visibleRows,
      durationInFrames
    );

    // Find the best quality video file (prioritize UHD > HD > SD)
    const videoFile =
      video.video_files.find(
        (file: PexelsVideoFile) => file.quality === "uhd"
      ) ||
      video.video_files.find(
        (file: PexelsVideoFile) => file.quality === "hd"
      ) ||
      video.video_files.find(
        (file: PexelsVideoFile) => file.quality === "sd"
      ) ||
      video.video_files[0]; // Fallback to first file if no matches

    const newOverlay: Overlay = {
      left: 0,
      top: 0,
      width,
      height,
      durationInFrames: 200,
      from,
      id: Date.now(),
      rotation: 0,
      row,
      isDragging: false,
      type: OverlayType.VIDEO,
      content: video.image,
      src: videoFile?.link ?? "",
      videoStartTime: 0,
      styles: {
        opacity: 1,
        zIndex: 100,
        transform: "none",
        objectFit: "cover",
      },
    };

    addOverlay(newOverlay);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const videoUrl = URL.createObjectURL(file);

    // Calculate duration
    const video = document.createElement("video");
    video.src = videoUrl;
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = () => resolve(null);
      video.onerror = reject;
    });

    const duration = video.duration;
    const { width, height } = getAspectRatioDimensions();
    const { from, row } = findNextAvailablePosition(
      overlays,
      visibleRows,
      durationInFrames
    );

    const newOverlay: Overlay = {
      left: 0,
      top: 0,
      width,
      height,
      durationInFrames: Math.floor(duration * 30),
      from,
      id: Date.now(),
      rotation: 0,
      row,
      isDragging: false,
      type: OverlayType.VIDEO,
      content: file.name,
      src: videoUrl,
      videoStartTime: 0,
      styles: {
        opacity: 1,
        zIndex: 100,
        transform: "none",
        objectFit: "cover",
      },
    };

    addOverlay(newOverlay);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpdateOverlay = (updatedOverlay: Overlay) => {
    setLocalOverlay(updatedOverlay);
    changeOverlay(updatedOverlay.id, updatedOverlay);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {!localOverlay ? (
        <>
          {/* Header - Fixed */}
          <div className="p-3 border-b border-gray-200 flex-shrink-0 bg-white">
            {/* Title with gradient background */}
            <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-2 mb-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-purple-200/30 to-blue-200/30 rounded-full -translate-y-6 translate-x-6"></div>
              <h1 className="text-base font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent relative z-10">
                Video Library
              </h1>
            </div>
            
            <form onSubmit={handleSearch} className="flex gap-2 mb-2">
              <Input
                placeholder="Search videos..."
                value={searchQuery}
                className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-500 focus-visible:ring-blue-400 text-sm h-8"
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button
                type="submit"
                variant="default"
                disabled={isLoading}
                className="bg-white hover:bg-gray-100 text-gray-900 border-gray-200 h-8 px-3"
              >
                <Search className="h-3.5 w-3.5" />
              </Button>
            </form>
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-gradient-to-r from-purple-600 via-purple-500 to-purple-400 hover:from-purple-500 hover:via-purple-400 hover:to-purple-300 text-white shadow-md hover:shadow-lg h-8 px-3 text-sm mb-3"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Upload Video
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            <div className="flex gap-1.5 flex-wrap">
              {POPULAR_VIDEO_CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setCurrentCategory(category);
                    fetchVideos(category);
                  }}
                  className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap transition-all duration-200 ${
                    currentCategory === category
                      ? "bg-gradient-to-r from-purple-500 to-purple-400 text-white shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-gradient-to-r hover:from-purple-100 hover:to-blue-100 hover:text-purple-600"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-3 bg-gradient-to-br from-purple-50/40 via-blue-50/20 to-indigo-50/30">
            <div className="grid grid-cols-3 gap-2">
              {isLoading ? (
                Array.from({ length: 12 }).map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className="relative aspect-video w-full bg-gray-200 animate-pulse rounded"
                  />
                ))
              ) : videos.length > 0 ? (
                videos.map((video) => (
                  <button
                    key={video.id}
                    className="relative block w-full cursor-pointer border border-transparent rounded overflow-hidden hover:shadow-md transition-all duration-200"
                    onClick={() => handleAddClip(video)}
                  >
                    <div className="relative">
                      <img
                        src={video.image}
                        alt={`Video thumbnail ${video.id}`}
                        className="w-full h-auto rounded object-cover hover:opacity-80 transition-opacity duration-200"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-200 rounded" />
                    </div>
                  </button>
                ))
              ) : (
                <div className="col-span-3 flex flex-col items-center justify-center py-8 text-gray-500 text-xs">
                  No videos found. Try searching or selecting a category.
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <VideoDetails
          localOverlay={localOverlay as ClipOverlay}
          setLocalOverlay={handleUpdateOverlay}
        />
      )}
    </div>
  );
};
