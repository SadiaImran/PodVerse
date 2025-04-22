// src/components/Sidebar.jsx

import { useState } from "react";
import Logo from "../../assets/images/icon-logo.svg";
import {
  HiOutlineHome,
  HiOutlineMicrophone,
  HiOutlineFolderOpen,
  HiMenuAlt2,
  HiMenuAlt3,
  HiOutlineUserCircle,
  HiX
} from "react-icons/hi";
import { IoAnalyticsOutline, IoSettingsOutline } from "react-icons/io5";

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
    } cursor-pointer group relative py-2 hover:border-2 hover:border-light-lightPurple rounded-lg duration-200`}
  >
    <Icon className="w-7 h-7  text-light-charcoal flex-shrink-0" />
    {open ? (
      <span className="text-lg  text-light-charcoal font-medium font-subheadingDMSans">{label}</span>
    ) : (
      <span className="absolute left-16 bg-white text-black px-2 py-1 text-xs rounded shadow-md hidden group-hover:block z-50">
        {label}
      </span>
    )}
  </li>
);

export default function Sidebar({ open, setOpen }) {
  return (
    <>
      {/* Sidebar */}
      <div id="sm-d-menu" className={`md:hidden flex items-center justify-between gap-10 p-3`}>
        <div className="flex items-center gap-4">
                <img
                src={Logo}
                alt="Logo"
                className={`transition-all duration-300 w-14 `}
                />       
                <span className="text-2xl font-bold text-light-charcoal font-headingPoppins tracking-wider ">
                    POD<span className="text-light-purple">VERSE</span>
                </span>
        </div>
        <button onClick={() => setOpen(!open)} className="">
        {open ? (
        <HiMenuAlt3 className="w-8 h-8 text-light-charcoal " />
        ) : (
        <HiMenuAlt2 className="w-8 h-8 text-light-charcoal " />
        )}
        </button>
      </div>

      <aside
        className={`
          fixed md:static top-0 left-0 h-full  z-40
          ${open ? "w-full md:w-72" : "w-full md:w-16"}
          ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          transition-all duration-500 py-3
          bg-light-cream shadow-lg shadow-gray-500/30
          flex flex-col gap-4 md:gap-10 lg:gap-12 rounded-r-xl
        `}
      >
        {/* Top Logo + Toggle */}
        <div className="px-2 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src={Logo}
              alt="Logo"
              className={`transition-all duration-300 ${open ? "w-12 md:w-8" : "w-0 opacity-0"} `}
            />
            {open && (
              <span className="text-base font-bold text-light-charcoal font-headingPoppins tracking-wider ">
                POD<span className="text-light-purple">VERSE</span>
              </span>
            )}
          </div>
          <button onClick={() => setOpen(!open)} className="">
            {open ? (
              <HiX className="w-6 h-6 md:w-4 md:h-4 lg:w-6 lg:h-6 text-light-charcoal font-bold" />
            ) : (
              <HiMenuAlt3 className="w-6 h-6 text-light-charcoal font-bold" />
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
              <IoSettingsOutline className="w-8 h-8 text-light-charcoal font-bold" />
            </div>
          )}
        </div>
      </aside>

    </>
  );
}
