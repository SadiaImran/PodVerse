import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import BaseLayout from "../components/layouts/BaseLayout";
import banner2 from "../images/banner-2.png";
import { supabase } from "../../connection_supabase_client";

const CreatePodcastPage = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [activeTab, setActiveTab] = useState("drafts");

  // Load user profile from Supabase
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        setFullName(profile?.full_name || "User");
      }
    };
    loadProfile();
  }, []);

  // Sample videos data
  const sampleVideos = [
    {
      id: 1,
      title: "Sadia's Podcast Episode",
      date: "Sep 22, 2025",
      status: "Draft",
      duration: "00:00",
      editedBy: "you",
      editedTime: "1 minute ago",
      thumbnail: "bg-purple-100"
    },
    {
      id: 2,
      title: "Tech Talk Series",
      date: "Sep 21, 2025", 
      status: "Draft",
      duration: "00:10",
      editedBy: "you",
      editedTime: "1 day ago",
      thumbnail: "bg-gray-900"
    },
    {
      id: 3,
      title: "Marketing Insights",
      date: "Sep 20, 2025",
      status: "Published",
      duration: "15:45",
      editedBy: "you",
      editedTime: "2 days ago",
      thumbnail: "bg-blue-100"
    },
    {
      id: 4,
      title: "Startup Stories",
      date: "Sep 19, 2025",
      status: "Published",
      duration: "22:30",
      editedBy: "you",
      editedTime: "3 days ago",
      thumbnail: "bg-green-100"
    },
    {
      id: 5,
      title: "Business Basics",
      date: "Sep 18, 2025",
      status: "Published",
      duration: "18:15",
      editedBy: "you",
      editedTime: "4 days ago",
      thumbnail: "bg-pink-100"
    },
    {
      id: 6,
      title: "Future of AI",
      date: "Sep 17, 2025",
      status: "Draft",
      duration: "00:05",
      editedBy: "you",
      editedTime: "5 days ago",
      thumbnail: "bg-indigo-100"
    }
  ];

  // Filter videos based on active tab
  const filteredVideos = sampleVideos.filter(video => 
    activeTab === "drafts" ? video.status === "Draft" : video.status === "Published"
  );

  return (
    <BaseLayout homeScreen={false} autoCollapse={true}>
      <main className="flex-1 overflow-y-auto bg-white">
        
        {/* Hero Banner */}
        <div className="relative h-72 overflow-hidden">
          <img 
            src={banner2}
            alt="PodVerse Banner" 
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black bg-opacity-40"></div>
          <div className="relative z-10 flex items-center h-full px-6 md:px-10">
            <div className="text-white">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Welcome to PodVerse</h1>
              <p className="text-lg md:text-xl mb-6">Create amazing podcasts with AI</p>
              <button onClick={() => navigate("/agent-setup")} className="bg-light-purple text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-light-purple hover:border hover:border-light-purple transition-all duration-300">
                Get Started →
              </button>
            </div>
          </div>
        </div>

        {/* Greeting Section */}
        <div className="px-6 md:px-10 py-6 bg-white border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                Hello, {fullName}
              </h2>
              <p className="text-gray-600">Let's get started</p>
            </div>
            
            {/* New Project Button */}
            <button 
              onClick={() => navigate("/agent-setup")}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors">
              <Plus className="w-4 h-4 inline mr-2" />
              New project
            </button>
          </div>
        </div>

        {/* Videos Section */}
        <div className="px-6 md:px-10 py-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Videos</h3>
          
          {/* Tabs */}
          <div className="flex space-x-8 border-b border-gray-200 mb-6">
            <button
              className={`pb-2 font-medium transition-colors ${
                activeTab === "drafts" 
                  ? "border-b-2 border-purple-600 text-purple-600" 
                  : "text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => setActiveTab("drafts")}
            >
              Drafts ({sampleVideos.filter(v => v.status === "Draft").length})
            </button>
            <button
              className={`pb-2 font-medium transition-colors ${
                activeTab === "published" 
                  ? "border-b-2 border-purple-600 text-purple-600" 
                  : "text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => setActiveTab("published")}
            >
              Published ({sampleVideos.filter(v => v.status === "Published").length})
            </button>
          </div>

          {/* Videos Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.length > 0 ? (
              filteredVideos.map((video) => (
                <div key={video.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-300 cursor-pointer">
                  {/* Video Thumbnail */}
                  <div className={`h-40 ${video.thumbnail} flex items-center justify-center relative`}>
                    <span className="text-gray-500 text-sm">No Preview Available</span>
                    {/* Status Badge */}
                    <div className="absolute top-3 right-3 bg-gray-800 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${video.status === "Draft" ? "bg-yellow-400" : "bg-green-400"}`}></div>
                      {video.status}
                    </div>
                    {/* Duration */}
                    <div className="absolute bottom-3 right-3 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                      {video.duration}
                    </div>
                  </div>
                  
                  {/* Video Info */}
                  <div className="p-4">
                    <h4 className="font-medium text-gray-900 mb-1">{video.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{video.date}</p>
                    <p className="text-xs text-gray-500">
                      Edited by {video.editedBy}, {video.editedTime}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 text-lg">No {activeTab} videos yet</p>
                <p className="text-gray-400 text-sm mt-2">Start creating your first podcast!</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </BaseLayout>
  );
};

export default CreatePodcastPage;