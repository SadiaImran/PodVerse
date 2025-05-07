import LeftSidebar from "../navigations-bar/left-sidebar";
import Topbar from "../navigations-bar/top-bar";
import { useState } from "react";

const BaseLayout = ({ children }) => {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden bg-light-[#f3f2ee] flex-col md:flex-row">
      {/* Left Sidebar */}
      <LeftSidebar open={open} setOpen={setOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <Topbar open={open} />

        {/* page content */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default BaseLayout;
