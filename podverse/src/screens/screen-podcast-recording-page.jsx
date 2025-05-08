import React from 'react';
import BaseLayout from "../components/layouts/BaseLayout"
import PodcastRecordingUI from "./screen-recording-podcast"

const PodcastRecordingPage = () => {
  return (
    <BaseLayout>
      <div className="w-full h-full p-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Podcast Recording Studio</h1>
          <p className="text-gray-600">Create professional podcasts with AI guest assistance</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm overflow-hidden h-[calc(100vh-180px)]">
          <PodcastRecordingUI />
        </div>
      </div>
    </BaseLayout>
  );
};

export default PodcastRecordingPage;