import LeftSidebar from "../navigations-bar/left-sidebar";
import Topbar from "../navigations-bar/top-bar";
import { useState, useEffect } from "react";

const BaseLayout = ({ children, homeScreen, autoCollapse = false }) => {
  const [open, setOpen] = useState(true);

  // Auto-collapse on smaller screens and for specific pages
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setOpen(false);
      } else if (!autoCollapse) {
        setOpen(true);
      }
    };

    // Auto-collapse for editing/library screens
    if (autoCollapse) {
      setOpen(false);
    }

    handleResize(); // Set initial state
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [autoCollapse]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAFAFBFF] flex-col md:flex-row">
      {/* Left Sidebar */}
      {homeScreen ? null : <LeftSidebar open={open} setOpen={setOpen} />}
    
      <div className={`flex-1 flex flex-col overflow-auto ${homeScreen ? '' : open ? 'ml-72' : 'ml-16'} transition-all duration-300`}>
        <Topbar open={homeScreen} onMenuClick={() => setOpen(!open)} />

        {/* page content */}
        <div className="flex-1 bg-white">
          {children}
        </div>
      </div>
    </div>
  );
};

export default BaseLayout;
