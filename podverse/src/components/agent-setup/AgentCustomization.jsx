import { useState } from "react";
import clsx from "clsx";

import avatar1 from "../../assets/avatars/avatar1.jpg";
import avatar2 from "../../assets/avatars/avatar2.jpg";
import avatar3 from "../../assets/avatars/avatar3.jpg";
import avatar4 from "../../assets/avatars/avatar3.jpg";
import avatar5 from "../../assets/avatars/avatar3.jpg";
import avatar6 from "../../assets/avatars/avatar3.jpg";

const avatarOptions = [avatar1, avatar2, avatar3, avatar4, avatar5, avatar6];

const AgentCustomization = ({ formData, setFormData, goNext }) => {
  const [selectedAvatar, setSelectedAvatar] = useState(formData.avatar || "");

  const handleAvatarSelect = (avatar) => {
    setSelectedAvatar(avatar);
    setFormData({ ...formData, avatar });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">Customize Your Agent</h2>

      {/* Agent Name Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Agent Name</label>
        <input
          type="text"
          placeholder="Enter agent name"
          value={formData.agentName}
          onChange={(e) => setFormData({ ...formData, agentName: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-light-purple"
        />
      </div>

      {/* Avatar Selection */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-1">
        {avatarOptions.map((avatar, idx) => (
          <div
            key={idx}
            onClick={() => handleAvatarSelect(avatar)}
            className={clsx(
              "cursor-pointer w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden transition",
              selectedAvatar === avatar
                ? "border-light-purple ring-2 ring-light-purple"
                : "border-gray-200 hover:border-gray-400"
            )}
          >
            <img
              src={avatar}
              alt={`Avatar ${idx + 1}`}
              className="w-full h-full object-cover rounded-full"
            />
          </div>
        ))}
      </div>


      {/* Role Selection (Radio Buttons) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Role</label>
        <div className="flex gap-6">
          {["AI Host", "AI Guest"].map((role) => {
            const value = role.toLowerCase().replace(" ", "-");
            return (
              <label
                key={value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="role"
                  value={value}
                  checked={formData.role === value}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="accent-light-purple"
                />
                <span className="text-gray-700">{role}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Tone Dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tone</label>
        <select
          value={formData.tone}
          onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-light-purple"
        >
          <option value="">Select Tone</option>
          <option value="friendly">Friendly</option>
          <option value="professional">Professional</option>
          <option value="casual">Casual</option>
        </select>
      </div>

      {/* Next Button */}
      <div className="flex justify-end pt-4">
        <button
          onClick={goNext}
          className="bg-light-purple text-white px-5 py-2 rounded-lg hover:bg-light-lightPurple transition"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default AgentCustomization;
