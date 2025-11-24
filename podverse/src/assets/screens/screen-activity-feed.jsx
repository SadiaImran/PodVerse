import React from 'react';
import ActivityFeed from '../components/feed/activity-feed';
import BaseLayout from "../components/layouts/BaseLayout";
import PodcastPostBox from '../components/feed/podcast-post-box';
import SuggestionsSidebar from '../components/feed/suggestions-sidebar';

// Main Layout Component
const ActivityFeedPage = () => {
  return (
    <BaseLayout homeScreen={false}>
      <div className="min-h-screen" style={{ backgroundColor: '#f3f4f6' }}>
          <div className="flex justify-center gap-12">
            {/* Main Content */}
            <div className="flex-1 max-w-5xl">
              <div className="py-6 px-2" style={{ backgroundColor: '#f3f4f6' }}>
                <PodcastPostBox />
                <ActivityFeed/>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="w-96 flex-shrink-0 hidden lg:block">
              <div className="sticky mt-4">
                <SuggestionsSidebar />
              </div>
            </div>
          </div>
  
      </div>
    </BaseLayout>
  );
};

export default ActivityFeedPage;
