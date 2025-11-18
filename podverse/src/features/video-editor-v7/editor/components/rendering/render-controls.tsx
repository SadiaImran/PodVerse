import React from "react";
import { Download, Loader2, Bell, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";

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
  timestamp: Date;
  id: string;
  status: "success" | "error";
  error?: string;
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
  // Store multiple renders
  const [renders, setRenders] = React.useState<RenderItem[]>([]);
  // Track if there are new renders
  const [hasNewRender, setHasNewRender] = React.useState(false);
  const [isProjectSaved, setIsProjectSaved] = React.useState(false);
  const [isSavingProject, setIsSavingProject] = React.useState(false);
  const [autoDownloadPending, setAutoDownloadPending] = React.useState(false);

  // Check if rendering is disabled via environment variable
  const isRenderDisabled = import.meta.env.VITE_DISABLE_RENDER === "true";

  // Add new render to the list when completed
  React.useEffect(() => {
    if (state.status === "done") {
      setRenders((prev) => [
        {
          url: state.url,
          timestamp: new Date(),
          id: crypto.randomUUID(),
          status: "success",
        },
        ...prev,
      ]);
      setHasNewRender(true);
      if (autoDownloadPending && state.url) {
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
  }, [state.status, state.url, state.error, autoDownloadPending]);

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

  const handleDownload = (url: string) => {
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
                  <div className="flex flex-col">
                    <div className="text-xs text-gray-900 dark:text-gray-100">
                      {render.status === "error" ? (
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          Render Failed
                        </span>
                      ) : (
                        getDisplayFileName(render.url!)
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(render.timestamp, {
                        addSuffix: true,
                      })}
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
                      className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 h-6 w-6"
                      onClick={() => handleDownload(render.url!)}
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
    </>
  );
};

export default RenderControls;
