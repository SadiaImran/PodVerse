import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Circle } from "lucide-react"; // Using only Circle from lucide
import BaseLayout from "../components/layouts/BaseLayout";
import RecentPodcasts from "../components/create-podcast/recent-podcasts"; // Importing RecentPodcast component
import SamplePodcasts from "../components/create-podcast/sample-podcasts"; // Importing SamplePodcast component

const CreatePodcastPage = () => {
  const [activeTab, setActiveTab] = useState("library");
  const hasPodcasts = true; // Change this flag to true to test recent podcasts

  const navigate = useNavigate();

  return (
    <BaseLayout>
      <main className="flex-1 overflow-y-auto p-6 md:p-10 bg-light space-y-8">

        {/* Top Header */}
        <div className="flex justify-between items-center">
          <div className="text-2xl font-bold text-gray-800">Library</div>
          <button 
          onClick={() => navigate("/agent-setup")}
          className="flex items-center gap-2 bg-light-purple text-white px-4 py-2 rounded-lg font-semibold hover:scale-105 shadow-lg transition duration-300">
            <span className="relative w-5 h-5">
              <Circle className="w-5 h-5 text-white" />
              <span className="absolute top-1/2 left-1/2 w-2.5 h-2.5 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2"></span>
            </span>
            Record New
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-6 border-b border-gray-300 text-gray-600 font-medium">
          <button
            className={`pb-2 ${activeTab === "library" ? "border-b-2 border-light-purple text-light-purple" : "hover:text-light-lightPurple"}`}
            onClick={() => setActiveTab("library")}
          >
            Library
          </button>
          <button
            className={`pb-2 ${activeTab === "sample" ? "border-b-2 border-light-purple text-light-purple" : "hover:text-light-lightPurple"}`}
            onClick={() => setActiveTab("sample")}
          >
            Sample
          </button>
        </div>

        {/* Content */}
        <div className="bg-white border border-gray-200 rounded-xl p-10 shadow-sm min-h-[300px]">
          {activeTab === "library" && (
            <RecentPodcasts hasPodcasts={hasPodcasts} /> // Calling RecentPodcast component
          )}

          {activeTab === "sample" && (
            <SamplePodcasts /> // Calling SamplePodcast component
          )}

        </div>
      </main>
    </BaseLayout>
  );
};

export default CreatePodcastPage;
