import { useState, useRef, useEffect } from "react";
import { FaChevronDown } from "react-icons/fa";
import { FiSearch } from "react-icons/fi";
import { HiOutlineBell } from "react-icons/hi2";
import ProfileMarry from "../../assets/images/icon-profile-marry.png";
import Logo from "../../assets/images/logo.png";
import { logout as logoutAPI } from "../../api/auth";
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from "react-router-dom";
import { FiLogOut } from "react-icons/fi";
import { updateProfile } from "../../api/auth";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";

export default function TopBar({ open }) {
  const navigate = useNavigate();
  const { logout, userData } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [fullName, setFullName] = useState(userData?.fullName || "");
  const [profilePic, setProfilePic] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(userData?.profileUrl || null);
  const dropdownRef = useRef(null);
  


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
    try {
      await logoutAPI();
      await logout();
      navigate('/signin-email');
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePic(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  return (
    <nav className="bg-white containerr flex items-center justify-between px-4 py-4 shadow-md font-subheadingDMSans w-full relative">
      {!open && (
        <div className="hidden md:flex items-center gap-2 mr-6">
          <img src={Logo} alt="Logo" className="w-10 md:w-12" />
          <span className="text-lg font-bold text-light-charcoal font-headingPoppins tracking-wider">
            POD<span className="text-light-purple">VERSE</span>
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 flex-1 max-w-full">
        <div className="relative w-full max-w-[600px] md:mx-auto flex-1">
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
            <img src={userData?.profileUrl || ProfileMarry} className="w-8 h-8 rounded-full" />
            <span className="text-sm text-gray-800 font-medium hidden sm:block">
              {userData?.fullName || "User"}
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

        <label className="text-sm text-gray-600 font-medium">
          <span className="block mb-1">Upload New Profile Picture</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="block w-full text-sm file:py-1 file:px-3 file:border file:border-gray-300 file:rounded-full file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100 transition"
          />
        </label>

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
          onClick={async () => {
            try {
              if (!profilePic) {
                alert("Please select a profile picture.");
                return;
              }
          
              const uploadedUrl = await uploadToCloudinary([profilePic], 'images_preset');
              if (!uploadedUrl || uploadedUrl.length === 0) {
                alert("Failed to upload profile picture.");
                return;
              }
          
              await updateProfile({
                fullName: fullName,
                profileUrl: uploadedUrl[0]
              });

              alert("Profile updated!");
              setShowModal(false);
            } catch (err) {
              console.error("Update failed:", err);
              alert("Failed to update profile.");
            }
          }}
          
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