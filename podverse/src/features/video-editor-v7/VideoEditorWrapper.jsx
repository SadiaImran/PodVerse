import React from "react";
import ReactVideoEditor from "./editor/react-video-editor";

const VideoEditorWrapper = ({ projectId, hideSidebar = false, initialVideoUrl, initialVideoPath, initialVideoName, originalVideoPath, jobId }) => {
  return (
    <div className="w-full h-full">
      <ReactVideoEditor 
        projectId={projectId} 
        hideSidebar={hideSidebar}
        initialVideoUrl={initialVideoUrl}
        initialVideoPath={initialVideoPath}
        initialVideoName={initialVideoName}
        originalVideoPath={originalVideoPath}
        jobId={jobId}
      />
    </div>
  );
};

export default VideoEditorWrapper;
