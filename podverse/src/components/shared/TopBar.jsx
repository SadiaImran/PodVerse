import { LuGlobe } from "react-icons/lu";
import { FaQuestionCircle } from "react-icons/fa";
function TopBar() {
  return (
    <div className="w-full  flex items-center justify-between px-6 mt-12">

        
      <div className="flex items-center gap-3 ml-16 justify-center ">
        <img src="./src/assets/images/logo.png" alt="Logo" className="h-10 w-10" />
        <span className="text-2xl font-bold text-light-charcoal font-headingPoppins tracking-wider">
          POD<span className="text-light-purple">VERSE</span>
        </span>
      </div>

    </div>
  );
}

export default TopBar;
