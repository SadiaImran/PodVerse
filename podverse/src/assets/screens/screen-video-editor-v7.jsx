import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import VideoEditorWrapper from "../../features/video-editor-v7/VideoEditorWrapper";

const VideoEditorV7Screen = () => {
  const location = useLocation();

  useEffect(() => {
    const fromState = location.state?.videoUrl;
    const stored = fromState || sessionStorage.getItem('videoEditorSource');
    if (stored) {
      try {
        sessionStorage.setItem('videoEditorSource', stored);
        // Store original video path and job ID for upload overwrite
        if (location.state?.originalVideoPath) {
          sessionStorage.setItem('originalVideoPath', location.state.originalVideoPath);
        }
        if (location.state?.jobId) {
          sessionStorage.setItem('videoJobId', location.state.jobId);
        }
        console.log('📹 Video URL stored for editor:', stored);
      } catch (err) {
        console.warn('Unable to persist videoEditorSource:', err);
      }
    }
  }, [location.state]);

  const videoUrl = location.state?.videoUrl || sessionStorage.getItem('videoEditorSource');
  const videoPath = location.state?.videoPath || sessionStorage.getItem('originalVideoPath');
  const videoName = location.state?.videoName || (videoPath ? videoPath.split('/').pop() : 'podcast_video.mp4');
  const originalVideoPath = location.state?.originalVideoPath || sessionStorage.getItem('originalVideoPath');
  const jobId = location.state?.jobId || sessionStorage.getItem('videoJobId');
  
  // Debug logging
  useEffect(() => {
    if (videoUrl) {
      console.log('📹 Video Editor - Video URL received:', videoUrl);
      console.log('📹 Video Editor - Video Name:', videoName);
      console.log('📹 Video Editor - Video Path:', videoPath);
      console.log('📹 Video Editor - Original Path:', originalVideoPath);
      console.log('📹 Video Editor - Job ID:', jobId);
    } else {
      console.warn('⚠️ Video Editor - No video URL found!');
      console.warn('⚠️ Location state:', location.state);
      console.warn('⚠️ SessionStorage videoEditorSource:', sessionStorage.getItem('videoEditorSource'));
      console.warn('⚠️ SessionStorage originalVideoPath:', sessionStorage.getItem('originalVideoPath'));
      console.warn('⚠️ SessionStorage videoJobId:', sessionStorage.getItem('videoJobId'));
    }
  }, [videoUrl, videoName, videoPath, originalVideoPath, jobId, location.state]);

  return (
    <div className="w-full h-screen overflow-hidden relative">
      <VideoEditorWrapper 
        projectId="PODVERSE_PROJECT" 
        hideSidebar={false}
        initialVideoUrl={videoUrl}
        initialVideoPath={videoPath}
        initialVideoName={videoName}
        originalVideoPath={originalVideoPath}
        jobId={jobId}
      />
    </div>
  );
};

export default VideoEditorV7Screen;


