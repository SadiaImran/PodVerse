import BaseLayout from "../components/layouts/BaseLayout";
import PodcastPostBox from "../components/feed/podcast-post-box";
import ActivityFeed from "../components/feed/activity-feed";
import SuggestionsSidebar from "../components/feed/suggestions-sidebar";

const ActivityFeedPage = () => {
  return (
    <BaseLayout>
      <div className="flex flex-col-reverse lg:flex-row p-4 sm:p-6 lg:p-8 items-start gap-6 w-full max-w-7xl mx-auto container ">
        <div className="flex-1 min-w-0 w-full space-y-3">
          <PodcastPostBox />
          <ActivityFeed />
        </div>
        <div className="w-full lg:w-80 mt-6 lg:mt-0  top-4">
          <SuggestionsSidebar />
        </div>
      </div>
    </BaseLayout>
  );
};

export default ActivityFeedPage;
