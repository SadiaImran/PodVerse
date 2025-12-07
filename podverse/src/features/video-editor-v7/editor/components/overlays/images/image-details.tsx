import React, { useState } from "react";
import { ImageOverlay } from "../../../types";
import { Button } from "@/components/ui/button";
import { Loader2, PaintBucket, Settings } from "lucide-react";
import axios from "axios";
import { toast } from "@/hooks/use-toast";
import { getSupabaseAuthorizedtoken } from "@/assets/supabaseClient";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ImageStylePanel } from "./image-style-panel";
import { ImageSettingsPanel } from "./image-settings-panel";

/**
 * Props for the ImageDetails component
 * @interface ImageDetailsProps
 * @property {ImageOverlay} localOverlay - Current image overlay being edited
 * @property {Function} setLocalOverlay - Function to update the image overlay
 */
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

interface ImageDetailsProps {
  localOverlay: ImageOverlay;
  setLocalOverlay: (overlay: ImageOverlay) => void;
}

/**
 * ImageDetails Component
 *
 * @component
 * @description
 * Provides a tabbed interface for managing image settings and styles.
 * Features include:
 * - Image preview
 * - Style customization panel
 * - Settings configuration panel
 * - Real-time updates
 *
 * The component serves as the main configuration interface
 * for image overlays in the editor.
 *
 * @example
 * ```tsx
 * <ImageDetails
 *   localOverlay={imageOverlay}
 *   setLocalOverlay={handleOverlayUpdate}
 * />
 * ```
 */
export const ImageDetails: React.FC<ImageDetailsProps> = ({
  localOverlay,
  setLocalOverlay,
}) => {
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);

  const fetchImageAsBlob = async (src: string): Promise<Blob> => {
    if (!src) {
      throw new Error("Image source is missing");
    }
    const response = await fetch(src, { mode: "cors" });
    if (!response.ok) {
      throw new Error(`Failed to download image (${response.status})`);
    }
    return response.blob();
  };

  const handleRemoveBackground = async () => {
    if (!localOverlay.src) {
      toast({
        title: "Missing image",
        description: "Select or upload an image before removing the background.",
        variant: "destructive",
      });
      return;
    }

    setIsRemovingBackground(true);
    try {
      const blob = await fetchImageAsBlob(localOverlay.src);
      const sanitizedName =
        (localOverlay.content || "image-overlay")
          .replace(/[^\w\-]+/g, "_")
          .slice(0, 40) || `overlay-${localOverlay.id}`;
      const file = new File([blob], `${sanitizedName}.png`, {
        type: blob.type || "image/png",
      });

      const token = await getSupabaseAuthorizedtoken();
      const formData = new FormData();
      formData.append("file", file);

      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await axios.post(
        `${API_BASE_URL}/video/api/remove-background`,
        formData,
        {
          headers,
        }
      );

      const newSrc = response.data?.image_data;
      if (!newSrc) {
        throw new Error("Background removal returned no image.");
      }

      setLocalOverlay({
        ...localOverlay,
        src: newSrc,
      });

      toast({
        title: "Background removed",
        description: "The transparent version is now applied to the overlay.",
      });
    } catch (error) {
      console.error("Background removal failed:", error);
      toast({
        title: "Background removal failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to remove the background. Try again later.",
        variant: "destructive",
      });
    } finally {
      setIsRemovingBackground(false);
    }
  };

  const handleStyleChange = (updates: Partial<ImageOverlay["styles"]>) => {
    const updatedOverlay = {
      ...localOverlay,
      styles: {
        ...localOverlay.styles,
        ...updates,
      },
    };
    setLocalOverlay(updatedOverlay);
  };

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="relative space-y-3">
        <div className="relative aspect-[16/7] w-full overflow-hidden rounded-sm border border-border bg-muted/40">
          <img
            src={localOverlay.src}
            alt="Image preview"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex justify-end px-1">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRemoveBackground}
            disabled={isRemovingBackground}
            className="transition-all duration-200"
          >
            {isRemovingBackground ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Removing...
              </>
            ) : (
              "Remove Background"
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="w-full grid grid-cols-2 bg-gray-100/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-sm border border-gray-200 dark:border-gray-700 gap-1">
          <TabsTrigger
            value="settings"
            className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white 
            rounded-sm transition-all duration-200 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
          >
            <span className="flex items-center gap-2 text-xs">
              <Settings className="w-3 h-3" />
              Settings
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="style"
            className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white 
            rounded-sm transition-all duration-200 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
          >
            <span className="flex items-center gap-2 text-xs">
              <PaintBucket className="w-3 h-3" />
              Style
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="style" className="space-y-4 mt-4">
          <ImageStylePanel
            localOverlay={localOverlay}
            handleStyleChange={handleStyleChange}
          />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 mt-4">
          <ImageSettingsPanel
            localOverlay={localOverlay}
            handleStyleChange={handleStyleChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
