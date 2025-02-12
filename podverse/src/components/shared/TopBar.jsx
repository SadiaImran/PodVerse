import { FaGlobe, FaQuestionCircle } from "react-icons/fa";

function TopBar() {
  return (
    <div className="w-full h-16 bg-white flex items-center justify-between px-6 shadow-md">

      <div className="flex items-center gap-3 ml-16">
        <img src="./src/assets/images/icon-logo.png" alt="Logo" className="h-8 w-8" />
        <span className="text-xl font-InriaSerif text-black">PodVerse</span>
      </div>

      <div className="flex items-center gap-4 mr-16">
        <button className="text-gray-700 text-xl">
          <FaGlobe />
        </button>
        <button className="text-gray-700 text-xl">
          <FaQuestionCircle/>
        </button>
      </div>

    </div>
  );
}

export default TopBar;
