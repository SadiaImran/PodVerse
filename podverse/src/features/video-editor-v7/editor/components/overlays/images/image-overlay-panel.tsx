import { useState, useEffect, useRef } from "react";
import { Search, Upload, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useEditorContext } from "../../../contexts/editor-context";
import { useTimelinePositioning } from "../../../hooks/use-timeline-positioning";
import { useAspectRatio } from "../../../hooks/use-aspect-ratio";
import { useTimeline } from "../../../contexts/timeline-context";
import { ImageOverlay, Overlay, OverlayType } from "../../../types";
import { ImageDetails } from "./image-details";
import { usePexelsImages } from "../../../hooks/use-pexels-images";
import { useLocalMedia } from "../../../contexts/local-media-context";
import { toast } from "@/hooks/use-toast";

const POPULAR_IMAGE_CATEGORIES = ["Nature", "Technology", "Business", "People", "Abstract"];

/**
 * Interface representing an image from the Pexels API
 */
interface PexelsImage {
  id: number | string;
  src: {
    original: string;
    medium: string;
  };
}

/**
 * ImageOverlayPanel Component
 *
 * A panel that provides functionality to:
 * 1. Search and select images from Pexels
 * 2. Add selected images as overlays to the editor
 * 3. Modify existing image overlay properties
 *
 * The panel has two main states:
 * - Search/Selection mode: Shows a search bar and grid of Pexels images
 * - Edit mode: Shows image details editor when an existing image overlay is selected
 */
export const ImageOverlayPanel: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentCategory, setCurrentCategory] = useState<string>("Nature");
  const { images, isLoading, fetchImages } = usePexelsImages();
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
  const { addMediaFile } = useLocalMedia();
  const [isUploadingLocalImage, setIsUploadingLocalImage] = useState(false);

  useEffect(() => {
    if (selectedOverlayId === null) {
      setLocalOverlay(null);
      return;
    }

    const selectedOverlay = overlays.find(
      (overlay) => overlay.id === selectedOverlayId
    );

    if (selectedOverlay?.type === OverlayType.IMAGE) {
      setLocalOverlay(selectedOverlay);
    }
  }, [selectedOverlayId, overlays]);

  // Load default images based on category
  useEffect(() => {
    if (images.length === 0 && !isLoading && currentCategory) {
      fetchImages(currentCategory);
    }
  }, [currentCategory]);

  /**
   * Handles the image search form submission
   * Triggers the Pexels API call with the current search query
   */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      fetchImages(searchQuery);
    }
  };

  /**
   * Adds a new image overlay to the editor
   * @param image - The selected Pexels image to add
   * Creates a new overlay with default positioning and animation settings
   */
  const handleAddImage = (image: PexelsImage) => {
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
      durationInFrames: 200,
      from,
      id: Date.now(),
      rotation: 0,
      row,
      isDragging: false,
      type: OverlayType.IMAGE,
      src: image.src.original,
      styles: {
        objectFit: "cover",
        animation: {
          enter: "fadeIn",
          exit: "fadeOut",
        },
      },
    };

    console.log(newOverlay);

    addOverlay(newOverlay);
  };

  /**
   * Updates an existing image overlay's properties
   * @param updatedOverlay - The modified overlay object
   * Updates both local state and global editor context
   */
  const handleUpdateOverlay = (updatedOverlay: Overlay) => {
    setLocalOverlay(updatedOverlay);
    changeOverlay(updatedOverlay.id, updatedOverlay);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploadingLocalImage(true);
      const mediaFile = await addMediaFile(files[0]);
      if (!mediaFile) {
        throw new Error("Failed to upload image");
      }

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
        durationInFrames: 200,
        from,
        id: Date.now(),
        rotation: 0,
        row,
        isDragging: false,
        type: OverlayType.IMAGE,
        content: mediaFile.name,
        src: mediaFile.path,
        styles: {
          objectFit: "cover",
          animation: {
            enter: "fadeIn",
            exit: "fadeOut",
          },
        },
        sourceStoragePath: mediaFile.storagePath,
      };

      addOverlay(newOverlay);
    } catch (error) {
      console.error("Error uploading local image:", error);
      toast({
        title: "Upload failed",
        description: "Could not upload the selected image. Please try again.",
        variant: "destructive",
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setIsUploadingLocalImage(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {!localOverlay ? (
        <>
          {/* Header - Fixed */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 bg-white dark:bg-gray-900">
            {/* Title with gradient background */}
            <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-gray-800 dark:to-gray-700 rounded-lg p-2 mb-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-purple-200/30 to-blue-200/30 dark:from-gray-700/30 dark:to-gray-600/20 rounded-full -translate-y-6 translate-x-6"></div>
              <h1 className="text-base font-bold bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-300 dark:to-blue-300 bg-clip-text text-transparent relative z-10">
                Image Library
              </h1>
            </div>
            
            <form onSubmit={handleSearch} className="flex gap-2 mb-2">
              <Input
                placeholder="Search images..."
                value={searchQuery}
                className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-500 focus-visible:ring-blue-400 text-sm h-8 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-400"
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button
                type="submit"
                variant="default"
                disabled={isLoading}
                className="bg-white hover:bg-gray-100 text-gray-900 border-gray-200 h-8 px-3 dark:bg-gray-900 dark:hover:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
              >
                <Search className="h-3.5 w-3.5" />
              </Button>
            </form>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingLocalImage}
              className="w-full bg-gradient-to-r from-purple-600 via-purple-500 to-purple-400 hover:from-purple-500 hover:via-purple-400 hover:to-purple-300 text-white shadow-md hover:shadow-lg h-8 px-3 text-sm mb-3 disabled:opacity-60"
            >
              {isUploadingLocalImage ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5 mr-1.5" />
              )}
              {isUploadingLocalImage ? "Uploading..." : "Upload Image"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            <div className="flex gap-1.5 flex-wrap">
              {POPULAR_IMAGE_CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setCurrentCategory(category);
                    fetchImages(category);
                  }}
                  className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap transition-all duration-200 ${
                    currentCategory === category
                      ? "bg-gradient-to-r from-purple-500 to-purple-400 text-white shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-gradient-to-r hover:from-purple-100 hover:to-blue-100 hover:text-purple-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:text-purple-200"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-3 bg-gradient-to-br from-purple-50/40 via-blue-50/20 to-indigo-50/30 dark:from-gray-900/70 dark:via-gray-900/40 dark:to-gray-800/50">
            <div className="grid grid-cols-3 gap-2">
              {isLoading ? (
                Array.from({ length: 12 }).map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className="relative aspect-video bg-gray-200 dark:bg-gray-800 animate-pulse rounded"
                  />
                ))
              ) : images.length > 0 ? (
                images.map((image) => (
                  <button
                    key={image.id}
                    className="relative aspect-video cursor-pointer border border-gray-200 hover:border-purple-400 rounded overflow-hidden hover:shadow-md transition-all duration-200"
                    onClick={() => handleAddImage(image)}
                  >
                    <div className="relative">
                      <img
                        src={image.src.medium}
                        alt={`Image thumbnail ${image.id}`}
                        className="rounded object-cover w-full h-full hover:opacity-80 transition-opacity duration-200"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-200 rounded" />
                    </div>
                  </button>
                ))
              ) : (
                <div className="col-span-3 flex flex-col items-center justify-center py-8 text-gray-500 text-xs dark:text-gray-400">
                  No images found. Try searching or selecting a category.
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <ImageDetails
          localOverlay={localOverlay as ImageOverlay}
          setLocalOverlay={handleUpdateOverlay}
        />
      )}
    </div>
  );
};
