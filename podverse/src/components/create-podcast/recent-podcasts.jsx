import { useState } from "react";
import { Podcast, Eye, ThumbsUp, MessageCircle } from "lucide-react";
import placeholderImage from "../../assets/images/create-video-placeholder.png";

const RecentPodcast = ({ hasPodcasts }) => {
  const [activeTab, setActiveTab] = useState("uploaded");
  const uploadedPodcasts = [1, 2];
  const draftPodcasts = [3, 4];

  const renderCard = (id, isDraft = false) => (
    <div className="inline-flex bg-gray-50 rounded-2xl shadow-md p-4 gap-4 items-start justify-center ">
      <div className="relative w-48 h-28 overflow-hidden rounded-lg">
        {isDraft ? (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
            Draft Video
          </div>
        ) : (
          <video controls className="w-full h-full object-cover rounded-md">
            <source src={`/user-videos/user${id}.mp4`} type="video/mp4" />
          </video>
        )}
      </div>
      <div className="flex flex-col justify-between flex-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Podcast className="text-light-purple w-5 h-5" />
            <span className="font-semibold text-gray-800">
              {isDraft ? `Draft Podcast ${id}` : `My Podcast ${id}`}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            {isDraft
              ? "This podcast is in draft status."
              : `Description of podcast ${id}.`}
          </p>
        </div>
        {!isDraft && (
          <div className="flex gap-2 text-xs mt-3">
            <span className="bg-light-cream text-light-grey yellow-800 px-2 py-1 rounded-full flex items-center gap-1">
              <Eye size={14} /> 100 views
            </span>
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center gap-1">
              <ThumbsUp size={14} /> 100 likes
            </span>
            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full flex items-center gap-1">
              <MessageCircle size={14} /> 20 comments
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 mt-3">
          <img
            src="https://randomuser.me/api/portraits/women/68.jpg"
            alt="Elizabeth Lee"
            className="w-7 h-7 rounded-full"
          />
          <span className="text-xs text-gray-500">Elizabeth Lee · 1h ago</span>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {hasPodcasts ? (
        <>
          {/* Tabs */}
          <div className="flex space-x-6 border-b border-gray-200 text-gray-600 font-medium mb-6">
            <button
              className={`pb-2 ${
                activeTab === "uploaded"
                  ? "border-b-2 border-light-purple text-light-purple"
                  : "hover:text-light-purple"
              }`}
              onClick={() => setActiveTab("uploaded")}
            >
              Uploaded
            </button>
            <button
              className={`pb-2 ${
                activeTab === "drafts"
                  ? "border-b-2 border-light-purple text-light-purple"
                  : "hover:text-light-purple"
              }`}
              onClick={() => setActiveTab("drafts")}
            >
              Drafts
            </button>
          </div>

          {/* Content */}
          <div className="flex flex-col md:flex-row gap-12">
            {(activeTab === "uploaded" ? uploadedPodcasts : draftPodcasts).map(
              (id) => renderCard(id, activeTab === "drafts")
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center text-center">
          <img
            src={placeholderImage}
            alt="Create video"
            className="w-60 mb-8"
          />
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Create your first podcast
          </h2>
          <p className="text-gray-500 text-base max-w-md">
            You haven’t created any podcasts yet. Tap “Record New” above to get
            started!
          </p>
        </div>
      )}
    </div>
  );
};

export default RecentPodcast;
