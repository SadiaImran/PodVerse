import React from "react";
import { createPortal } from "react-dom";
import { Download, Loader2, Bell, Save, X, Sparkles, Tag } from "lucide-react";
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
  thumbnailUrl?: string | null;
  timestamp: Date;
  id: string;
  status: "success" | "error";
  error?: string;
  isUploading?: boolean; // Track upload status
}

interface PostCreationModalProps {
  postTitle: string;
  setPostTitle: (value: string) => void;
  postDescription: string;
  setPostDescription: (value: string) => void;
  postTags: string[];
  newTag: string;
  setNewTag: (value: string) => void;
  addTag: () => void;
  removeTag: (tag: string) => void;
  handleCreatePost: (status: "draft" | "published") => void;
  isCreatingPost: boolean;
  onClose: () => void;
}

const PostCreationModal: React.FC<PostCreationModalProps> = ({
  postTitle,
  setPostTitle,
  postDescription,
  setPostDescription,
  postTags,
  newTag,
  setNewTag,
  addTag,
  removeTag,
  handleCreatePost,
  isCreatingPost,
  onClose,
}) => {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999] p-4">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl shadow-2xl p-8 max-w-2xl w-full text-white border border-gray-700 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        
        <h2 className="text-3xl font-bold mb-6 text-center">Create Your Post</h2>

        <div className="space-y-5">
          <div>
            <label htmlFor="post-title" className="block text-sm font-medium text-gray-300 mb-2">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="post-title"
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-gray-700 border border-gray-600 focus:ring-purple-500 focus:border-purple-500 text-white"
              placeholder="Enter post title"
            />
          </div>
          
          <div>
            <label htmlFor="post-description" className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              id="post-description"
              value={postDescription}
              onChange={(e) => setPostDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 rounded-xl bg-gray-700 border border-gray-600 focus:ring-purple-500 focus:border-purple-500 text-white"
              placeholder="Tell your audience about this video..."
            ></textarea>
          </div>
          
          <div>
            <label htmlFor="post-tags" className="block text-sm font-medium text-gray-300 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {postTags.map((tag, index) => (
                <span key={index} className="flex items-center bg-purple-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                  {tag}
                  <button 
                    onClick={() => removeTag(tag)} 
                    className="ml-1.5 text-white/80 hover:text-white"
                    type="button"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                id="new-tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="flex-1 px-4 py-2 rounded-xl bg-gray-700 border border-gray-600 focus:ring-purple-500 focus:border-purple-500 text-white"
                placeholder="Add a tag (e.g., #AI, #Podcast)"
              />
              <Button 
                onClick={addTag} 
                className="bg-purple-700 hover:bg-purple-800 text-white rounded-xl px-4 py-2"
                type="button"
              >
                <Tag className="w-4 h-4 mr-2" /> Add
              </Button>
            </div>
          </div>

          <div className="flex gap-4 mt-6 pt-6 border-t border-gray-700">
            <button
              onClick={() => handleCreatePost('draft')}
              disabled={isCreatingPost || !postTitle.trim()}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCreatingPost ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save as Draft
            </button>
            <button
              onClick={() => handleCreatePost('published')}
              disabled={isCreatingPost || !postTitle.trim()}
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white font-bold py-3 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCreatingPost ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              Publish Now
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

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
  // Track which render URLs have already been processed
  const processedRenderUrlsRef = React.useRef<Set<string>>(new Set());
  // Post creation modal state
  const [showPostModal, setShowPostModal] = React.useState(false);
  const [uploadedVideoUrl, setUploadedVideoUrl] = React.useState<string | null>(null);
  const [uploadedThumbnailUrl, setUploadedThumbnailUrl] = React.useState<string | null>(null);
  const [isCreatingPost, setIsCreatingPost] = React.useState(false);
  // Form state for post creation
  const [postTitle, setPostTitle] = React.useState('');
  const [postDescription, setPostDescription] = React.useState('');
  const [postTags, setPostTags] = React.useState<string[]>([]);
  const [newTag, setNewTag] = React.useState('');

  // Check if rendering is disabled via environment variable
  const isRenderDisabled = (import.meta as any).env?.VITE_DISABLE_RENDER === "true";

  // Load post data from sessionStorage when modal opens
  React.useEffect(() => {
    if (showPostModal) {
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
      
      setPostTitle(title);
      setPostDescription(description);
      setPostTags(tags);
    }
  }, [showPostModal]);

  // Handle post creation
  const handleCreatePost = React.useCallback(async (status: 'draft' | 'published') => {
    if (!uploadedVideoUrl) return;
    
    if (!postTitle.trim()) {
      alert('Please enter a title for your post');
      return;
    }
    
    setIsCreatingPost(true);
    try {
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
          title: postTitle.trim(),
          description: postDescription.trim() || null,
          video_url: uploadedVideoUrl,
          thumbnail_url: thumbnailUrl,
          status,
          tags: postTags
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
        setUploadedThumbnailUrl(null);
        setPostTitle('');
        setPostDescription('');
        setPostTags([]);
      } else {
        throw new Error(response.data.message || 'Failed to create post');
      }
    } catch (error: any) {
      console.error('Error creating post:', error);
      alert(error.response?.data?.detail || error.message || 'Failed to create post. Please try again.');
    } finally {
      setIsCreatingPost(false);
    }
  }, [uploadedVideoUrl, uploadedThumbnailUrl, postTitle, postDescription, postTags]);

  // Handle tag management
  const addTag = React.useCallback(() => {
    if (newTag.trim() && !postTags.includes(newTag.trim())) {
      setPostTags([...postTags, newTag.trim()]);
      setNewTag('');
    }
  }, [newTag, postTags]);

  const removeTag = React.useCallback((tagToRemove: string) => {
    setPostTags(postTags.filter(tag => tag !== tagToRemove));
  }, [postTags]);

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

  const handleDownloadWithUpload = React.useCallback(
    async (render: RenderItem) => {
      if (!render?.url) {
        return;
      }

      let videoUrl = render.supabaseUrl;
      let thumbnailUrl = render.thumbnailUrl ?? null;

      if (!videoUrl) {
        if (uploadInProgressRef.current.has(render.id)) {
          console.log("[Video Upload] Upload already running for this render, ignoring duplicate trigger.");
          return;
        }

        uploadInProgressRef.current.add(render.id);
        setRenders((prev) =>
          prev.map((item) =>
            item.id === render.id ? { ...item, isUploading: true } : item
          )
        );

        try {
          const projectName = projectId || "podverse-video";
          const uploadResult = await uploadVideoToSupabase(
            render.url,
            render.id,
            projectName
          );

          if (!uploadResult.video_url) {
            throw new Error("Failed to upload video to Supabase. Please try again.");
          }

          videoUrl = uploadResult.video_url;
          thumbnailUrl = uploadResult.thumbnail_url ?? null;

          setRenders((prev) =>
            prev.map((item) =>
              item.id === render.id
                ? {
                    ...item,
                    supabaseUrl: videoUrl,
                    thumbnailUrl,
                    isUploading: false,
                  }
                : item
            )
          );
          console.log("[Video Upload] Video saved to Supabase:", videoUrl);
        } catch (error: any) {
          console.error("[Video Upload] Failed during download flow:", error);
          setRenders((prev) =>
            prev.map((item) =>
              item.id === render.id ? { ...item, isUploading: false } : item
            )
          );
          uploadInProgressRef.current.delete(render.id);

          alert(
            error?.response?.data?.detail ||
              error?.message ||
              "Failed to upload video to Supabase. Please try again."
          );
          return;
        }

        uploadInProgressRef.current.delete(render.id);
      }

      if (videoUrl) {
        setUploadedVideoUrl(videoUrl);
        setUploadedThumbnailUrl(thumbnailUrl || null);
        setShowPostModal(true);
      }

      handleDownload(render.url);
    },
    [projectId, uploadVideoToSupabase, handleDownload]
  );

  // Add new render to the list when completed
  React.useEffect(() => {
    if (state.status === "done" && state.url) {
      if (processedRenderUrlsRef.current.has(state.url)) {
        return;
      }

      processedRenderUrlsRef.current.add(state.url);

      const renderId = crypto.randomUUID();
      const newRender: RenderItem = {
        url: state.url,
        timestamp: new Date(),
        id: renderId,
        status: "success",
        isUploading: false,
      };

      setRenders((prev) => [newRender, ...prev]);
      setHasNewRender(true);

      if (autoDownloadPending) {
        setAutoDownloadPending(false);
        handleDownloadWithUpload(newRender);
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
  }, [state.status, state.url, state.error, autoDownloadPending, handleDownloadWithUpload]);

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
                      onClick={() => handleDownloadWithUpload(render)}
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
        <PostCreationModal
          postTitle={postTitle}
          setPostTitle={setPostTitle}
          postDescription={postDescription}
          setPostDescription={setPostDescription}
          postTags={postTags}
          newTag={newTag}
          setNewTag={setNewTag}
          addTag={addTag}
          removeTag={removeTag}
          handleCreatePost={handleCreatePost}
          isCreatingPost={isCreatingPost}
          onClose={() => setShowPostModal(false)}
        />
      )}
    </>
  );
};

export default RenderControls;
