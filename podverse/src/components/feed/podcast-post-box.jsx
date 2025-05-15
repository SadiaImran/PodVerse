import { button } from "@material-tailwind/react";
import { HiOutlineUserCircle } from "react-icons/hi";
import { MdLibraryMusic, MdCreateNewFolder } from "react-icons/md";

const PostBoxButton = ({Icon , label , library}) => (
  <button className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg hover:bg-light-cream transition">
          <Icon className={`text-2xl sm:text-3xl ${library ? "text-light-purple" : "text-green-600"}`} />
          <span className="whitespace-nowrap">{label}</span>
        </button>
);
 
const PodcastPostBox = () => {
  
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-[#d4d2cc] w-full mb-6">
      {/* Top section with improved mobile layout */}
      <div className="flex items-center gap-3 mb-4">
        {/* Avatar - fixed size, no mx-auto to align properly */}
        <HiOutlineUserCircle className="text-4xl text-light-charcoal shrink-0" />

        {/* Input field - better truncation */}
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="🎙️ What's brewing in your mind?"
            className="w-full bg-gray-100 p-3 sm:p-4 rounded-full text-gray-600 outline-none hover:bg-gray-200 transition"
          />
        </div>

        {/* Post Button - hidden on very small screens, shown as icon */}
        <button
          type="button"
          className="hidden sm:block bg-light-purple text-white px-4 py-2 rounded-full hover:bg-purple-700 transition whitespace-nowrap"
        >
          Post
        </button>
      </div>

      {/* Mobile post button (shown only on smallest screens) */}
      <div className="sm:hidden mb-4">
        <button
          type="button"
          className="w-full bg-light-purple text-white py-2 rounded-full hover:bg-purple-700 transition"
        >
          Post
        </button>
      </div>

      {/* Action Buttons - better responsive layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-sm text-gray-700 border-t border-gray-300">
        <PostBoxButton Icon = {MdLibraryMusic} label = {"Choose Library"} library={true}/>
        <PostBoxButton Icon = {MdCreateNewFolder} label = {"Create Podcast"} library={false}/>
      </div>
    </div>
  );
};

export default PodcastPostBox;