import { useState } from "react";
import Logo from "../assets/images/icon-logo.svg";
import {
  HiOutlineHome,
  HiOutlineMicrophone,
  HiOutlineFolderOpen,
  HiMenuAlt2,
  HiMenuAlt3,
  HiOutlineUserCircle,
} from "react-icons/hi";
import { IoAnalyticsOutline , IoSettingsOutline  } from "react-icons/io5";

const navItems = [
  { Icon: HiOutlineHome, label: "Home" },
  { Icon: HiOutlineMicrophone, label: "Create Podcasts" },
  { Icon: HiOutlineFolderOpen, label: "My Library" },
  { Icon: IoAnalyticsOutline, label: "Analytics" },
];

const NavItem = ({ Icon, label, open }) => (
  <li
    className={`flex items-center ${
      open ? "gap-4" : "justify-center"
    } cursor-pointer group relative px-4 py-3 hover:border-2 hover:border-light-lightPurple rounded-lg duration-200`}
  >
    <Icon className="w-7 h-7 text-light-charcoal flex-shrink-0" />
    {open ? (
      <span className="text-lg text-light-charcoal font-medium font-subheadingDMSans">{label}</span>
    ) : (
      <span className="absolute left-16 bg-white text-black px-2 py-1 text-xs rounded shadow-md hidden group-hover:block z-50">
        {label}
      </span>
    )}
  </li>
);

export default function HomeScreen() {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex h-screen bg-white relative">

      {/* Hamburger for Small Screens */}
      <button
        className={`absolute top-4 left-4 z-50 text-light-charcoal md:hidden ${open ? "hidden" : "block"}`}
        onClick={() => setOpen(true)}
      >
        <HiMenuAlt2 className="w-8 h-8" />
      </button>

      {/* Sidebar */}
      <aside
  className={`
    fixed md:static top-0 left-0 h-full z-40
    ${open ? "w-full md:w-72" : "w-full md:w-16"}
    ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
    transition-all duration-500
    bg-light-cream shadow-lg shadow-gray-500/30
    flex flex-col gap-4 md:gap-10 lg:gap-12 rounded-r-xl
  `}
>

        {/* Top Logo + Toggle */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src={Logo}
              alt="Logo"
              className={`transition-all duration-300 ${open ? "w-12" : "w-0 opacity-0"}`}
            />
            {open && (
              <span className="text-2xl font-bold text-light-charcoal font-headingPoppins">
                PodVerse
              </span>
            )}
          </div>
          <button onClick={() => setOpen(!open)}>
            {open ? (
              <HiMenuAlt3 className="w-6 h-6 text-light-charcoal" />
            ) : (
              <HiMenuAlt2 className="w-6 h-6 text-light-charcoal" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <ul className="flex-1 space-y-3 px-3">
          {navItems.map((item, index) => (
            <NavItem key={index} Icon={item.Icon} label={item.label} open={open} />
          ))}
        </ul>

        {/* Footer */}
        <div className="p-4 flex items-center gap-2 cursor-pointer">
          <HiOutlineUserCircle className="w-8 h-8 text-light-charcoal flex-shrink-0" />
          {open && (
  <div className="flex items-center justify-between w-full">
    <div>
      <p className="text-md text-light-charcoal font-medium font-subheadingDMSans">User</p>
      <p className="text-sm text-light-grey font-medium font-subheadingDMSans">View Profile</p>
    </div>
    <div>
      <IoSettingsOutline className="w-8 h-8 text-light-charcoal font-bold" />
    </div>
  </div>
)}

         </div>
      </aside>

      {/* Content Behind Sidebar */}
      {open && (
        <div
          className="fixed top-0 left-0 w-full h-full bg-black/50 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto z-0">
        <h1 className="text-2xl font-bold text-light-charcoal">Welcome to PodVerse 🎙️</h1>
        <p className="mt-2 text-gray-600">Start creating your podcast experience here!</p>
      </main>
    </div>
  );
}
