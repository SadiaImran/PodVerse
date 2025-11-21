import React, { useState, useEffect } from 'react';
import { Home, Mic, Users, BookOpen, Settings, TrendingUp, Search, Plus, MessageCircle, Sparkles } from 'lucide-react';
import { IoAnalyticsOutline } from "react-icons/io5";
import ActivityFeed from '../components/feed/activity-feed';
import BaseLayout from "../components/layouts/BaseLayout";
import PodcastPostBox from '../components/feed/podcast-post-box';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SuggestionsSidebar from '../components/feed/suggestions-sidebar';

// Left Sidebar Component - Redesigned
const LeftSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const menuItems = [
    { icon: Home, label: "Home", navigateTo: "/home", active: location.pathname === "/home" },
    { icon: Search, label: "Search", navigateTo: "/search", active: location.pathname === "/search" },
    { icon: Sparkles, label: "Explore", navigateTo: "/trending", active: location.pathname === "/trending" },
    { icon: Mic, label: "My Podcasts", navigateTo: "/create-podcast", active: location.pathname === "/create-podcast" },
    { icon: Users, label: 'Following', navigateTo: "/following", active: location.pathname === "/following" },
    { icon: MessageCircle, label: 'Support', navigateTo: "/faq-chatbot", active: location.pathname === "/faq-chatbot" },
  ];

  return (
    <div className="w-72 h-full border-r border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 self-start">
      <div className="p-6">
        {/* Logo/Brand */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            POD<span className="text-purple-600">VERSE</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">Your creative space</p>
        </div>

        {/* Create Button - Prominent */}
        <button 
          onClick={() => navigate('/create-podcast')}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 font-semibold mb-8 group"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform" />
          Create Content
        </button>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          {menuItems.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all group ${
                item.active 
                  ? 'bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border border-purple-200 shadow-sm' 
                  : 'hover:bg-gray-50 text-gray-700 hover:text-purple-600'
              }`}
              onClick={() => navigate(item.navigateTo)}
            >
              <item.icon 
                size={22} 
                className={`transition-transform group-hover:scale-110 ${
                  item.active ? 'text-purple-600' : 'text-gray-500 group-hover:text-purple-600'
                }`} 
              />
              <span className={`font-medium text-sm flex-1 ${item.active ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
              {item.active && (
                <div className="w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
              )}
            </div>
          ))}
        </nav>

        {/* User Profile Section */}
        {user && (
          <div 
            className="mt-8 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100 cursor-pointer hover:shadow-md transition-all"
            onClick={() => navigate(`/profile/${user.id}`)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold">
                {user.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 truncate">My Profile</p>
                <p className="text-xs text-gray-500 truncate">View & edit</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Layout Component
const ActivityFeedPage = () => {
  return (
    <BaseLayout homeScreen={true}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/20 to-pink-50/20">
        <div className="flex gap-8">
          {/* Left Sidebar */}
          <LeftSidebar />
      
          {/* Main Content */}
          <div className="flex-1 min-w-0 max-w-4xl mx-auto">
            <div className="py-8 px-4">
              <PodcastPostBox />
              <ActivityFeed/>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-96 hidden xl:block flex-shrink-0">
            <div className="sticky top-0 py-8 pr-6">
              <SuggestionsSidebar />
            </div>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
};

export default ActivityFeedPage;
