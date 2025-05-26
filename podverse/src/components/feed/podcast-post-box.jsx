import { button } from "@material-tailwind/react";
import { HiOutlineUserCircle } from "react-icons/hi";
import { useNavigate } from "react-router-dom";
import { MdLibraryMusic, MdCreateNewFolder } from "react-icons/md";

function PodcastPostBox () {
 
  const PostBoxButton = ({Icon , label , library}) => (
  <button className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg hover:bg-indigo-50 transition"
  onClick={() => {
    library ? navigate('/create-podcast') : navigate('/agent-setup')
  }}
  >
          <Icon className={`text-2xl sm:text-3xl ${library ? "text-light-purple" : "text-green-600"}`} />
          <span className="whitespace-nowrap">{label}</span>
  </button>
);
 
 const navigate = useNavigate();  
  return (
    <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-300 mb-6">
      <div className="flex items-center gap-4 mb-4">
      <div className="w-12 h-9 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
          A
        </div>
          <input
             type="text"
             placeholder="What's brewing in your mind?"
             className="w-full p-3 bg-gray-50 rounded-lg border-0 focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-gray-700"
           />
           <button className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-all font-medium">
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
