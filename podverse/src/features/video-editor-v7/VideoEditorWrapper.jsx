import React from "react";
import ReactVideoEditor from "./editor/react-video-editor";

const VideoEditorWrapper = ({ projectId, hideSidebar = false }) => {
  return (
    <div className="w-full h-full">
      <ReactVideoEditor projectId={projectId} hideSidebar={hideSidebar} />
    </div>
  );
};

export default VideoEditorWrapper;
