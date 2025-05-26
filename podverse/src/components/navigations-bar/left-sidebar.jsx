import Logo from "../../assets/images/logo.png";
import { useNavigate } from "react-router-dom";
import ProfileMarry from "../../assets/images/icon-profile-marry.png"
import { useAuth } from '../../context/AuthContext';
import { Home, Mic, Users, BookOpen, Settings, TrendingUp, Calendar, Bell, Search, Plus ,  } from 'lucide-react';

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


const LeftSidebar = () => {
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
   const { userData } = useAuth();
  const navigate = useNavigate();
    const { userData } = useAuth();
  return (
    <div className="pt-12 w-72 bg-white h-full border-r border-gray-200 p-6 sticky top-0 flex flex-col gap-10">
       <div className="flex items-center gap-4">
                  <img src={Logo} alt="Logo" className="w-10 md:w-12" />
                  <span className="text-lg font-bold text-light-charcoal font-headingPoppins tracking-wider">
                    POD<span className="text-light-purple">VERSE</span>
                  </span>
        </div>
      <div>
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
     
    </div>
  );
};
export default LeftSidebar;