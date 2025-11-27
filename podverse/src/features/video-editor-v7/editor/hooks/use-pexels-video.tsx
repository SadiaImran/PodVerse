import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { getSupabaseAuthorizedtoken } from "@/assets/supabaseClient";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// Interface defining the structure of video data returned from Pexels API
interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  url: string; // URL to the video on Pexels website
  image: string; // Thumbnail image URL
  video_files: Array<{
    // Array of different video formats/qualities
    id: number;
    quality: string; // e.g., "hd", "sd"
    file_type: string; // e.g., "video/mp4"
    link: string; // Direct URL to video file
  }>;
}

// Custom hook for fetching and managing videos from Pexels API
export function usePexelsVideos() {
  // State for storing fetched videos
  const [videos, setVideos] = useState<PexelsVideo[]>([]);
  // State for tracking loading status during API calls
  const [isLoading, setIsLoading] = useState(false);

  // Function to fetch videos based on search query
  const fetchVideos = async (query: string) => {
    setIsLoading(true);
    try {
      // Make API request to Pexels
      // Parameters:
      // - query: search term
      // - per_page: number of results to return
      // - size: size of videos to fetch
      // - orientation: aspect ratio of videos
      const token = await getSupabaseAuthorizedtoken();
      if (!token) {
        throw new Error("Missing Supabase auth token.");
      }

      const response = await fetch(
        `${API_BASE_URL}/visuals/stock/videos?query=${encodeURIComponent(
          query
        )}&per_page=50&size=medium`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Check if the request was successful
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      setVideos(data.videos || []);
    } catch (error) {
      // Log error and show user-friendly toast notification
      console.error("Error fetching Pexels media:", error);
      toast({
        title: "Error fetching media",
        description: "Failed to fetch stock videos. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Reset loading state regardless of success/failure
      setIsLoading(false);
    }
  };

  // Return hook values and functions
  return { videos, isLoading, fetchVideos };
}
