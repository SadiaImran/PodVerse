import { useState, useRef } from "react";
import { RiRobot3Fill, RiUserLine, RiAddLine, RiCloseLine } from "react-icons/ri";
import { IoMdArrowRoundBack } from "react-icons/io";
import ProfileJeena from '../../images/icon-profile-jeena.png';
import ProfileOlive from '../../images/icon-profile-olive.png';
import ProfileSally from '../../images/icon-profile-sally.png';

const defaultAvatarOptions = [ProfileJeena, ProfileOlive, ProfileSally];

const AISpeakerSetup = ({ formData, setFormData, goNext, goBack }) => {
  const [selectedAvatar, setSelectedAvatar] = useState(formData.avatar || "");
  const [newExpertise, setNewExpertise] = useState("");
  const [uploadedAvatars, setUploadedAvatars] = useState([]);
  const fileInputRef = useRef(null);

  const handleAvatarSelect = (avatar) => {
    setSelectedAvatar(avatar);
    setFormData({ ...formData, avatar });
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const imageDataUrl = e.target.result;
        const newAvatar = {
          id: Date.now(),
          src: imageDataUrl,
          name: file.name
        };
        
        setUploadedAvatars(prev => [...prev, newAvatar]);
        handleAvatarSelect(imageDataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeUploadedAvatar = (avatarId) => {
    setUploadedAvatars(prev => prev.filter(avatar => avatar.id !== avatarId));
    // If the removed avatar was selected, clear selection
    if (selectedAvatar && uploadedAvatars.find(avatar => avatar.id === avatarId)?.src === selectedAvatar) {
      setSelectedAvatar("");
      setFormData({ ...formData, avatar: "" });
    }
  };

  const addExpertise = () => {
    if (newExpertise.trim() && !formData.guestPersona.expertise.includes(newExpertise.trim())) {
      setFormData({
        ...formData,
        guestPersona: {
          ...formData.guestPersona,
          expertise: [...formData.guestPersona.expertise, newExpertise.trim()]
        }
      });
      setNewExpertise("");
    }
  };

  const removeExpertise = (expertiseToRemove) => {
    setFormData({
      ...formData,
      guestPersona: {
        ...formData.guestPersona,
        expertise: formData.guestPersona.expertise.filter(exp => exp !== expertiseToRemove)
      }
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addExpertise();
    }
  };

  const isFormValid = () => {
    if (formData.speakerType === "ai-host") {
      return formData.agentName.trim() && (formData.avatar || selectedAvatar);
    } else {
      return formData.guestPersona.name.trim() && 
             formData.guestPersona.role.trim() && 
             formData.guestPersona.background.trim() &&
             (formData.avatar || selectedAvatar);
    }
  };

  const handleNext = () => {
    // Determine which configuration to use based on what's filled
    let finalConfig = { ...formData };
    
    // Ensure avatar is set (either default or uploaded)
    if (selectedAvatar && !finalConfig.avatar) {
      finalConfig.avatar = selectedAvatar;
    }
    
    // If both AI host and guest are configured, prioritize based on completeness
    const hostConfigured = formData.agentName.trim() && (formData.avatar || selectedAvatar);
    const guestConfigured = formData.guestPersona.name.trim() && 
                           formData.guestPersona.role.trim() && 
                           formData.guestPersona.background.trim() &&
                           (formData.avatar || selectedAvatar);
    
    if (hostConfigured && guestConfigured) {
      // Both are configured - use the currently selected speaker type
      console.log(`Both AI host and guest configured. Using: ${formData.speakerType}`);
    } else if (hostConfigured && !guestConfigured) {
      // Only host is configured
      finalConfig.speakerType = "ai-host";
      console.log("Using AI host configuration");
    } else if (!hostConfigured && guestConfigured) {
      // Only guest is configured
      finalConfig.speakerType = "ai-guest";
      console.log("Using AI guest configuration");
    }
    
    // Update form data with final configuration
    setFormData(finalConfig);
    
    // Store agent type in sessionStorage for the recording panel
    const agentType = finalConfig.speakerType === "ai-host" ? "host" : "guest";
    sessionStorage.setItem('selected_agent_type', agentType);
    console.log(`🎯 Stored agent type in sessionStorage: ${agentType}`);
    
    // Store guest persona data if AI Guest is selected
    if (agentType === "guest") {
      const guestPersona = {
        name: finalConfig.guestPersona.name,
        role: finalConfig.guestPersona.role,
        tone: finalConfig.guestPersona.tone,
        background: finalConfig.guestPersona.background,
        expertise: finalConfig.guestPersona.expertise
      };
      sessionStorage.setItem('guest_persona', JSON.stringify(guestPersona));
      console.log(`🎭 Stored guest persona:`, guestPersona);
    }
    
    goNext();
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">AI Speaker Setup</h2>
          <p className="text-gray-600">Choose and customize your AI speaker</p>
        </div>

        {/* Speaker Type Selection */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Choose Speaker Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AI Host Card */}
            <div
              onClick={() => setFormData({ ...formData, speakerType: "ai-host" })}
              className={`cursor-pointer p-6 border-2 rounded-xl transition-all ${
                formData.speakerType === "ai-host"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-blue-300"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 bg-blue-100 text-blue-600 p-3 rounded-full">
                  <RiRobot3Fill className="h-8 w-8" />
                </div>
                <div>
                  <h4 className="font-semibold text-xl mb-2">AI Host</h4>
                  <p className="text-gray-600">
                    Takes the lead in conversations, guides discussions, and provides information proactively. 
                    Perfect for educational or interview-style podcasts.
                  </p>
                </div>
              </div>
            </div>

            {/* AI Guest Card */}
            <div
              onClick={() => setFormData({ ...formData, speakerType: "ai-guest" })}
              className={`cursor-pointer p-6 border-2 rounded-xl transition-all ${
                formData.speakerType === "ai-guest"
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-200 hover:border-purple-300"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 bg-purple-100 text-purple-600 p-3 rounded-full">
                  <RiUserLine className="h-8 w-8" />
                </div>
                <div>
                  <h4 className="font-semibold text-xl mb-2">AI Guest</h4>
                  <p className="text-gray-600">
                    Responds to questions, provides expertise when asked, and follows the conversation lead. 
                    Perfect for expert interviews or specialized topics.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Common Fields for Both Host and Guest */}
        <div className="space-y-8">
          <h3 className="text-xl font-semibold text-gray-800">
            {formData.speakerType === "ai-host" ? "AI Host Customization" : "AI Guest Basic Setup"}
          </h3>
          
          {/* Name Field */}
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-3">
              {formData.speakerType === "ai-host" ? "Host Name *" : "Guest Name *"}
            </label>
            <input
              type="text"
              placeholder={formData.speakerType === "ai-host" ? "e.g., Alex, Sarah, Dr. Smith" : "e.g., Imran, Dr. Sarah, Captain Mike"}
              value={formData.speakerType === "ai-host" ? formData.agentName : formData.guestPersona.name}
              onChange={(e) => {
                if (formData.speakerType === "ai-host") {
                  setFormData({ ...formData, agentName: e.target.value });
                } else {
                  setFormData({
                    ...formData,
                    guestPersona: { ...formData.guestPersona, name: e.target.value }
                  });
                }
              }}
              className="w-full border-2 border-gray-300 rounded-xl p-4 text-lg focus:outline-none focus:ring-2 focus:ring-light-purple focus:border-transparent transition-all"
            />
          </div>

          {/* Avatar Selection */}
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-3">
              Choose Avatar *
            </label>
            <div className="flex flex-wrap gap-4">
              {/* Upload Button */}
              <div 
                className="cursor-pointer w-20 h-20 border-2 border-dashed border-gray-400 rounded-full flex items-center justify-center hover:border-light-purple transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <RiAddLine className="w-8 h-8 text-gray-400" />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              
              {/* Default Avatars */}
              {defaultAvatarOptions.map((avatar, idx) => (
                <div
                  key={`default-${idx}`}
                  onClick={() => handleAvatarSelect(avatar)}
                  className={`cursor-pointer w-20 h-20 rounded-full overflow-hidden transition ${
                    selectedAvatar === avatar
                      ? "ring-4 ring-light-purple"
                      : "hover:ring-2 hover:ring-gray-300"
                  }`}
                >
                  <img
                    src={avatar}
                    alt={`Default Avatar ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              
              {/* Uploaded Avatars */}
              {uploadedAvatars.map((avatar) => (
                <div
                  key={avatar.id}
                  className={`relative cursor-pointer w-20 h-20 rounded-full overflow-hidden transition ${
                    selectedAvatar === avatar.src
                      ? "ring-4 ring-light-purple"
                      : "hover:ring-2 hover:ring-gray-300"
                  }`}
                >
                  <img
                    src={avatar.src}
                    alt={avatar.name}
                    className="w-full h-full object-cover"
                    onClick={() => handleAvatarSelect(avatar.src)}
                  />
                  {/* Remove button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeUploadedAvatar(avatar.id);
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <RiCloseLine className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Click the + icon to upload your own image (max 5MB)
            </p>
          </div>

          {/* Tone Selection */}
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-3">
              Communication Tone
            </label>
            <div className="flex flex-wrap gap-3">
              {[
                { name: "formal", bgColor: "bg-yellow-500", borderColor: "border-yellow-500" },
                { name: "casual", bgColor: "bg-purple-500", borderColor: "border-purple-500" },
                { name: "friendly", bgColor: "bg-pink-500", borderColor: "border-pink-500" },
                { name: "professional", bgColor: "bg-indigo-500", borderColor: "border-indigo-500" }
              ].map((tone) => {
                const currentTone = formData.speakerType === "ai-host" ? formData.tone : formData.guestPersona.tone;
                const isSelected = currentTone === tone.name;
                const hasSelection = currentTone && currentTone !== "";
                
                return (
                  <button
                    key={tone.name}
                    onClick={() => {
                      if (formData.speakerType === "ai-host") {
                        setFormData({ ...formData, tone: tone.name });
                      } else {
                        setFormData({
                          ...formData,
                          guestPersona: { ...formData.guestPersona, tone: tone.name }
                        });
                      }
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 border-2 ${
                      isSelected
                        ? `${tone.bgColor} text-white shadow-md`
                        : hasSelection
                        ? `bg-white text-gray-800 ${tone.borderColor} hover:bg-gray-50`
                        : `${tone.bgColor} text-white hover:opacity-80`
                    }`}
                  >
                    {tone.name.charAt(0).toUpperCase() + tone.name.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* AI Guest Additional Setup */}
        {formData.speakerType === "ai-guest" && (
          <div className="space-y-8 mt-10">
            <h3 className="text-xl font-semibold text-gray-800">AI Guest Persona Details</h3>
            
            {/* Role */}
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-3">
                Professional Role *
              </label>
              <input
                type="text"
                placeholder="e.g., Professional Cricketer, Software Engineer, Marketing Expert"
                value={formData.guestPersona.role}
                onChange={(e) => setFormData({
                  ...formData,
                  guestPersona: { ...formData.guestPersona, role: e.target.value }
                })}
                className="w-full border-2 border-gray-300 rounded-xl p-4 text-lg focus:outline-none focus:ring-2 focus:ring-light-purple focus:border-transparent transition-all"
              />
            </div>

            {/* Background */}
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-3">
                Background & Experience *
              </label>
              <textarea
                placeholder="e.g., former team captain with years of experience in world tournaments"
                value={formData.guestPersona.background}
                onChange={(e) => setFormData({
                  ...formData,
                  guestPersona: { ...formData.guestPersona, background: e.target.value }
                })}
                rows={3}
                className="w-full border-2 border-gray-300 rounded-xl p-4 text-lg focus:outline-none focus:ring-2 focus:ring-light-purple focus:border-transparent transition-all resize-none"
              />
            </div>

            {/* Expertise Areas */}
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-3">
                Areas of Expertise
              </label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <RiAddLine className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="e.g., team leadership, match strategy"
                      value={newExpertise}
                      onChange={(e) => setNewExpertise(e.target.value)}
                       onKeyPress={handleKeyPress}
                      className="w-full border-2 border-gray-300 rounded-xl p-4 pl-12 text-lg focus:outline-none focus:ring-2 focus:ring-light-purple focus:border-transparent transition-all"
                    />
                  </div>
                  <button
                    onClick={addExpertise}
                    className="bg-light-purple text-white px-6 py-4 rounded-xl hover:bg-purple-700 transition-colors flex items-center gap-2"
                  >
                    <RiAddLine className="w-5 h-5" />
                    Add
                  </button>
                </div>
                
                {/* Display Expertise */}
                {formData.guestPersona.expertise.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.guestPersona.expertise.map((exp, index) => (
                      <span
                        key={index}
                        className="bg-light-purple text-white px-4 py-2 rounded-full text-sm flex items-center gap-2"
                      >
                        {exp}
                        <button
                          onClick={() => removeExpertise(exp)}
                          className="hover:bg-purple-700 rounded-full p-1 transition-colors"
                        >
                          <RiCloseLine className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Communication Style */}
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-3">
                Communication Style
              </label>
              <textarea
                placeholder="e.g., uses cricket metaphors, friendly tone, speaks with confidence"
                value={formData.guestPersona.style}
                onChange={(e) => setFormData({
                  ...formData,
                  guestPersona: { ...formData.guestPersona, style: e.target.value }
                })}
                rows={2}
                className="w-full border-2 border-gray-300 rounded-xl p-4 text-lg focus:outline-none focus:ring-2 focus:ring-light-purple focus:border-transparent transition-all resize-none"
              />
            </div>

          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <button 
            onClick={goBack}
            className="text-light-purple font-medium text-3xl hover:underline"
          >
            <IoMdArrowRoundBack />
          </button>
          <button
            onClick={handleNext}
            disabled={!isFormValid()}
            className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all ${
              isFormValid()
                ? 'bg-light-purple text-white hover:bg-purple-700 hover:shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Next: Voice Setup →
          </button>
        </div>
      </div>
    </div>
  );
};

export default AISpeakerSetup;
