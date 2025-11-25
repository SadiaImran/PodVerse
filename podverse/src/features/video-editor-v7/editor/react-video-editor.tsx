
// UI Components
import { SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/sidebar/app-sidebar";
import { Editor } from "./components/core/editor";
import { SidebarProvider as UISidebarProvider } from "@/components/ui/sidebar";
import { SidebarProvider as EditorSidebarProvider } from "./contexts/sidebar-context";

// Context Providers
import { EditorProvider } from "./contexts/editor-context";

// Custom Hooks
import { useOverlays } from "./hooks/use-overlays";
import { useVideoPlayer } from "./hooks/use-video-player";
import { useTimelineClick } from "./hooks/use-timeline-click";
import { useAspectRatio } from "./hooks/use-aspect-ratio";
import { useCompositionDuration } from "./hooks/use-composition-duration";
import { useHistory } from "./hooks/use-history";

// Types
import { Overlay, OverlayType } from "./types";
import { useRendering } from "./hooks/use-rendering";
import {
  AUTO_SAVE_INTERVAL,
  DEFAULT_OVERLAYS,
  FPS,
  RENDER_TYPE,
} from "./constants";
import { TimelineProvider } from "./contexts/timeline-context";

// Autosave Components
import { AutosaveRecoveryDialog } from "./components/autosave/autosave-recovery-dialog";
import { AutosaveStatus } from "./components/autosave/autosave-status";
import { useState, useEffect, useRef } from "react";
import { useAutosave } from "./hooks/use-autosave";
import { LocalMediaProvider } from "./contexts/local-media-context";
import { KeyframeProvider } from "./contexts/keyframe-context";
import { AssetLoadingProvider } from "./contexts/asset-loading-context";

export default function ReactVideoEditor({ 
  projectId, 
  hideSidebar = false,
  initialVideoUrl,
  initialVideoPath,
  initialVideoName,
  originalVideoPath,
  jobId
}: { 
  projectId: string; 
  hideSidebar?: boolean;
  initialVideoUrl?: string;
  initialVideoPath?: string;
  initialVideoName?: string;
  originalVideoPath?: string;
  jobId?: string;
}) {
  // Autosave state
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [autosaveTimestamp, setAutosaveTimestamp] = useState<number | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Overlay management hooks
  const {
    overlays,
    setOverlays,
    selectedOverlayId,
    setSelectedOverlayId,
    changeOverlay,
    addOverlay,
    deleteOverlay,
    duplicateOverlay,
    splitOverlay,
    deleteOverlaysByRow,
    updateOverlayStyles,
    resetOverlays,
  } = useOverlays(DEFAULT_OVERLAYS);

  // Video player controls and state
  const { isPlaying, currentFrame, playerRef, togglePlayPause, formatTime } =
    useVideoPlayer();

  // Composition duration calculations
  const { durationInFrames, durationInSeconds } =
    useCompositionDuration(overlays);

  // Aspect ratio and player dimension management
  const {
    aspectRatio,
    setAspectRatio,
    playerDimensions,
    updatePlayerDimensions,
    getAspectRatioDimensions,
  } = useAspectRatio();

  // Event handlers
  const handleOverlayChange = (updatedOverlay: Overlay) => {
    changeOverlay(updatedOverlay.id, () => updatedOverlay);
  };

  const { width: compositionWidth, height: compositionHeight } =
    getAspectRatioDimensions();

  const handleTimelineClick = useTimelineClick(playerRef, durationInFrames);

  const inputProps = {
    overlays,
    durationInFrames,
    fps: FPS,
    width: compositionWidth,
    height: compositionHeight,
    src: "",
  };

  const { renderMedia, state } = useRendering(
    "TestComponent",
    inputProps,
    RENDER_TYPE
  );

  // Replace history management code with hook
  const { undo, redo, canUndo, canRedo } = useHistory(overlays, setOverlays);

  // Create the editor state object to be saved
  const editorState = {
    overlays,
    aspectRatio,
    playerDimensions,
  };

  // Implment load state
  const { saveState, loadState } = useAutosave(projectId, editorState, {
    interval: AUTO_SAVE_INTERVAL,
    onSave: () => {
      setIsSaving(false);
      setLastSaveTime(Date.now());
    },
    onLoad: (loadedState) => {
      console.log("loadedState", loadedState);
      if (loadedState) {
        // Apply loaded state to editor
        setOverlays(loadedState.overlays || []);
        if (loadedState.aspectRatio) setAspectRatio(loadedState.aspectRatio);
        if (loadedState.playerDimensions)
          updatePlayerDimensions(
            loadedState.playerDimensions.width,
            loadedState.playerDimensions.height
          );
      }
    },
    onAutosaveDetected: (timestamp) => {
      // Only show recovery dialog on initial load, not during an active session
      if (!initialLoadComplete) {
        setAutosaveTimestamp(timestamp);
        setShowRecoveryDialog(true);
      }
    },
  });

  // Mark initial load as complete after component mounts
  useEffect(() => {
    setInitialLoadComplete(true);
  }, []);

  // Track if video has been auto-loaded
  const videoAutoLoadedRef = useRef(false);
  const overlaysRef = useRef<Overlay[]>(overlays);

  useEffect(() => {
    overlaysRef.current = overlays;
  }, [overlays]);

  // Auto-load initial video URL to timeline
  useEffect(() => {
    // If no initialVideoUrl, keep default videos and exit
    if (!initialVideoUrl) {
      console.log('⚠️ No initial video URL provided, keeping default videos');
      console.log('⚠️ Available props:', { initialVideoUrl, initialVideoPath, initialVideoName, originalVideoPath, jobId });
      return;
    }
    
    // Check if video with this URL already exists in overlays
    const videoAlreadyExists = overlays.some(ov => ov.type === OverlayType.VIDEO && ov.src === initialVideoUrl);
    if (videoAlreadyExists) {
      console.log('⏭️ Video already exists in timeline, skipping');
      videoAutoLoadedRef.current = true;
      return;
    }
    
    // Skip if already attempted to load (but check again if overlays changed)
    if (videoAutoLoadedRef.current && !overlays.some(ov => ov.src === initialVideoUrl)) {
      console.log('⏭️ Video auto-load already attempted, but video not found. Retrying...');
      videoAutoLoadedRef.current = false; // Reset to allow retry
    }
    
    if (videoAutoLoadedRef.current) {
      console.log('⏭️ Video already auto-loaded, skipping');
      return;
    }
    
    console.log('🎬 Auto-loading initial video to timeline:', initialVideoUrl);
    console.log('📊 Current overlays count:', overlays.length);
    console.log('📋 Video details:', { initialVideoName, initialVideoPath, originalVideoPath, jobId });
    
    // Remove ALL default overlays - we want a clean timeline with only our video
    console.log('🧹 Cleaning timeline - removing ALL default overlays');
    const allDefaultOverlays = [...overlays]; // Copy array to avoid mutation during iteration
    if (allDefaultOverlays.length > 0) {
      console.log('🗑️ Removing', allDefaultOverlays.length, 'default overlay(s)');
      allDefaultOverlays.forEach(ov => {
        console.log('🗑️ Removing overlay:', ov.id, ov.type, ov.src?.substring(0, 50) || 'no src');
        deleteOverlay(ov.id);
      });
    }
    
    // Wait for deletions to complete, then add our video
    const addVideoTimeout = setTimeout(() => {
      if (!initialVideoUrl) {
        console.warn('⚠️ No video URL to add');
        return;
      }
      
      console.log('➕ Adding video to timeline:', initialVideoUrl);
      
      // Get video duration FIRST before adding overlay
      const { width, height } = getAspectRatioDimensions();
      
      // Create video element to get duration
      const video = document.createElement('video');
      video.src = initialVideoUrl;
      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';
      video.muted = true;
      
      let overlayAdded = false;
      let metadataTimeout: NodeJS.Timeout | null = null;
      
      const addVideoWithDuration = (durationInSeconds: number) => {
        if (overlayAdded) {
          console.log('⚠️ Video already added, skipping');
          return;
        }
        
        // Ensure duration is valid and reasonable
        // Clamp between 1 second and 1 hour, and ensure it's finite
        const safeDuration = Math.max(1, Math.min(
          isFinite(durationInSeconds) ? durationInSeconds : 10,
          3600
        ));
        
        // Convert to frames (30fps) - use exact calculation, no rounding issues
        const actualDurationFrames = Math.floor(safeDuration * 30);
        
        // Ensure minimum 30 frames (1 second) for Remotion
        const finalDurationFrames = Math.max(30, actualDurationFrames);
        
        console.log('📏 Setting video overlay duration:', {
          inputSeconds: durationInSeconds,
          isFinite: isFinite(durationInSeconds),
          safeDuration,
          actualFrames: actualDurationFrames,
          finalFrames: finalDurationFrames,
          videoUrl: initialVideoUrl?.substring(0, 80) + '...'
        });
        
        // CRITICAL: Ensure video overlay duration matches actual video length
        // This prevents Remotion from trying to access frames beyond the video
        const newOverlay: Overlay = {
          left: 0,
          top: 0,
          width,
          height,
          durationInFrames: finalDurationFrames, // Must match actual video duration
          from: 0, // Always start at frame 0 of composition
          id: Date.now(),
          rotation: 0,
          row: 0,
          isDragging: false,
          type: OverlayType.VIDEO,
          content: initialVideoName || 'Video',
          src: initialVideoUrl,
          videoStartTime: 0, // Start from beginning of video file (0 seconds)
          styles: {
            opacity: 1,
            zIndex: 100,
            transform: 'none',
            objectFit: 'cover',
          },
        };
        
        try {
          addOverlay(newOverlay);
          overlayAdded = true;
          videoAutoLoadedRef.current = true; // Mark as loaded ONLY after successful addition
          console.log('✅ Video overlay added successfully:', {
            id: newOverlay.id,
            durationFrames: finalDurationFrames,
            durationSeconds: safeDuration,
            from: newOverlay.from,
            videoStartTime: newOverlay.videoStartTime,
            src: newOverlay.src?.substring(0, 60) + '...'
          });
        } catch (error) {
          console.error('❌ Failed to add video overlay:', error);
          videoAutoLoadedRef.current = false; // Reset on error to allow retry
        }
      };
      
      // Add video immediately with fallback duration, then update if metadata loads
      console.log('🚀 Adding video immediately with fallback duration...');
      addVideoWithDuration(10); // Start with 10 seconds, will update when metadata loads
      
      const handleLoadedMetadata = () => {
        const duration = video.duration;
        console.log('🎬 Video metadata loaded:', {
          duration,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          readyState: video.readyState
        });
        
        if (duration && !isNaN(duration) && duration > 0 && isFinite(duration)) {
          console.log('✅ Updating video duration to actual:', duration, 'seconds');
          // Find and update the overlay we just added
          const currentOverlays = overlaysRef.current;
          const videoOverlay = currentOverlays.find(ov => ov.src === initialVideoUrl);
          if (videoOverlay) {
            const actualDurationFrames = Math.floor(duration * 30);
            changeOverlay(videoOverlay.id, (current) => ({
              ...current,
              durationInFrames: Math.max(30, actualDurationFrames),
            }));
            console.log('✅ Video duration updated to:', actualDurationFrames, 'frames');
          } else {
            // If overlay not found, add it with correct duration
            console.log('⚠️ Video overlay not found, adding with correct duration');
            overlayAdded = false; // Reset flag to allow adding
            addVideoWithDuration(duration);
          }
        } else {
          console.warn('⚠️ Invalid video duration:', duration, '- keeping fallback duration');
        }
        
        if (metadataTimeout) {
          clearTimeout(metadataTimeout);
        }
      };
      
      const handleError = (err: any) => {
        console.error('❌ Failed to load video metadata:', err);
        if (!overlayAdded) {
          console.log('⚠️ Using fallback duration due to error');
          addVideoWithDuration(10); // 10 seconds fallback (safer)
        }
        if (metadataTimeout) {
          clearTimeout(metadataTimeout);
        }
      };
      
      // Set timeout - if metadata doesn't load in 10 seconds, use conservative fallback
      metadataTimeout = setTimeout(() => {
        if (!overlayAdded) {
          console.warn('⏱️ Metadata loading timeout after 10 seconds, using conservative fallback');
          // Use shorter fallback to avoid rendering issues
          addVideoWithDuration(10); // 10 seconds fallback (safer)
        }
      }, 10000); // Increased to 10 seconds to give more time for metadata
      
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('error', handleError);
      
      // Try to load metadata
      video.load();
    }, 500); // Wait 500ms for deletions to complete
    
    // Cleanup for useEffect
    return () => {
      clearTimeout(addVideoTimeout);
    };
  }, [initialVideoUrl, initialVideoName, addOverlay, deleteOverlay, getAspectRatioDimensions, overlays.length]);

  // Debug: Log overlays and composition duration
  useEffect(() => {
    const videoOverlays = overlays.filter(ov => ov.type === OverlayType.VIDEO);
    const maxVideoEnd = videoOverlays.length > 0 
      ? Math.max(...videoOverlays.map(ov => (ov.from || 0) + (ov.durationInFrames || 0)))
      : 0;
    console.log("📊 Composition Debug:", {
      totalOverlays: overlays.length,
      videoOverlays: videoOverlays.length,
      compositionDurationFrames: durationInFrames,
      compositionDurationSeconds: durationInSeconds,
      maxVideoEndFrame: maxVideoEnd,
      videoOverlayDetails: videoOverlays.map(ov => ({
        id: ov.id,
        from: ov.from,
        duration: ov.durationInFrames,
        end: (ov.from || 0) + (ov.durationInFrames || 0),
        src: ov.src?.substring(0, 50) + '...'
      }))
    });
  }, [overlays, durationInFrames, durationInSeconds]);
  // Handle recovery dialog actions
  const handleRecoverAutosave = async () => {
    const loadedState = await loadState();
    console.log("loadedState", loadedState);
    setShowRecoveryDialog(false);
  };

  const handleDiscardAutosave = () => {
    setShowRecoveryDialog(false);
  };

  // Manual save function for use in keyboard shortcuts or save button
  const handleManualSave = async () => {
    setIsSaving(true);
    await saveState();
  };

  // Set up keyboard shortcut for manual save (Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleManualSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editorState]);

  // Combine all editor context values
  const editorContextValue = {
    // Overlay management
    overlays,
    setOverlays,
    selectedOverlayId,
    setSelectedOverlayId,
    changeOverlay,
    handleOverlayChange,
    addOverlay,
    deleteOverlay,
    duplicateOverlay,
    splitOverlay,
    resetOverlays,

    // Player controls
    isPlaying,
    currentFrame,
    playerRef,
    togglePlayPause,
    formatTime,
    handleTimelineClick,
    playbackRate,
    setPlaybackRate,

    // Dimensions and duration
    aspectRatio,
    setAspectRatio,
    playerDimensions,
    updatePlayerDimensions,
    getAspectRatioDimensions,
    durationInFrames,
    durationInSeconds,

    // Add renderType to the context
    renderType: RENDER_TYPE,
    renderMedia,
    state,

    deleteOverlaysByRow,

    // History management
    undo,
    redo,
    canUndo,
    canRedo,

    // New style management
    updateOverlayStyles,

    // Autosave
    saveProject: handleManualSave,

    // Project ID
    projectId,
  };

  return (
    <UISidebarProvider>
      <EditorSidebarProvider>
        <KeyframeProvider>
          <TimelineProvider>
            <EditorProvider value={editorContextValue}>
              <LocalMediaProvider>
                <AssetLoadingProvider>
                  {hideSidebar ? (
                    <>
                      <div className="flex-1 overflow-hidden h-full">
                        <Editor />
                      </div>
                      {/* Autosave Status Indicator */}
                      <AutosaveStatus
                        isSaving={isSaving}
                        lastSaveTime={lastSaveTime}
                      />
                      {/* Autosave Recovery Dialog */}
                      {showRecoveryDialog && autosaveTimestamp && (
                        <AutosaveRecoveryDialog
                          projectId={projectId}
                          timestamp={autosaveTimestamp}
                          onRecover={handleRecoverAutosave}
                          onDiscard={handleDiscardAutosave}
                          onClose={() => setShowRecoveryDialog(false)}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex h-full w-full">
                        <AppSidebar />
                        <SidebarInset className="flex-1 overflow-hidden">
                          <Editor />
                        </SidebarInset>
                      </div>
                      {/* Autosave Status Indicator */}
                      <AutosaveStatus
                        isSaving={isSaving}
                        lastSaveTime={lastSaveTime}
                      />
                      {/* Autosave Recovery Dialog */}
                      {showRecoveryDialog && autosaveTimestamp && (
                        <AutosaveRecoveryDialog
                          projectId={projectId}
                          timestamp={autosaveTimestamp}
                          onRecover={handleRecoverAutosave}
                          onDiscard={handleDiscardAutosave}
                          onClose={() => setShowRecoveryDialog(false)}
                        />
                      )}
                    </>
                  )}
                </AssetLoadingProvider>
              </LocalMediaProvider>
            </EditorProvider>
          </TimelineProvider>
        </KeyframeProvider>
      </EditorSidebarProvider>
    </UISidebarProvider>
  );
}
