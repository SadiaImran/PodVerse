import { LuGlobe } from "react-icons/lu";
import { FaQuestionCircle } from "react-icons/fa";
function TopBar() {
  return (
    <div className="w-full h-16 flex items-center justify-between px-6 pt-2">

      <div className="flex items-center gap-3 ml-16">
        <img src="./src/assets/images/icon-logo.png" alt="Logo" className="h-10 w-10" />
        <span className="text-3xl font-semibold font-HeadingPoppins text-neutral-800">PodVerse</span>
      </div>

      {/* <div className="flex items-center gap-4 mr-16">
        <button className="text-gray-700 text-xl">
        <LuGlobe />
        </button>
        <button className="text-gray-700 text-xl">
          <FaQuestionCircle/>
        </button>
      </div> */}

    </div>
  );
}

export default TopBar;
