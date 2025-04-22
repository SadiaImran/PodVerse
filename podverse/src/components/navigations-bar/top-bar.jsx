import { FaBell, FaChevronDown } from "react-icons/fa";
import { FiSearch } from "react-icons/fi";
import { HiOutlineBell } from "react-icons/hi2";
import { HiOutlineUserCircle } from "react-icons/hi";
import Logo from "../../assets/images/icon-logo.svg";


export default function TopBar({open}) {
  return (
    <nav className="flex items-center justify-between px-8 py-4 shadow-md font-subheadingDMSans bg-white w-full">
      {/* Left Section */}
      <div className="flex items-center gap-8">
        {/* Logo */}
        {!open && (
                   <div className="flex items-center gap-2">
                   <img src={Logo} alt="Logo" className={`transition-all duration-300  w-10`}/>
                   <span className="text-base font-bold text-light-charcoal font-headingPoppins tracking-wider ">
                POD<span className="text-light-purple">VERSE</span>
              </span>
                 </div>
            )}
   
        {/* Navigation Links */}
        <ul className="flex items-center justify-between gap-8 cursor-pointer text-lg font-medium  text-light-black">
          <li className="relative text-primary-purple hover:text-light-deepPurple hover:font-semibold">
            Dashboard
          </li>
          <li className="flex items-center gap-2 hover:text-light-deepPurple hover:font-semibold ">
            Projects <FaChevronDown className="text-xs  " />
          </li>
          <li className="flex items-center gap-2 hover:text-light-deepPurple  hover:font-semibold ">
            Files <FaChevronDown className="text-xs " />
          </li>
          <li className="hover:text-light-deepPurple hover:font-semibold"> Calendar</li>
        </ul>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-6">
        {/* Search Bar */}
        <div className="relative text-base text-light-black">
          <input
            type="text"
            placeholder="Search..."
            className="pl-8 pr-4 py-1.5 bg-light-cream rounded-lg  outline-none w-64"
          />
          <FiSearch className="absolute left-2 top-2.5 text-light-grey" />
        </div>

        {/* Bell Icon */}
        <HiOutlineBell className="text-light-charcoal text-2xl cursor-pointer" />

        {/* Profile */}
        <div className="flex items-center gap-2 cursor-pointer">
        <HiOutlineUserCircle className="text-3xl text-light-charcoal" />
          <span className="text-sm text-gray-800 font-medium">Amanda Smith</span>
          <FaChevronDown className="text-xs text-light-charcoal" />
        </div>
      </div>
    </nav>
  );
}
