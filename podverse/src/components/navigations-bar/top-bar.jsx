import { FaChevronDown } from "react-icons/fa";
import { FiSearch } from "react-icons/fi";
import { HiOutlineBell } from "react-icons/hi2";
import { HiOutlineUserCircle } from "react-icons/hi";
import Logo from "../../assets/images/icon-logo.svg";

export default function TopBar({ open }) {
  return (
    <nav className="flex items-center justify-between px-4 py-4 shadow-md font-subheadingDMSans w-full ">
      
      {/* Left Section */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {/* Logo only visible when sidebar is closed */}
        {!open && (
          <div className="hidden md:flex items-center gap-2 mr-6">
            <img src={Logo} alt="Logo" className="w-10 md:w-12" />
            <span className="text-lg font-bold text-light-purple font-headingPoppins tracking-wider">
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
            className="pl-8 pr-4 py-2 bg-light-cream rounded-lg outline-none w-full text-base text-light-black"
          />
          <FiSearch className="absolute left-2 top-2.5 mt-0.5 text-light-grey" />
        </div>

        {/* Right Icons */}
        <div className="flex items-center gap-4 flex-shrink-0 ml-2">
          {/* Notification Icon */}
          <div className="relative">
            <HiOutlineBell className="text-light-charcoal text-2xl cursor-pointer" />
            <span className="absolute top-0 right-0 text-xs text-white bg-red-500 rounded-full px-1">
              3
            </span>
          </div>

          {/* Profile Section */}
          <div className="flex items-center gap-2 cursor-pointer">
            <HiOutlineUserCircle className="text-3xl text-light-charcoal" />
            <span className="text-sm text-gray-800 font-medium hidden sm:block">
              Amanda Smith
            </span>
            <FaChevronDown className="text-xs text-light-charcoal hidden sm:block" />
          </div>
        </div>
      </div>
    </nav>
  );
}
