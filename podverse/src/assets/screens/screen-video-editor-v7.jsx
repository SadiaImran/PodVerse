import React from "react";
import VideoEditorWrapper from "../../features/video-editor-v7/VideoEditorWrapper";

const VideoEditorV7Screen = () => {
  return (
    <div className="w-full h-screen overflow-hidden">
      <VideoEditorWrapper projectId="PODVERSE_PROJECT" hideSidebar={false} />
    </div>
  );
};

export default VideoEditorV7Screen;


