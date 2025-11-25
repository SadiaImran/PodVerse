import React from "react";
import { Download, Loader2, Bell, Save, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";
import { getSupabaseAuthorizedtoken } from "@/assets/supabaseClient";
import { useEditorContext } from "../../contexts/editor-context";
import axios from "axios";

/**
 * Interface representing a single video render attempt
 * @property {string} url - URL of the rendered video (if successful)
 * @property {Date} timestamp - When the render was completed
 * @property {string} id - Unique identifier for the render
 * @property {'success' | 'error'} status - Result of the render attempt
 * @property {string} error - Error message if render failed
 */
interface RenderItem {
  url?: string;
  supabaseUrl?: string; // URL after uploading to Supabase
  timestamp: Date;
  id: string;
  status: "success" | "error";
  error?: string;
  isUploading?: boolean; // Track upload status
}

/**
 * Props for the RenderControls component
 * @property {object} state - Current render state containing status, progress, and URL
 * @property {() => void} handleRender - Function to trigger a new render
 * @property {() => void} saveProject - Function to save the project
 * @property {('ssr' | 'lambda')?} renderType - Type of render (SSR or Lambda)
 */
interface RenderControlsProps {
  state: any;
  handleRender: () => void;
  saveProject?: () => Promise<void>;
  renderType?: "ssr" | "lambda";
}

/**
 * RenderControls component provides UI controls for video rendering functionality
 *
 * Features:
 * - Render button that shows progress during rendering
 * - Notification bell showing render history
 * - Download buttons for completed renders
 * - Error display for failed renders
 *
 * The component maintains a history of render attempts, both successful and failed,
 * and provides visual feedback about the current render status.
 */
const RenderControls: React.FC<RenderControlsProps> = ({
  state,
  handleRender,
  saveProject,
  renderType = "ssr",
}) => {
  // Get projectId from editor context
  const { projectId } = useEditorContext();
  
  // Store multiple renders
  const [renders, setRenders] = React.useState<RenderItem[]>([]);
  // Track if there are new renders
  const [hasNewRender, setHasNewRender] = React.useState(false);
  const [isProjectSaved, setIsProjectSaved] = React.useState(false);
  const [isSavingProject, setIsSavingProject] = React.useState(false);
  const [autoDownloadPending, setAutoDownloadPending] = React.useState(false);
  // Track upload in progress to prevent double uploads
  const uploadInProgressRef = React.useRef<Set<string>>(new Set());
  // Post creation modal state
  const [showPostModal, setShowPostModal] = React.useState(false);
  const [uploadedVideoUrl, setUploadedVideoUrl] = React.useState<string | null>(null);
  const [uploadedThumbnailUrl, setUploadedThumbnailUrl] = React.useState<string | null>(null);
  const [isCreatingPost, setIsCreatingPost] = React.useState(false);

  // Check if rendering is disabled via environment variable
  const isRenderDisabled = (import.meta as any).env?.VITE_DISABLE_RENDER === "true";

  // Handle post creation
  const handleCreatePost = React.useCallback(async (status: 'draft' | 'published') => {
    if (!uploadedVideoUrl) return;
    
    setIsCreatingPost(true);
    try {
      // Get podcast metadata from sessionStorage
      const podcastConfigRaw = sessionStorage.getItem('podcastConfig');
      const videoGenMetaRaw = sessionStorage.getItem('videoGenMeta');
      
      let title = 'My Podcast Video';
      let description = 'A podcast video created with PodVerse';
      let tags: string[] = [];
      
      if (podcastConfigRaw) {
        try {
          const config = JSON.parse(podcastConfigRaw);
          title = config.podcastName || title;
          description = config.description || description;
          tags = Array.isArray(config.tags) ? config.tags : [];
        } catch (e) {
          console.warn('Failed to parse podcastConfig:', e);
        }
      }
      
      if (videoGenMetaRaw) {
        try {
          const meta = JSON.parse(videoGenMetaRaw);
          if (meta.podcastTitle && !title) {
            title = meta.podcastTitle;
          }
        } catch (e) {
          console.warn('Failed to parse videoGenMeta:', e);
        }
      }
      
      // Use uploaded thumbnail URL if available, otherwise backend will generate
      const thumbnailUrl = uploadedThumbnailUrl || null;
      
      // Get auth token
      const token = await getSupabaseAuthorizedtoken();
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Call post creation API
      const response = await axios.post(
        'http://localhost:8000/posts/create',
        {
          title,
          description,
          video_url: uploadedVideoUrl,
          thumbnail_url: thumbnailUrl, // Backend will generate actual thumbnail
          status,
          tags
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        alert(`Post ${status === 'draft' ? 'saved as draft' : 'published'} successfully!`);
        setShowPostModal(false);
        setUploadedVideoUrl(null);
      } else {
        throw new Error(response.data.message || 'Failed to create post');
      }
    } catch (error: any) {
      console.error('Error creating post:', error);
      alert(error.response?.data?.detail || error.message || 'Failed to create post. Please try again.');
    } finally {
      setIsCreatingPost(false);
    }
  }, [uploadedVideoUrl, uploadedThumbnailUrl]);

  /**
   * Upload rendered video to Supabase Storage
   */
  const uploadVideoToSupabase = React.useCallback(async (videoUrl: string, renderId: string, projectName?: string): Promise<{ video_url: string | null; thumbnail_url: string | null }> => {
    try {
      console.log("[Video Upload] Starting upload to Supabase...", { videoUrl, renderId });
      
      // Get authentication token
      const token = await getSupabaseAuthorizedtoken();
      if (!token) {
        console.error("[Video Upload] No authentication token found");
        return { video_url: null, thumbnail_url: null };
      }

      // Download the video file
      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error(`Failed to download video: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      console.log("[Video Upload] Video downloaded", { size: blob.size });

      // Create FormData
      const formData = new FormData();
      
      // Check if we should overwrite original video (from video generation)
      const originalVideoPath = sessionStorage.getItem('originalVideoPath');
      const jobId = sessionStorage.getItem('videoJobId');
      
      let fileName;
      if (originalVideoPath) {
        // Use original path to overwrite the generated video
        // Remove bucket prefix if present, keep just the filename
        fileName = originalVideoPath.split('/').pop() || originalVideoPath;
        console.log("[Video Upload] Using original video path for overwrite:", fileName);
        formData.append("overwrite_path", originalVideoPath); // Pass original path for backend
      } else {
        // Create new file name
        fileName = projectName 
          ? `${projectName}_${renderId}.mp4`
          : `rendered_video_${renderId}.mp4`;
      }
      
      formData.append("file", blob, fileName);
      if (projectName) {
        formData.append("project_name", projectName);
      }
      // Always pass render_id for unique filename
      if (renderId) {
        formData.append("render_id", renderId);
      }
      if (jobId) {
        formData.append("job_id", jobId);
      }

      // Upload to backend
      const API_BASE_URL ="http://localhost:8000";
      console.log("[Video Upload] API Base URL:", API_BASE_URL);
      const uploadUrl = `${API_BASE_URL}/videos/upload-video`;
      console.log("[Video Upload] Upload URL:", uploadUrl);
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
      }

      const result = await uploadResponse.json();
      console.log("[Video Upload] Upload successful", result);
      console.log("[Video Upload] Thumbnail URL:", result.thumbnail_url);
      
      return {
        video_url: result.video_url || null,
        thumbnail_url: result.thumbnail_url || null
      };
    } catch (error) {
      console.error("[Video Upload] Upload error:", error);
      return { video_url: null, thumbnail_url: null };
    }
  }, [projectId]);

  const handleDownload = React.useCallback((url: string) => {
    let downloadUrl = url;

    if (renderType === "ssr") {
      // Convert the video URL to a download URL for SSR
      downloadUrl = url
        .replace("/rendered-videos/", "/api/latest/ssr/download/")
        .replace(".mp4", "");
    }
    // Lambda URLs are already in the correct format for download

    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = "rendered-video.mp4";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [renderType]);

  // Add new render to the list when completed and upload to Supabase
  React.useEffect(() => {
    if (state.status === "done" && state.url) {
      // Prevent double uploads - check if this URL is already being uploaded
      if (uploadInProgressRef.current.has(state.url)) {
        console.log("[Video Upload] Upload already in progress for this URL, skipping...");
        return;
      }

      const renderId = crypto.randomUUID();
      const newRender: RenderItem = {
        url: state.url,
        timestamp: new Date(),
        id: renderId,
        status: "success",
        isUploading: true,
      };

      // Add render to list immediately
      setRenders((prev) => [newRender, ...prev]);
      setHasNewRender(true);

      // Mark this URL as being uploaded
      uploadInProgressRef.current.add(state.url);

      // Automatically upload to Supabase
      (async () => {
        try {
          // Use projectId from context as project name
          const projectName = projectId || "podverse-video";
          
          const uploadResult = await uploadVideoToSupabase(
            state.url,
            renderId,
            projectName
          );

          // Update render with Supabase URL
          if (uploadResult.video_url) {
            setRenders((prev) =>
              prev.map((render) =>
                render.id === renderId
                  ? { ...render, supabaseUrl: uploadResult.video_url, isUploading: false }
                  : render
              )
            );
            console.log("[Video Upload] Video saved to Supabase:", uploadResult.video_url);
            console.log("[Video Upload] Thumbnail saved to Supabase:", uploadResult.thumbnail_url);
            
            // Show post creation modal after successful upload
            setUploadedVideoUrl(uploadResult.video_url);
            setUploadedThumbnailUrl(uploadResult.thumbnail_url);
            setShowPostModal(true);
          } else {
            // Upload failed, but keep the render
            setRenders((prev) =>
              prev.map((render) =>
                render.id === renderId
                  ? { ...render, isUploading: false }
                  : render
              )
            );
          }
        } catch (error) {
          console.error("[Video Upload] Failed to upload to Supabase:", error);
          setRenders((prev) =>
            prev.map((render) =>
              render.id === renderId
                ? { ...render, isUploading: false }
                : render
            )
          );
        } finally {
          // Remove from in-progress set
          uploadInProgressRef.current.delete(state.url);
        }
      })();

      // Auto-download if pending
      if (autoDownloadPending) {
        handleDownload(state.url);
        setAutoDownloadPending(false);
      }
    } else if (state.status === "error") {
      setRenders((prev) => [
        {
          timestamp: new Date(),
          id: crypto.randomUUID(),
          status: "error",
          error:
            state.error?.message || "Failed to render video. Please try again.",
        },
        ...prev,
      ]);
      setHasNewRender(true);
      setAutoDownloadPending(false);
    }
  }, [state.status, state.url, state.error, autoDownloadPending, uploadVideoToSupabase, handleDownload]);

  const handleSaveProject = React.useCallback(async () => {
    if (!saveProject) {
      setIsProjectSaved(true);
      return true;
    }
    try {
      setIsSavingProject(true);
      await saveProject();
      setIsProjectSaved(true);
      return true;
    } catch (error) {
      console.error("Failed to save project before download:", error);
      return false;
    } finally {
      setIsSavingProject(false);
    }
  }, [saveProject]);

  const ensureSavedBeforeDownload = async () => {
    if (isProjectSaved) {
      return true;
    }
    const shouldSave = window.confirm(
      "Please save your project before downloading the final video. Save now?"
    );
    if (!shouldSave) {
      return false;
    }
    return await handleSaveProject();
  };

  const getDisplayFileName = (url: string) => {
    if (renderType === "ssr") {
      return url.split("/").pop();
    }
    // For Lambda URLs, use the full URL pathname
    try {
      return new URL(url).pathname.split("/").pop();
    } catch {
      return url.split("/").pop();
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="relative hover:bg-accent"
        onClick={async () => {
          await handleSaveProject();
        }}
        disabled={isSavingProject}
      >
        {isSavingProject ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Save className="w-3.5 h-3.5" />
        )}
      </Button>
      <Popover onOpenChange={() => setHasNewRender(false)}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="relative hover:bg-accent"
          >
            <Bell className="w-3.5 h-3.5" />
            {hasNewRender && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-60 p-3 bg-white dark:bg-gray-800">
          <div className="space-y-1.5">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Recent Renders</h4>
            {renders.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">No renders yet</p>
            ) : (
              renders.map((render) => (
                <div
                  key={render.id}
                  className={`flex items-center justify-between rounded-md border p-1.5 ${
                    render.status === "error"
                      ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                      : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50"
                  }`}
                >
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="text-xs text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                      {render.status === "error" ? (
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          Render Failed
                        </span>
                      ) : (
                        <>
                          <span className="truncate">{getDisplayFileName(render.url!)}</span>
                          {render.isUploading && (
                            <Loader2 className="w-3 h-3 animate-spin text-blue-500 flex-shrink-0" />
                          )}
                          {render.supabaseUrl && !render.isUploading && (
                            <span className="text-green-600 dark:text-green-400 text-[10px] flex-shrink-0" title="Saved to Supabase">
                              ✓
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(render.timestamp, {
                        addSuffix: true,
                      })}
                      {render.isUploading && (
                        <span className="ml-1.5 text-blue-600 dark:text-blue-400">Uploading...</span>
                      )}
                      {render.error && (
                        <div
                          className="text-red-600 dark:text-red-400 mt-0.5 truncate max-w-[180px]"
                          title={render.error}
                        >
                          {render.error}
                        </div>
                      )}
                    </div>
                  </div>
                  {render.status === "success" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 h-6 w-6 flex-shrink-0"
                      onClick={() => handleDownload(render.url!)}
                      title="Download video"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Button
        onClick={async () => {
          const canProceed = await ensureSavedBeforeDownload();
          if (!canProceed) return;
          setAutoDownloadPending(true);
          handleRender();
        }}
        size="sm"
        variant="outline"
        disabled={
          state.status === "rendering" ||
          state.status === "invoking" ||
          isRenderDisabled ||
          isSavingProject
        }
        className={`bg-gray-800 text-white border-gray-700 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 ${
          isRenderDisabled ? "cursor-not-allowed" : ""
        }`}
        title={
          isRenderDisabled
            ? "Rendering is currently disabled"
            : undefined
        }
      >
        {isRenderDisabled ? (
          "Download Video"
        ) : state.status === "rendering" ? (
          <>
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            Rendering... {(state.progress * 100).toFixed(0)}%
          </>
        ) : state.status === "invoking" ? (
          <>
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            Preparing...
          </>
        ) : autoDownloadPending ? (
          <>
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            Finalizing...
          </>
        ) : (
          `Download Video`
        )}
      </Button>

      {/* Post Creation Modal */}
      {showPostModal && uploadedVideoUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-purple-800 to-indigo-900 rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-purple-600 relative">
            <button
              onClick={() => setShowPostModal(false)}
              className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <Sparkles className="w-16 h-16 text-yellow-300 mx-auto mb-6 animate-pulse" />
            <h2 className="text-3xl font-bold text-white mb-4">Video Ready!</h2>
            <p className="text-purple-200 leading-relaxed mb-8">
              Your edited video has been saved to Supabase. Would you like to save it as a draft or publish it now?
            </p>
            
            <div className="flex flex-col gap-4">
              <button
                onClick={async () => {
                  await handleCreatePost('draft');
                }}
                disabled={isCreatingPost}
                className="w-full px-6 py-3 bg-white/10 border border-purple-400 text-purple-200 rounded-xl font-semibold hover:bg-white/20 transition-all duration-300 shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isCreatingPost ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Save as Draft
              </button>
              
              <button
                onClick={async () => {
                  await handleCreatePost('published');
                }}
                disabled={isCreatingPost}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isCreatingPost ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                Publish Now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RenderControls;
