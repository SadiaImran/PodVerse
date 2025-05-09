import { useState } from "react";
import clsx from "clsx";

import avatar1 from "../../assets/avatars/avatar1.jpg";
import avatar2 from "../../assets/avatars/avatar2.jpg";
import avatar3 from "../../assets/avatars/avatar3.jpg";


const avatarOptions = [avatar1, avatar2, avatar3];

const AgentCustomization = ({ formData, setFormData, goNext }) => {
  const [selectedAvatar, setSelectedAvatar] = useState(formData.avatar || "");

  const handleAvatarSelect = (avatar) => {
    setSelectedAvatar(avatar);
    setFormData({ ...formData, avatar });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">Customize Your Companion</h2>

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
      <div className="inline-flex items-center border-2 rounded-full px-6 py-4 bg-gray-50 gap-6">
        {/* Add Avatar Button */}
        <div className="cursor-pointer w-16 h-16 sm:w-20 sm:h-20 overflow-hidden transition border-2 border-dashed border-light-charcoal rounded-full flex items-center justify-center">
          <span className="text-5xl mb-3 text-light-purple">+</span>
        </div>

        {/* Avatar Options */}
        {avatarOptions.map((avatar, idx) => (
          <div
            key={idx}
            onClick={() => handleAvatarSelect(avatar)}
            className={clsx(
              "cursor-pointer w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden transition",
              selectedAvatar === avatar
                ? "border-light-purple ring-4 ring-light-purple"
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


      <div className="space-y-3">
        <h3 className="text-2xl font-medium text-gray-800">Select Role</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* AI Host Card */}
          <div 
            onClick={() => setFormData({ ...formData, role: "ai-host" })}
            className={`cursor-pointer p-4 border rounded-lg transition-all ${
              formData.role === "ai-host" 
                ? "border-blue-500 bg-blue-50" 
                : "border-gray-200 hover:border-blue-300"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 bg-blue-100 text-blue-600 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-lg">AI Host</h4>
                <p className="text-gray-600 text-sm">Takes the lead in conversations, guides discussions, and provides information proactively.</p>
              </div>
            </div>
          </div>
          
          {/* AI Guest Card */}
          <div 
            onClick={() => setFormData({ ...formData, role: "ai-guest" })}
            className={`cursor-pointer p-4 border rounded-lg transition-all ${
              formData.role === "ai-guest" 
                ? "border-light-purple bg-purple-50" 
                : "border-gray-200 hover:border-purple-300"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 bg-purple-100 text-purple-600 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-lg">AI Guest</h4>
                <p className="text-gray-600 text-sm">Responds to questions, provides assistance when asked, and follows the user's conversation lead.</p>
              </div>
            </div>
          </div>
        </div>
      </div>  
          
      {/* Tone Dropdown */}
        {/* Tone Selection */}
      <div className="space-y-8">
        <h3 className="text-2xl font-medium text-light-charcoal">Customize Tone</h3>
        <div className="flex gap-5">
          <button
            onClick={() => setFormData({ ...formData, tone: "formal" })}
            className={`px-6 py-2 rounded-lg ${
              formData.tone === "formal" 
                ? "bg-indigo-500 text-white" 
                : "bg-indigo-500 text-white"
            }`}
          >
            Formal
          </button>
          <button
            onClick={() => setFormData({ ...formData, tone: "casual" })}
            className={`px-5 py-2 rounded-md ${
              formData.tone === "casual" 
                ? "bg-slate-100 text-gray-700 ring-2 ring-blue-400" 
                : "bg-slate-100 text-gray-700"
            }`}
          >
            Casual
          </button>
          <button
            onClick={() => setFormData({ ...formData, tone: "friendly" })}
            className={`px-5 py-2 rounded-md ${
              formData.tone === "friendly" 
                ? "bg-yellow-300 ring-2 ring-blue-400" 
                : "bg-yellow-300"
            }`}
          >
            Friendly
          </button>
        </div>
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





