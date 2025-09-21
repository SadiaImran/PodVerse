import LeftSidebar from "../navigations-bar/left-sidebar";
import Topbar from "../navigations-bar/top-bar";
import { useState } from "react";

const BaseLayout = ({ children , homeScreen }) => {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex h-screen  overflow-hidden bg-[#FAFAFBFF] flex-col md:flex-row">
      {/* Left Sidebar */}
      {homeScreen ? null : <LeftSidebar open={open} setOpen={setOpen} />  }
    
      <div className="flex-1 flex flex-col overflow-auto">
        <Topbar open={homeScreen} />

        {/* page content */}
        <div className="flex-1 bg-white">
          {children}
        </div>
      </div>
    </div>
  );
};

export default BaseLayout;
