import { FaChevronDown } from "react-icons/fa";
import { FiSearch } from "react-icons/fi";
import { HiOutlineBell } from "react-icons/hi2";
import ProfileMarry from "../../assets/images/icon-profile-marry.png"
import Logo from "../../assets/images/logo.png";
import { logout as logoutAPI } from "../../api/auth"; 
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from "react-router-dom";
import { FiLogOut } from "react-icons/fi"
import { Home, Mic, Users, BookOpen, Settings, TrendingUp, Calendar, Bell, Search, Plus } from 'lucide-react';

export default function TopBar({ homeScreen }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const handleLogout = async () => {
    try {
      await logoutAPI();
      await logout();
      navigate('/signin-email'); // or wherever your login route is
    } catch (err) {
      console.error("Logout failed", err);
    }
  }
  return (
    <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
      
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Left Section */}
        
        {!homeScreen ? null : <div className="flex items-center gap-4">
            <img src={Logo} alt="Logo" className="w-10 md:w-12" />
            <span className="text-lg font-bold text-light-charcoal font-headingPoppins tracking-wider">
              POD<span className="text-light-purple">VERSE</span>
            </span>
        </div>}

        {/*Middle section*/}
        <div className="flex-1 max-w-xl mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg border-0 focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
            />
          </div>
        </div>

         <div className="flex items-center gap-4">
        <button className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all">
          <HiOutlineBell className="text-light-charcoal w-8 h-8 cursor-pointer" />
        </button>
         {/* Profile Section */}
          <div className="flex items-center gap-2 cursor-pointer">
            
            <img src = {ProfileMarry} className="w-8 h-8 text-light-charcoal flex-shrink-0" />
            <span className="text-sm text-gray-800 font-medium hidden sm:block">
              Amanda Smith
            </span>
            <FaChevronDown className="text-xs text-light-charcoal hidden sm:block" />
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 hover:bg-light-background hover:text-light-charcoal hover:border-light-purple border-2 bg-light-purple text-white text-sm font-medium rounded-md shadow transition duration-200"
          >
            <FiLogOut className="text-lg" />
            Logout
          </button>
         </div>
      </div>

    </header>
  );
}

