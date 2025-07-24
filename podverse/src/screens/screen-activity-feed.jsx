import React from 'react';
import { Home, Mic, Users, BookOpen, Settings, TrendingUp, Calendar, Bell, Search, Plus } from 'lucide-react';
import { HiOutlineUserCircle } from "react-icons/hi";
import ActivityFeed from '../components/feed/activity-feed';
import BaseLayout from "../components/layouts/BaseLayout";
import PodcastPostBox from '../components/feed/podcast-post-box';
import { useNavigate } from 'react-router-dom';
import { IoAnalyticsOutline } from "react-icons/io5";
import SuggestionsSidebar from '../components/feed/suggestions-sidebar';

// Left Sidebar Component
const LeftSidebar = () => {
  const navigate = useNavigate();
  const menuItems = [
    { icon: Home, label: "Home" , navigateTo: "/home"},
    { icon: Mic, label: "My Podcasts" , count: 12 , navigateTo: "/create-podcast" },
    { icon: BookOpen, label: "My Library" , navigateTo: "/library" },
    { icon: Users, label: 'Following', count: 28 , navigateTo: "/following"},
    { icon: IoAnalyticsOutline, label: "Analytics" , navigateTo:"/analytics"},
    { icon: TrendingUp, label: 'Trending' , navigateTo: "/trending"},
    { icon: Settings, label: 'Settings', navigateTo: "/settings" },
  ];

  const quickAccess = [
    { name: 'Tech Talks', color: 'bg-blue-500' },
    { name: 'Business Daily', color: 'bg-green-500' },
    { name: 'Creative Corner', color: 'bg-purple-500' },
    { name: 'Health & Wellness', color: 'bg-pink-500' },
  ];

  return (
    <div className="w-64 bg-white h-full border-r border-gray-100 p-6 sticky top-0">
      {/* Navigation Menu */}
      <nav className="space-y-2 mb-8">
        {menuItems.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
              item.active 
                ? 'bg-purple-50 text-purple-600 border border-purple-200' 
                : 'hover:bg-gray-50 text-gray-700'
            }`}
            onClick={() => navigate(item.navigateTo)}
          >
            <item.icon size={20} />
            <span className="font-medium text-sm flex-1">{item.label}</span>
            {item.count && (
              <span className="bg-purple-100 text-purple-600 text-xs px-2 py-1 rounded-full font-medium">
                {item.count}
              </span>
            )}
          </div>
        ))}
      </nav>

      {/* Quick Access */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Quick Access</h3>
        <div className="space-y-2">
          {quickAccess.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg cursor-pointer">
              <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
              <span className="text-sm text-gray-700">{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Create Button */}
      <button className="w-full bg-light-purple text-white py-3 px-4 rounded-lg hover:bg-white hover:text-light-purple hover:border hover:border-light-purple transition-all shadow-sm flex items-center justify-center gap-2 font-medium">
        <Plus size={18} />
        Create Podcast
      </button>
    </div>
<<<<<<< HEAD
  );
};

// Main Layout Component
const ActivityFeedPage = () => {
  const posts = [
    {
      id: 1,
      creator: "Tech Talks with Sara",
      title: "The Future of AI in 2025",
      description: "A comprehensive visual exploration of how artificial intelligence is revolutionizing industries across the globe. From healthcare to finance, discover the transformative power of AI technology.",
      time: "2h ago"
    }
  ];

  return (
    <BaseLayout homeScreen={true}>
    <div className="min-h-screen bg-gray-50">
      <div className="flex max-w-7xl mx-auto justify-between ">
        {/* Left Sidebar */}
        <LeftSidebar />
    
        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="max-w-2xl mx-auto">
            <PodcastPostBox />
            <ActivityFeed/>
          </div>
        </div>

        {/* Right Sidebar */}
        <SuggestionsSidebar />
      </div>
    </div>
    </BaseLayout>
    
=======
>>>>>>> reconfigure-1-SI
  );
};

// Main Layout Component
const ActivityFeedPage = () => {
  const posts = [
    {
      id: 1,
      creator: "Tech Talks with Sara",
      title: "The Future of AI in 2025",
      description: "A comprehensive visual exploration of how artificial intelligence is revolutionizing industries across the globe. From healthcare to finance, discover the transformative power of AI technology.",
      time: "2h ago"
    }
  ];

  return (
    <BaseLayout homeScreen={true}>
    <div className="min-h-screen bg-gray-50">
      <div className="flex max-w-7xl mx-auto justify-between ">
        {/* Left Sidebar */}
        <LeftSidebar />
    
        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="max-w-2xl mx-auto">
            <PodcastPostBox />
            <ActivityFeed/>
          </div>
        </div>

        {/* Right Sidebar */}
        <SuggestionsSidebar />
      </div>
    </div>
    </BaseLayout>
    
  );
};

export default ActivityFeedPage;