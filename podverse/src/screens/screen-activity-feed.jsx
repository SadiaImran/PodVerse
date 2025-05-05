import { useState } from "react";
import Topbar from "../components/navigations-bar/top-bar";
import LeftSidebar from "../components/navigations-bar/left-sidebar";
import ActivityFeed from "../components/feed/activity-feed";
import SuggestionsSidebar from "../components/feed/suggestions-sidebar";
import PodcastPostBox from "../components/feed/podcast-post-box";

const ActivityFeedPage = () => {
    const [open, setOpen] = useState(true);
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <LeftSidebar  open={open} setOpen={setOpen} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Topbar */}
        <Topbar open={open}/>

        {/* Page Content */}
        <div className="flex flex-col md:flex-row p-6 md:p-10 gap-8">
          {/* Activity Feed */}
          <div className="w-full md:w-3/4 space-y-6">
            <PodcastPostBox />
            <ActivityFeed />
          </div>

          {/* Suggestions Sidebar */}
          <div className="w-full md:w-1/4">
            <SuggestionsSidebar />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityFeedPage;
