import LeftSidebar from "../navigations-bar/left-sidebar";
import Topbar from "../navigations-bar/top-bar";
import { useState } from "react";

const BaseLayout = ({ children }) => {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex h-screen  overflow-hidden bg-[#FAFAFBFF]flex-col md:flex-row">
      {/* Left Sidebar */}
      <LeftSidebar open={open} setOpen={setOpen} />
      <div className="flex-1 flex flex-col overflow-auto">
        <Topbar open={open} />

        {/* page content */}
        <div className="flex-1 bg-white">
          {children}
        </div>
      </div>
    </div>
  );
};

export default BaseLayout;
