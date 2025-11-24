import Logo from "../../images/logo.png";
import { Home, Mic, Users, BookOpen, Settings, TrendingUp, Calendar, Bell, Search, Plus, ChevronLeft, ChevronRight, MessageCircle, Music2, Clapperboard, User, Crown } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ProfileMarry from "../../images/icon-profile-marry.png";
import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient.js';

import {
  HiOutlineHome,
  HiOutlineMicrophone,
  HiOutlineFolderOpen,
  HiMenuAlt2,
  HiMenuAlt3,
  HiOutlineUserCircle,
  HiX,
} from "react-icons/hi";
import { IoAnalyticsOutline, IoSettingsOutline } from "react-icons/io5";


const LeftSidebar = ({ open, setOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [userData, setUserData] = useState(null);

  // Load user profile from database (same as top bar)
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, profile_url")
          .eq("id", authUser.id)
          .single();

        setUserData({
          id: authUser.id,
          email: authUser.email,
          full_name: profile?.full_name || "",
          profile_url: profile?.profile_url || null,
        });
      }
    };
    loadProfile();
  }, []);
  
  const menuItems = [
  { icon: Home, label: "Home" , navigateTo: "/home"},
  { icon: User, label: "My Profile" , navigateTo: user ? `/profile/${user.id}` : "/profile"},
  { icon: Mic, label: "My Podcasts" , count: 12 , navigateTo: "/create-podcast" },
  { icon: Music2, label: "Audio Editor", navigateTo: "/audio-edit" },
  { icon: Clapperboard, label: "Video Editor", navigateTo: "/video-editor" },
  { icon: BookOpen, label: "My Library" , navigateTo: "/library" },
  { icon: Users, label: 'Following', count: 28 , navigateTo: "/following"},
  { icon: IoAnalyticsOutline, label: "Analytics" , navigateTo:"/analytics"},
  { icon: TrendingUp, label: 'Trending' , navigateTo: "/trending"},
  { icon: MessageCircle, label: 'FAQ & Support', navigateTo: "/faq-chatbot" },
  { icon: Settings, label: 'Settings', navigateTo: "/settings" },
  ];

  const quickAccess = [
    { name: 'Tech Talks', color: 'bg-blue-500' },
    { name: 'Business Daily', color: 'bg-green-500' },
    { name: 'Creative Corner', color: 'bg-purple-500' },
    { name: 'Health & Wellness', color: 'bg-pink-500' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {open && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      
      <div className={`border-r border-gray-200 bg-white/85 backdrop-blur-md fixed top-0 left-0 h-screen flex flex-col transition-all duration-300 z-[60] ${
        open ? 'w-92 p-6' : 'w-16 p-3'
      }`}>
        {/* Scrollable Content Area */}
        <div className={`flex-1 ${open ? 'overflow-y-auto' : 'overflow-hidden'}`}>
        <div className="flex flex-col h-full gap-6">
        {/* Logo/Brand with Toggle Button */}
        {open && (
          <div className="my-8 flex items-start justify-center gap-6 relative">
            <img src={Logo} alt="Logo" className="w-10 h-10 flex-shrink-0" />
            <div className="flex-1">
              <h1 className="text-2xl font-bold" style={{ color: '#6057C7' }}>
                POD<span style={{ color: '#2F2867' }}>VERSE</span>
              </h1>
              <p className="text-sm text-gray-500 mt-1">Your creative space</p>
            </div>
            {/* Toggle Button */}
            <button
              onClick={() => setOpen(!open)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center"
              title="Collapse sidebar"
            >
              <div className="flex flex-col gap-1">
                <div className="w-4 h-0.5" style={{ backgroundColor: '#6A6A6A' }}></div>
                <div className="w-4 h-0.5" style={{ backgroundColor: '#6A6A6A' }}></div>
                <div className="w-4 h-0.5" style={{ backgroundColor: '#6A6A6A' }}></div>
              </div>
              <ChevronLeft size={18} style={{ color: '#6A6A6A' }} />
            </button>
          </div>
        )}
        
        {!open && (
          <div className="mb-2 flex flex-col-reverse items-center gap-3 ">
            <img src={Logo} alt="Logo" className="w-10 h-10 flex-shrink-0 " />
            {/* Toggle Button */}
            <button
              onClick={() => setOpen(!open)}
              className="py-6 px-12 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center  "
              title="Expand sidebar"
            >
              <div className="flex flex-col gap-1">
                <div className="w-4 h-0.5" style={{ backgroundColor: '#6A6A6A' }}></div>
                <div className="w-4 h-0.5" style={{ backgroundColor: '#6A6A6A' }}></div>
                <div className="w-4 h-0.5" style={{ backgroundColor: '#6A6A6A' }}></div>
              </div>
              <ChevronRight size={16} style={{ color: '#6A6A6A' }} />
            </button>
          </div>
        )}

          {/* Create Button - Prominent */}
          {open && (
            <button 
              onClick={() => navigate('/create-podcast')}
              className="w-full text-white py-3 px-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 font-semibold  group"
              style={{
                backgroundColor: '#6057C7',
                color: '#F9F5EB'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#2F2867';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#6057C7';
              }}
            >
              <Plus size={20} className="group-hover:rotate-90 transition-transform" />
              Create Content
            </button>
          )}

          {!open && (
            <button 
              onClick={() => navigate('/create-podcast')}
              className="w-10 h-10 rounded-xl transition-all shadow-lg flex items-center justify-center mb-8 group mx-auto"
              style={{
                backgroundColor: '#6057C7',
                color: '#F9F5EB'
              }}
              title="Create Content"
            >
              <Plus size={20} />
            </button>
          )}

          {/* Navigation Menu */}
          <nav className={`flex-1 flex flex-col ${open ? 'gap-1.5' : 'gap-2.5'} pt-2`}>
            {menuItems.map((item, idx) => {
              const isActive = location.pathname === item.navigateTo || (item.navigateTo === "/home" && location.pathname === "/");
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 ${open ? 'px-4 py-3' : 'px-2 py-3 justify-center'} rounded-xl cursor-pointer transition-all group relative ${
                    isActive ? 'border shadow-sm' : 'hover:bg-gray-50'
                  }`}
                  style={isActive ? {
                    backgroundColor: '#A388E7',
                    color: '#F9F5EB',
                    borderColor: '#7d6ce3'
                  } : {
                    color: '#1C1C1C'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = '#6057C7';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = '#1C1C1C';
                    }
                  }}
                  onClick={() => navigate(item.navigateTo)}
                  title={!open ? item.label : ''}
                >
                  <item.icon 
                    size={22} 
                    className="transition-transform group-hover:scale-110 flex-shrink-0"
                    style={isActive ? { color: '#F9F5EB' } : { color: '#6A6A6A' }}
                  />
                  {open && (
                    <>
                      <span className={`font-medium text-sm flex-1 ${isActive ? 'font-semibold' : ''}`}>
                        {item.label}
                      </span>
                      {isActive && (
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#F9F5EB' }}></div>
                      )}
                    </>
                  )}
                  {/* Tooltip for collapsed state */}
                  {!open && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
          <div className="h-6" />
        </div>
        </div>

        {/* User Profile Section - Always at Bottom (same as top bar) */}
        {userData && (
          <>
            {open ? (
              <div 
                className="mt-auto p-3 rounded-xl border cursor-pointer hover:shadow-md transition-all flex-shrink-0 border-light-lightPurple bg-white"
                onClick={() => navigate(`/profile/${userData.id}`)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                  e.currentTarget.style.borderColor = '#A388E7';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
              >
                <div className="flex items-center gap-3">
                  <img 
                    src={userData.profile_url || ProfileMarry} 
                    className="w-10 h-10 rounded-full border-2 object-cover flex-shrink-0"
                    style={{ borderColor: '#A388E7' }}
                    alt={userData.full_name || "User"}
                    onError={(e) => {
                      e.target.src = ProfileMarry;
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: '#1C1C1C' }}>
                      {userData.full_name || "User"}
                    </p>
                    <p className="text-xs truncate" style={{ color: '#6A6A6A' }}>
                      View Profile
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => navigate(`/profile/${userData.id}`)}
                title={userData.full_name || 'My Profile'}
                className="mt-auto w-full flex items-center justify-center overflow-hidden"
              >
                <span className="w-12 h-12 rounded-full border border-white/70 bg-white shadow-md flex items-center justify-center overflow-hidden">
                  <img
                    src={userData.profile_url || ProfileMarry}
                    alt={userData.full_name || 'User'}
                    className="w-8 h-8 rounded-full object-cover"
                    onError={(e) => {
                      e.target.src = ProfileMarry;
                    }}
                  />
                </span>
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default LeftSidebar;