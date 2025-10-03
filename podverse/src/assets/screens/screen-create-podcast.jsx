import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Circle, Play, Mic, Image, Scissors, FileText, User, Clock, Edit3, Plus } from "lucide-react";
import BaseLayout from "../components/layouts/BaseLayout";
import banner from "../images/banner-1.png";
import banner2 from "../images/banner-2.png";

const CreatePodcastPage = () => {
  const [activeTab, setActiveTab] = useState("ai-apps");
  const navigate = useNavigate();

  // AI Apps data
  const aiApps = [
    {
      id: 1,
      title: "AI Podcast Studio",
      description: "Create podcasts from text prompts",
      icon: Play,
      gradient: "from-purple-500 to-purple-600",
      isNew: false
    },
    {
      id: 2,
      title: "AI Playground",
      description: "Create podcasts with cutting-edge AI models",
      icon: Play,
      gradient: "from-purple-500 to-purple-600",
      isNew: true
    },
    {
      id: 3,
      title: "AI Audio Generator",
      description: "Create audio from your text",
      icon: Mic,
      gradient: "from-teal-500 to-teal-600",
      isNew: false
    },
    {
      id: 4,
      title: "AI Clips",
      description: "Extract highlights from longer audio",
      icon: Scissors,
      gradient: "from-blue-500 to-teal-500",
      isNew: false
    },
    {
      id: 5,
      title: "AI Script Generator",
      description: "Generate professional podcast scripts using AI",
      icon: FileText,
      gradient: "from-pink-500 to-purple-500",
      isNew: false
    },
    {
      id: 6,
      title: "AI Voice Clone",
      description: "Clone your voice and create content",
      icon: User,
      gradient: "from-orange-500 to-red-500",
      isNew: false
    }
  ];

  // Recent videos data
  const recentVideos = [
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
    }
  ];

  return (
    <BaseLayout homeScreen={false} autoCollapse={true}>
      <main className="flex-1 overflow-y-auto bg-white">
        
        {/* Hero Banner */}
          <div className="relative h-72 overflow-hidden">
            {/* Background Image Rectangle */}
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
              <button className="bg-light-purple text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-light-purple hover:border hover:border-light-purple transition-all duration-300">
                Get Started →
              </button>
            </div>
          </div>
        </div>

        {/* Greeting Section */}
        <div className="px-6 md:px-10 py-6 bg-white">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Hello, Sadia</h2>
          <p className="text-gray-600">Let's get started</p>
        </div>

        {/* Tabs and Actions */}
        <div className="px-6 md:px-10 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            {/* Tabs */}
            <div className="flex space-x-8">
              <button
                className={`pb-2 font-medium ${activeTab === "ai-apps" ? "border-b-2 border-purple-600 text-purple-600" : "text-gray-600 hover:text-gray-900"}`}
                onClick={() => setActiveTab("ai-apps")}
              >
                AI Apps
              </button>
              <button
                className={`pb-2 font-medium ${activeTab === "ai-edits" ? "border-b-2 border-purple-600 text-purple-600" : "text-gray-600 hover:text-gray-900"}`}
                onClick={() => setActiveTab("ai-edits")}
              >
                AI Edits
              </button>
              <button
                className={`pb-2 font-medium ${activeTab === "templates" ? "border-b-2 border-purple-600 text-purple-600" : "text-gray-600 hover:text-gray-900"}`}
                onClick={() => setActiveTab("templates")}
              >
                Templates
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-colors">
                <Mic className="w-4 h-4 inline mr-2" />
                Recorder
              </button>
              <button 
                onClick={() => navigate("/agent-setup")}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors">
                <Plus className="w-4 h-4 inline mr-2" />
                New project
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="px-6 md:px-10 py-6">
          {activeTab === "ai-apps" && (
            <>
              {/* AI Apps Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {aiApps.map((app) => (
                  <div key={app.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-300 cursor-pointer">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 bg-gradient-to-r ${app.gradient} rounded-lg flex items-center justify-center relative`}>
                        <app.icon className="w-6 h-6 text-white" />
                        {app.isNew && (
                          <span className="absolute -top-2 -right-2 bg-purple-100 text-purple-600 text-xs px-2 py-1 rounded-full font-medium">
                            NEW
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{app.title}</h3>
                        <p className="text-sm text-gray-600">{app.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent Videos Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Videos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {recentVideos.map((video) => (
                    <div key={video.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      {/* Video Thumbnail */}
                      <div className={`h-32 ${video.thumbnail} flex items-center justify-center relative`}>
                        <span className="text-gray-500 text-sm">No Preview Available</span>
                        {/* Draft Badge */}
                        <div className="absolute top-3 right-3 bg-gray-800 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
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
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === "ai-edits" && (
            <div className="text-center py-12">
              <Edit3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Edits Coming Soon</h3>
              <p className="text-gray-600">Advanced AI editing features will be available here.</p>
            </div>
          )}

          {activeTab === "templates" && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Templates Coming Soon</h3>
              <p className="text-gray-600">Podcast templates will be available here.</p>
            </div>
          )}
        </div>
      </main>
    </BaseLayout>
  );
};

export default CreatePodcastPage;
