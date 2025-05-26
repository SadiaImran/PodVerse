import React from 'react';
import BaseLayout from "../components/layouts/BaseLayout"
import NewPanelsRecording from "../components/comp-recording/new-panel-recording"
function ScreenRecording () {
  return (
    <BaseLayout>
      <div className="w-full h-full p-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold  font-headingPoppins text-light-purple tracking-wide">
           Podcast Recording Studio</h1>
          <p className="font-headingPoppins tracking-wider text-light-grey text-base">Talk Smarter. Sound Better. Go Global</p>
        </div>
        
        <div className="border-2 rounded-lg shadow-sm overflow-hidden h-[calc(100vh-180px)]">
          <NewPanelsRecording />
        </div>
      </div>
    </BaseLayout>
  );
};

export default ScreenRecording;