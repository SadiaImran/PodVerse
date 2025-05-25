import { FiMoon } from "react-icons/fi";
import { IoMdSunny } from "react-icons/io"; // Import a sun icon for light mode
import { useState } from "react";

function TopBar() {
  const [isDarkMode, setIsDarkMode] = useState(false); // State to track theme

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev); // Toggle the theme state
  };

  return (
    <div className="w-full flex items-center justify-between p-6">
      {/* Logo Section */}
      <div className="flex items-center gap-3 justify-center">
        <img
          src="./src/assets/images/logo.png"
          alt="Logo"
          className="h-10 w-10"
        />
        <span className="text-2xl font-bold text-light-charcoal font-headingPoppins tracking-wider">
          POD<span className="text-light-purple">VERSE</span>
        </span>
      </div>

      {/* Theme Switcher */}
      <button onClick={toggleTheme} className="focus:outline-none">
        {isDarkMode ? (
          <IoMdSunny className="text-3xl text-light-purple" />
        ) : (
          <FiMoon className="text-3xl text-light-purple" />
        )}
      </button>
    </div>
  );
}

export default TopBar;
