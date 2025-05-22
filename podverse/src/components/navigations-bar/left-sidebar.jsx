import Logo from "../../assets/images/icon-logo.svg";
import { useNavigate } from "react-router-dom";
import ProfileMarry from "../../assets/images/icon-profile-marry.png"

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

const navItems = [
  { Icon: HiOutlineHome, label: "Home" , navigateTo: "/home"},
  { Icon: HiOutlineMicrophone, label: "Create Podcasts" , navigateTo: "/create-podcast" },
  { Icon: HiOutlineFolderOpen, label: "My Library" , navigateTo: "/library" },
  { Icon: IoAnalyticsOutline, label: "Analytics" , navigateTo:"/analytics"},
];

const NavItem = ({ navItem, open }) => {
  const navigate = useNavigate(); // Ensure useNavigate is inside the Router context

  return (
    <li
      className={`flex items-center ${open ? "gap-4" : "justify-center"} cursor-pointer group relative py-2 
      hover:bg-indigo-50 rounded-lg duration-200`}
      onClick={() => navigate(navItem.navigateTo)} // Navigate to the specified route
    >
      <navItem.Icon className="w-7 h-7 text-light-charcoal flex-shrink-0" />
      {open ? (
        <span className="text-lg text-light-charcoal font-medium font-subheadingDMSans">{navItem.label}</span>
      ) : (
        <span className="absolute left-16 bg-white text-black px-2 py-1 text-xs rounded shadow-md hidden group-hover:block z-50">
          {navItem.label}
        </span>
      )}
    </li>
  );
};

export default function LeftSideBar({ open, setOpen }) {
  return (
    <>
      {/* Mobile Top Menu */}
      <div className="md:hidden flex items-center justify-between gap-10 p-3">
        <div className="flex items-center gap-4">
          {/* Show logo and PODVERSE title only when sidebar is closed */}
          {!open && (
            <>
              <img src={Logo} alt="Logo" className="transition-all duration-300 w-14" />
              <span className="text-2xl font-bold text-light-charcoal font-headingPoppins tracking-wider">
                POD<span className="text-light-purple">VERSE</span>
              </span>
            </>
          )}
        </div>
        <button onClick={() => setOpen(!open)}>
          {open ? (
            <HiMenuAlt3 className="w-8 h-8 text-light-charcoal" />
          ) : (
            <HiMenuAlt2 className="w-8 h-8 text-light-charcoal" />
          )}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed md:static top-0 left-0 h-screen z-40
          ${open ? "w-full md:w-72 " : "w-full md:w-16 rounded-r-xl"}
          ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          transition-all duration-500 py-3
          bg-light-background shadow-md
          flex flex-col gap-4 md:gap-10 lg:gap-12 
        `}
      >
        {/* Logo Section */}
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Show logo and title only when sidebar is open */}
            {open && (
              <>
                <img
                  src={Logo}
                  alt="Logo"
                  className="transition-all duration-300 w-12 md:w-8"
                />
                <span className="text-lg font-bold text-light-purple font-headingPoppins tracking-wider">
                  POD<span className="text-light-purple">VERSE</span>
                </span>
              </>
            )}
          </div>
          <button onClick={() => setOpen(!open)}>
            {open ? (
              <HiX className="w-6 h-6 text-light-charcoal" />
            ) : (
              <HiMenuAlt3 className="w-6 h-6 text-light-charcoal" />
            )}
          </button>
        </div>

        {/* Navigation Items */}
        <ul className="flex-1 space-y-3 px-6">
          {navItems.map((item, index) => (
            <NavItem key={index} navItem = {item} open={open} />
          ))}
        </ul>

        {/* Footer */}
        <div className="p-4 flex items-center gap-2 cursor-pointer">
          <img src = {ProfileMarry} className={`max-w-12 max-h-12 text-light-charcoal flex-shrink-0 pr-2`} />
          {open && (
            <div className="flex items-center justify-between w-full">
              <div>
                <p className="text-md text-light-charcoal font-medium font-subheadingDMSans">User</p>
                <p className="text-sm text-light-grey font-medium font-subheadingDMSans">View Profile</p>
              </div>
              <IoSettingsOutline className="w-8 h-8 text-light-charcoal" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
