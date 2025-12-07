import React from 'react';
import ActivityFeed from '../components/feed/activity-feed';
import BaseLayout from "../components/layouts/BaseLayout";
import PodcastPostBox from '../components/feed/podcast-post-box';
import SuggestionsSidebar from '../components/feed/suggestions-sidebar';

// Main Layout Component
const ActivityFeedPage = () => {
  return (
    <BaseLayout homeScreen={false}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-light-lavender/10 to-light-purple/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-center gap-6 lg:gap-8">
            {/* Main Content */}
            <div className="flex-1 max-w-3xl w-full">
              <div className="space-y-6">
                <PodcastPostBox />
                <ActivityFeed/>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="w-80 flex-shrink-0 hidden lg:block">
              <div className="sticky top-6">
                <SuggestionsSidebar />
              </div>
            </div>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
};

export default ActivityFeedPage;
