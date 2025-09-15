import { useState, useRef, useEffect } from "react";
import { FaChevronDown } from "react-icons/fa";
import { FiSearch, FiLogOut } from "react-icons/fi";
import { HiOutlineBell } from "react-icons/hi2";
import ProfileMarry from "../../images/icon-profile-marry.png";
import Logo from "../../images/logo.png";
import { supabase } from "../../../connection_supabase_client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext"; // adjust path if needed

export default function TopBar({ open }) {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [fullName, setFullName] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const dropdownRef = useRef(null);

  const { logout } = useAuth();

  // Load user profile from Supabase
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, profile_url")
          .eq("id", user.id)
          .single();

        setUserData({
          id: user.id,
          email: user.email,
          full_name: profile?.full_name || "",
          profile_url: profile?.profile_url || null,
        });
        setFullName(profile?.full_name || "");
        setPreviewUrl(profile?.profile_url || null);
      }
    };
    loadProfile();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/signin-email"; // full redirect clears cached session
  };
  
  const handleSaveProfile = async () => {
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        profile_url: previewUrl,
      })
      .eq("id", userData.id);

    if (!error) {
      setUserData({ ...userData, full_name: fullName, profile_url: previewUrl });
      alert("Profile updated!");
      setShowModal(false);
    } else {
      alert("Failed to update profile.");
    }
  };

  return (
    <nav className="bg-white containerr flex items-center justify-between px-4 py-4 shadow-md font-subheadingDMSans w-full relative">
      {open && (
        <div className="hidden md:flex items-center gap-2 mr-6">
          <img src={Logo} alt="Logo" className="w-10 md:w-12" />
          <span className="text-lg font-bold text-light-charcoal font-headingPoppins tracking-wider">
            POD<span className="text-light-purple">VERSE</span>
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 flex-1 max-w-full">
        <div className="relative w-full max-w-[600px] md:mx-auto flex-1 border border-gray-300 rounded-lg">
          <input
            type="text"
            placeholder="Search..."
            className="pl-8 pr-4 py-2 bg-light-background rounded-lg outline-none w-full text-base text-light-black"
          />
          <FiSearch className="absolute left-2 top-2.5 mt-0.5 text-light-grey" />
        </div>

        <div className="flex items-center gap-4 flex-shrink-0 ml-2" ref={dropdownRef}>
          <div className="relative">
            <HiOutlineBell className="text-light-charcoal w-8 h-8 cursor-pointer" />
            <span className="absolute top-0 right-0 text-xs text-white bg-red-500 rounded-full px-1">
              3
            </span>
          </div>

          <div className="flex items-center gap-2 cursor-pointer relative">
            <img src={userData?.profile_url || ProfileMarry} className="w-8 h-8 rounded-full" />
            <span className="text-sm text-gray-800 font-medium hidden sm:block">
              {userData?.full_name || "User"}
            </span>
            <FaChevronDown
              className="text-xs text-light-charcoal hidden sm:block"
              onClick={() => setShowDropdown(!showDropdown)}
            />

            {showDropdown && (
              <div className="absolute right-0 mt-10 w-40 bg-white border rounded-md shadow-lg z-50">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    setShowModal(true);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Edit Profile
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 hover:bg-light-background hover:text-light-charcoal hover:border-light-purple border-2 bg-light-purple text-white text-sm font-medium rounded-md shadow transition duration-200"
          >
            <FiLogOut className="text-lg" />
            Logout
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-lg p-6 md:p-8 relative">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-xl"
              onClick={() => setShowModal(false)}
              aria-label="Close"
            >
              ✕
            </button>

            <h2 className="text-2xl font-bold text-center text-light-charcoal mb-6">Edit Your Profile</h2>

            <div className="flex flex-col items-center gap-4">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-28 h-28 rounded-full object-cover border-4 border-light-purple shadow-md"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                  No Image
                </div>
              )}

              <div className="w-full">
                <label className="block text-sm font-medium text-gray-600 mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-light-purple focus:border-light-purple text-gray-800 placeholder:text-gray-400"
                  placeholder="Enter your full name"
                />
              </div>

              <button
                className="mt-4 w-full bg-light-purple hover:bg-purple-700 text-white font-semibold py-2 rounded-xl transition-all duration-200 shadow-sm"
                onClick={handleSaveProfile}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
