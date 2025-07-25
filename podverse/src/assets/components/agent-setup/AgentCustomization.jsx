import { useState } from "react";
import clsx from "clsx";
import { RiRobot3Fill , RiUserLine } from "react-icons/ri";

import ProfileJeena from '../../images/icon-profile-jeena.png';
import ProfileOlive from '../../images/icon-profile-olive.png';
import ProfileSally from '../../images/icon-profile-sally.png';

const avatarOptions = [ProfileJeena, ProfileOlive, ProfileSally];

const AgentCustomization = ({ formData, setFormData, goNext }) => {
  const [selectedAvatar, setSelectedAvatar] = useState(formData.avatar || "");

  const handleAvatarSelect = (avatar) => {
    setSelectedAvatar(avatar);
    setFormData({ ...formData, avatar });
  };
    // Preview message examples based on tone
    const previewMessages = {
      formal: [
        "Good day. How may I assist you with your inquiries?",
        "I've analyzed the data and have prepared a detailed report for your review.",
        "Please allow me to provide you with comprehensive information on this topic."
      ],
      casual: [
        "Hey there! How can I help you today?",
        "I took a look at that info and here's what I found.",
        "Let me know if you need anything else!"
      ],
      friendly: [
        "Hi friend! What can I do for you? 😊",
        "Great question! I'd be happy to help with that!",
        "I'm excited to share what I've learned about this!"
      ]
    };
  
    // Get avatar placeholder based on selection or default
    const getAvatarSrc = () => {
      if (!formData.avatar) return ProfileSally;
      return "/api/placeholder/48/48"; // In a real app, this would be the selected avatar
    };

  return (
    <div className="flex flex-col md:flex-row gap-8">
      <div className="space-y-8 font-headingPoppins  flex flex-col justify-between flex-[2] bg-white p-6 rounded-xl shadow-md border border-gray-100 ">
        <h2 className="text-2xl font-semibold text-light-charcoal ">Customize Your Speaker</h2>
        {/* Agent Name Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 ml-1 font-subheadingDMSans">Name</label>
          <input
            type="text"
            placeholder="Enter name"
            value={formData.agentName}
            onChange={(e) => setFormData({ ...formData, agentName: e.target.value })}
            className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-light-purple"
          />
        </div>
        {/* Avatar Selection */}
        <div className="inline-flex max-w-md border-2 rounded-full px-6 py-4 bg-purple-100 gap-6">
          {/* Add Avatar Button */}
          <div className="cursor-pointer w-16 h-16 sm:w-20 sm:h-20 overflow-hidden transition border-2 border-dashed border-light-charcoal rounded-full flex items-center justify-center">
            <span className="text-5xl  text-light-purple">+</span>
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
         <div className="space-y-3 font-medium font-subheadingDMSans">
          <h3 className="text-2xl font-semibold text-gray-800">Select Role</h3>
          <div className="inline-flex flex-col md:flex-row gap-4">
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
                <RiRobot3Fill className="h-6 w-6" />
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
              <div className="flex-shrink-0 bg-purple-100 text-light-purple p-2 rounded-full">
                <RiUserLine className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-medium text-lg">AI Guest</h4>
                <p className="text-gray-600 text-sm">Responds to questions, provides assistance when asked, and follows the user's conversation lead.</p>
              </div>
            </div>
          </div>
        </div>
         </div>
      
          {/* Tone Selection */}
        <div className="space-y-8 font-subheadingDMSans">
          <h3 className="text-2xl font-semibold text-light-charcoal ">Customize Tone</h3>
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
            className="bg-light-purple text-white px-8 py-2 rounded-xl transition hover:text-light-charcoal hover:border-2 hover:border-light-purple hover:bg-white font-semibold"
          >
            Next
          </button>
        </div>
      </div>
       {/* Right Section - Preview and Tips */}
              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 flex-[1] h-full overflow-auto">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-indigo-50 p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-xl text-gray-800">Preview Your Agent</h3>
                    <p className="text-base text-gray-500">See how your agent will appear and respond</p>
                  </div>
                  <div className="p-6">
                    <div className="flex gap-3 p-3 bg-gray-50 rounded-lg mb-6">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
                        <img src={getAvatarSrc()} alt="Agent avatar" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800">
                          {formData.agentName || "Your Agent"}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            {formData.role === "ai-host" ? "AI Host" : "AI Guest"}
                          </span>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded capitalize">
                            {formData.tone || "Casual"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-gray-700">Example Responses:</h4>
                      <div className="space-y-3">
                        {(previewMessages[formData.tone] || previewMessages.casual).map((message, idx) => (
                          <div key={idx} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gray-200">
                              <img src={getAvatarSrc()} alt="Agent" className="w-full h-full object-cover" />
                            </div>
                            <div className="bg-gray-100 rounded-2xl rounded-tl-none p-3 text-sm text-gray-800">
                              {message}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h4 className="font-medium text-gray-800 mb-2">Tips</h4>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-start gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Choose a tone that matches your brand's voice</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Add relevant documents to improve your agent's knowledge</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Select a voice that sounds natural and engaging</span>
                    </li>
                  </ul>
                </div>
              </div>
    </div>
  );
};

export default AgentCustomization;





