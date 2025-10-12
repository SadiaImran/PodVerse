import Logo from "../../images/logo.png";
import { Home, Mic, Users, BookOpen, Settings, TrendingUp, Calendar, Bell, Search, Plus, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  const menuItems = [
  { icon: Home, label: "Home" , navigateTo: "/home"},
  { icon: Mic, label: "My Podcasts" , count: 12 , navigateTo: "/create-podcast" },
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
      
      <div className={`pt-12 bg-white h-full border-r border-gray-200 sticky top-0 flex flex-col transition-all duration-300 z-50 ${
        open ? 'w-72 p-6' : 'w-16 p-3'
      } ${open ? 'lg:relative fixed lg:translate-x-0 translate-x-0 lg:z-auto z-50' : ''}`}>
      {/* Header with Logo and Toggle */}
      <div className="flex items-center gap-4 mb-8">
        <img src={Logo} alt="Logo" className="w-10 md:w-12 flex-shrink-0" />
        {open && (
          <span className="text-lg font-bold text-light-charcoal font-headingPoppins tracking-wider">
            POD<span className="text-light-purple">VERSE</span>
          </span>
        )}
        {/* Toggle Button */}
        <button
          onClick={() => setOpen(!open)}
          className="ml-auto p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {open ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>
      <div className="flex-1">
        {/* Navigation Menu */}
        <nav className="space-y-2 mb-8">
          {menuItems.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all group relative ${
                item.active 
                  ? 'bg-purple-50 text-purple-600 border border-purple-200' 
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
              onClick={() => navigate(item.navigateTo)}
              title={!open ? item.label : ''}
            >
              <item.icon size={20} className="flex-shrink-0" />
              {open && (
                <>
                  <span className="font-medium text-sm flex-1">{item.label}</span>
                  {item.count && (
                    <span className="bg-purple-100 text-purple-600 text-xs px-2 py-1 rounded-full font-medium">
                      {item.count}
                    </span>
                  )}
                </>
              )}
              {/* Tooltip for collapsed state */}
              {!open && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  {item.label}
                  {item.count && ` (${item.count})`}
                </div>
              )}
            </div>
          ))}
        </nav>
      
        {/* Quick Access */}
        {open && (
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
        )}

        {/* Create Button */}
        <button 
          className={`bg-light-purple text-white rounded-lg hover:bg-white hover:text-light-purple hover:border hover:border-light-purple transition-all shadow-sm flex items-center justify-center gap-2 font-medium ${
            open ? 'w-full py-3 px-4' : 'w-10 h-10 p-0'
          }`}
          title={!open ? 'Create Podcast' : ''}
        >
          <Plus size={18} />
          {open && <span>Create Podcast</span>}
        </button>
      </div>
     
      </div>
    </>
  );
};
export default LeftSidebar;
