import React from 'react';
import { useLocation } from 'react-router-dom';
import { Mic2, Radio } from 'lucide-react';
import BaseLayout from "../components/layouts/BaseLayout"
import NewPanelsRecording from "../components/comp-recording/new-panel-recording"

function ScreenRecording () {
  const location = useLocation();
  const podcastConfig = location.state?.podcastConfig || {};
  
  return (
    <BaseLayout homeScreen={false} autoCollapse={true}>
      <main className="relative min-h-screen flex flex-col" style={{ background: '#f3f4f6' }}>
        {/* Background Blobs */}
        <div className="fixed -top-28 -left-10 w-72 h-72 rounded-full blur-[120px] opacity-60 pointer-events-none z-0" style={{ background: '#b9a5ff' }} />
        <div className="fixed top-40 -right-10 w-96 h-96 rounded-full blur-[140px] opacity-40 pointer-events-none z-0" style={{ background: '#ffd5f6' }} />
        
        <div className="relative z-10 w-full h-full p-6 md:p-10">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: '#6057C7' }}>
                <Mic2 className="w-7 h-7" style={{ color: '#F9F5EB' }} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-1" style={{ color: '#6057C7' }}>
                  Podcast Recording Studio
                </h1>
                <p className="text-base md:text-lg" style={{ color: '#6A6A6A' }}>
                  Talk Smarter. Sound Better. Go Global
                </p>
              </div>
            </div>
          </div>
          
          {/* Main Recording Panel */}
          <div className="rounded-[28px] border border-white/60 bg-white/85 backdrop-blur-xl shadow-[0_20px_60px_rgba(96,87,199,0.1)] overflow-hidden h-[calc(100vh-220px)]">
            <NewPanelsRecording podcastConfig={podcastConfig} />
          </div>
        </div>
      </main>
    </BaseLayout>
  );
};

export default ScreenRecording;