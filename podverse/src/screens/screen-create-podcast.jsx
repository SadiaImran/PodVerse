import { useState } from "react";
import LeftSidebar from "../components/navigations-bar/left-sidebar.jsx";
import Topbar from "../components/navigations-bar/top-bar.jsx";
import CreatePodcastIntro from "../components/create-podcast/create-podcast-intro.jsx";
import RecentPodcasts from "../components/create-podcast/recent-podcasts.jsx";
import SamplePodcasts from "../components/create-podcast/sample-podcasts.jsx";

const CreatePodcastPage = () => {
    const [open, setOpen] = useState(true);
  return (
    <div className="flex h-screen bg-white flex-col md:flex-row overflow-hidden">
      <LeftSidebar open={open} setOpen={setOpen}/>
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar open={open}/>
        <main className="flex-1 overflow-y-auto p-8 md:p-10 space-y-12 bg-gray-50">
          <CreatePodcastIntro />
          <RecentPodcasts />
          <SamplePodcasts />
        </main>
      </div>
    </div>
  );
};

export default CreatePodcastPage;
