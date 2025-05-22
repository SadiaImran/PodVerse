import { FaChevronDown } from "react-icons/fa";
import { FiSearch } from "react-icons/fi";
import { HiOutlineBell } from "react-icons/hi2";
import ProfileMarry from "../../assets/images/icon-profile-marry.png"
import Logo from "../../assets/images/logo.png";
import { logout } from "../../api/auth"; 
import { useNavigate } from "react-router-dom";
import { FiLogOut } from "react-icons/fi"

export default function TopBar({ open }) {
  const navigate = useNavigate();
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/signin-email'); // or wherever your login route is
    } catch (err) {
      console.error("Logout failed", err);
    }
  }
  return (
    <nav className="bg-white containerr flex items-center justify-between px-4 py-4 shadow-md font-subheadingDMSans w-full ">
      
      {/* Left Section */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {/* Logo only visible when sidebar is closed */}
        {!open && (
          <div className="hidden md:flex items-center gap-2 mr-6">
            <img src={Logo} alt="Logo" className="w-10 md:w-12" />
            <span className="text-lg font-bold text-light-charcoal font-headingPoppins tracking-wider">
              POD<span className="text-light-purple">VERSE</span>
            </span>
          </div>
        )}
      </div>

      {/* Middle and Right Section combined for small screens */}
      <div className="flex items-center justify-between gap-4 flex-1 max-w-full">
        
        {/* Search Input */}
        <div className="relative w-full max-w-[600px] md:mx-auto flex-1">
          <input
            type="text"
            placeholder="Search..."
            className="pl-8 pr-4 py-2 bg-light-background rounded-lg outline-none w-full text-base text-light-black"
          />
          <FiSearch className="absolute left-2 top-2.5 mt-0.5 text-light-grey" />
        </div>

        {/* Right Icons */}
        <div className="flex items-center gap-4 flex-shrink-0 ml-2">
          {/* Notification Icon */}
          <div className="relative">
            <HiOutlineBell className="text-light-charcoal w-8 h-8 cursor-pointer" />
            <span className="absolute top-0 right-0 text-xs text-white bg-red-500 rounded-full px-1">
              3
            </span>
          </div>

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
    </nav>
  );
}
