import { FaChevronDown } from "react-icons/fa";
import { FiSearch } from "react-icons/fi";
import { HiOutlineBell } from "react-icons/hi2";
import { HiOutlineUserCircle } from "react-icons/hi";
import Logo from "../../assets/images/icon-logo.svg";

export default function TopBar({ open }) {
  return (
    <nav className="flex items-center justify-between px-4 py-4 shadow-md font-subheadingDMSans bg-white w-full">
      {/* Left Section */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {/* Logo only visible when sidebar is closed */}
        {!open && (
          <div className="flex items-center gap-2">
            <img
              src={Logo}
              alt="Logo"
              className="w-10 md:w-12"
            />
            <span className="text-lg font-bold text-light-charcoal font-headingPoppins tracking-wider">
              POD<span className="text-light-purple">VERSE</span>
            </span>
          </div>
        )}
      </div>

      {/* Right Section (Search, Notifications, Profile) */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {/* Search Input */}
        <div className="relative text-base text-light-black hidden sm:block">
          <input
            type="text"
            placeholder="Search..."
            className="pl-8 pr-4 py-2 bg-light-cream rounded-lg outline-none w-48 sm:w-64"
          />
          <FiSearch className="absolute left-2 top-2.5 text-light-grey" />
        </div>

        {/* Notification Icon */}
        <div className="relative">
          <HiOutlineBell className="text-light-charcoal text-2xl cursor-pointer" />
          {/* Badge for notifications */}
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
    </nav>
  );
}
