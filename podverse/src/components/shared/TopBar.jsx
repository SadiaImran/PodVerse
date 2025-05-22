import { LuGlobe } from "react-icons/lu";
import { FaQuestionCircle } from "react-icons/fa";
function TopBar() {
  return (
    <div className="w-full h-16 flex items-center justify-between px-6 pt-2">

      <div className="flex items-center gap-3 ml-16">
        <img src="./src/assets/images/logo.png" alt="Logo" className="h-10 w-10" />
        <span className="text-lg font-bold text-light-charcoal font-headingPoppins tracking-wider">
              POD<span className="text-light-purple">VERSE</span>
        </span>
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
