import { useState } from "react";
import LeftSideBar from "../components/navigations-bar/left-sidebar";
import TopBar from "../components/navigations-bar/top-bar";

export default function HomeScreen() {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex h-screen bg-white flex-col md:flex-row overflow-hidden">
      {/* Sidebar */}
      <LeftSideBar open={open} setOpen={setOpen} />

      {/* Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Bar */}
        <TopBar open={open} />

        {/* Main Content */}
        <main className="p-4 flex-1 overflow-y-auto">
          <h1 className="text-2xl font-bold text-light-charcoal">Welcome to PodVerse 🎙️</h1>
          <p className="mt-2 text-gray-600">Start creating your podcast experience here!</p>
        </main>
      </div>
    </div>
  );
}
