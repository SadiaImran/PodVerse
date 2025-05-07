import { useState } from "react";
import { Podcast } from "lucide-react";
import placeholderImage from "../../assets/images/create-video-placeholder.png";

const RecentPodcast = ({ hasPodcasts }) => {
  const [activeTab, setActiveTab] = useState("uploaded");

  const uploadedPodcasts = [1, 2];
  const draftPodcasts = [3, 4];

  const AudioPlayer = ({ src }) => (
    <audio
      controls
      className="w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-light-purple bg-white"
    >
      <source src={src} type="audio/mp3" />
      Your browser does not support the audio element.
    </audio>
  );

  return (
    <div>
      {hasPodcasts ? (
        <>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Recent Podcasts</h2>
          <div className="flex space-x-6 border-b border-gray-300 text-gray-600 font-medium mb-6">
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

          <ul className="space-y-6">
            {(activeTab === "uploaded" ? uploadedPodcasts : draftPodcasts).map((id) => (
              <li key={id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <Podcast className="text-light-purple w-5 h-5" />
                    <span className="text-gray-900 font-medium">
                      {activeTab === "uploaded" ? `My Podcast ${id}` : `Draft Podcast ${id}`}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {activeTab === "uploaded"
                      ? `Description of podcast ${id}.`
                      : "This podcast is in draft status."}
                  </p>
                  {activeTab === "uploaded" ? (
                    <AudioPlayer src={`/user-audios/user${id}.mp3`} />
                  ) : (
                    <div className="w-full py-4 px-6 rounded-lg bg-gray-100 text-center text-gray-500">
                      Draft Audio Not Yet Uploaded
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center text-center">
          <img src={placeholderImage} alt="Create audio" className="w-60 mb-8" />
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Create your first podcast</h2>
          <p className="text-gray-500 text-base max-w-md">
            You haven’t created any podcasts yet. Tap “Record New” above to get started!
          </p>
        </div>
      )}
    </div>
  );
};

export default RecentPodcast;
