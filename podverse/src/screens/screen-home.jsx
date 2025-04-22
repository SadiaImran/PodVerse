import { useState } from "react";
import LeftSideBar from "../components/navigations-bar/left-sidebar";
import TopBar from "../components/navigations-bar/top-bar";


export default function HomeScreen() {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex h-screen bg-white flex-col md:flex-row items-start">

      {/* Sidebar as a component */}
      <LeftSideBar open={open} setOpen={setOpen} className=""/>
      <TopBar open={open} className="justify-start"></TopBar>

      {/* Main Content */}
      {/* <main className="">
        <h1 className="text-2xl font-bold text-light-charcoal">Welcome to PodVerse 🎙️</h1>
        <p className="mt-2 text-gray-600">Start creating your podcast experience here!</p>
      </main> */}
    </div>
  );
}
