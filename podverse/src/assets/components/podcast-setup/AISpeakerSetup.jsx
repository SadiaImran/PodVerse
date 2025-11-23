import { useState, useRef } from "react";
import { RiRobot3Fill, RiUserLine, RiAddLine, RiCloseLine } from "react-icons/ri";
import { ArrowLeft, Briefcase, User, GraduationCap, MessageSquare, Award } from "lucide-react";
import ProfileJeena from '../../images/icon-profile-jeena.png';
import ProfileOlive from '../../images/icon-profile-olive.png';
import ProfileSally from '../../images/icon-profile-sally.png';
import AISpeakerImage from '../../images/Chat-bot-amico.png';

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
    if (formData.guestPersona.expertise.length >= 5) {
      alert('Maximum 5 areas of expertise allowed');
      return;
    }
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
    
    // Store AI Host data if AI Host is selected
    if (agentType === "host") {
      const hostData = {
        name: finalConfig.agentName,
        tone: finalConfig.tone,
        avatar: finalConfig.avatar || selectedAvatar
      };
      sessionStorage.setItem('host_persona', JSON.stringify(hostData));
      console.log(`🎙️ Stored host persona:`, hostData);
    }
    
    // Store guest persona data if AI Guest is selected
    if (agentType === "guest") {
      const guestPersona = {
        name: finalConfig.guestPersona.name,
        role: finalConfig.guestPersona.role,
        tone: finalConfig.guestPersona.tone,
        background: finalConfig.guestPersona.background,
        expertise: finalConfig.guestPersona.expertise,
        avatar: finalConfig.avatar || selectedAvatar
      };
      sessionStorage.setItem('guest_persona', JSON.stringify(guestPersona));
      console.log(`🎭 Stored guest persona:`, guestPersona);
    }
    
    goNext();
  };

  return (
    <div className="max-w-7xl mx-auto relative">
      {/* Left Side Image - Fixed position */}
      <div className="hidden lg:block absolute -left-1/4 top-10 z-0">
        <div className="w-64 h-64">
          <img 
            src={AISpeakerImage} 
            alt="AI Speaker Setup" 
            className="w-full h-full object-contain opacity-70"
          />
        </div>
      </div>
      
      {/* Main Content - Centered */}
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="rounded-[28px] border border-white/60 bg-white/85 backdrop-blur-xl shadow-[0_20px_60px_rgba(96,87,199,0.1)] p-8 md:p-10 space-y-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2" style={{ color: '#6A6A6A' }}>AI Speaker Setup</h2>
          <p style={{ color: '#6A6A6A' }}>Choose and customize your AI speaker</p>
        </div>

        {/* Speaker Type Selection */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4" style={{ color: '#6A6A6A' }}>Choose Speaker Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AI Host Card */}
            <div
              onClick={() => setFormData({ ...formData, speakerType: "ai-host" })}
              className={`cursor-pointer p-6 border-2 rounded-xl transition-all shadow-sm hover:shadow-md ${
                formData.speakerType === "ai-host"
                  ? "border-[#6057C7] bg-[#f5f3ff]"
                  : "border-gray-200 hover:border-[#A388E7] bg-white"
              }`}
            >
              <div className="flex items-start gap-4">
                <div 
                  className="flex-shrink-0 p-3 rounded-full"
                  style={{ 
                    backgroundColor: formData.speakerType === "ai-host" ? '#6057C7' : '#f5f3ff',
                    color: formData.speakerType === "ai-host" ? '#F9F5EB' : '#6057C7'
                  }}
                >
                  <RiRobot3Fill className="h-8 w-8" />
                </div>
                <div>
                  <h4 className="font-semibold text-xl mb-2" style={{ color: '#6A6A6A' }}>AI Host</h4>
                  <p style={{ color: '#6A6A6A' }}>
                    Takes the lead in conversations, guides discussions, and provides information proactively. 
                    Perfect for educational or interview-style podcasts.
                  </p>
                </div>
              </div>
            </div>

            {/* AI Guest Card */}
            <div
              onClick={() => setFormData({ ...formData, speakerType: "ai-guest" })}
              className={`cursor-pointer p-6 border-2 rounded-xl transition-all shadow-sm hover:shadow-md ${
                formData.speakerType === "ai-guest"
                  ? "border-[#6057C7] bg-[#f5f3ff]"
                  : "border-gray-200 hover:border-[#A388E7] bg-white"
              }`}
            >
              <div className="flex items-start gap-4">
                <div 
                  className="flex-shrink-0 p-3 rounded-full"
                  style={{ 
                    backgroundColor: formData.speakerType === "ai-guest" ? '#6057C7' : '#f5f3ff',
                    color: formData.speakerType === "ai-guest" ? '#F9F5EB' : '#6057C7'
                  }}
                >
                  <RiUserLine className="h-8 w-8" />
                </div>
                <div>
                  <h4 className="font-semibold text-xl mb-2" style={{ color: '#6A6A6A' }}>AI Guest</h4>
                  <p style={{ color: '#6A6A6A' }}>
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
          <h3 className="text-xl font-semibold" style={{ color: '#6A6A6A' }}>
            {formData.speakerType === "ai-host" ? "AI Host Customization" : "AI Guest Basic Setup"}
          </h3>
          
          {/* Name and Avatar in Same Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Name Field */}
            <div>
              <label className="block text-lg font-semibold mb-3" style={{ color: '#6A6A6A' }}>
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
                className="w-full border-2 border-gray-300 rounded-xl p-4 text-lg focus:outline-none focus:ring-2 focus:ring-[#6057C7] focus:border-transparent transition-all"
                style={{ focusRingColor: '#6057C7' }}
              />
            </div>

            {/* Avatar Selection */}
            <div>
              <label className="block text-lg font-semibold mb-3" style={{ color: '#6A6A6A' }}>
                Choose Avatar *
              </label>
              <div className="flex flex-wrap gap-4">
                {/* Upload Button */}
                <div 
                  className="cursor-pointer w-20 h-20 border-2 border-dashed rounded-full flex items-center justify-center transition-all shadow-sm hover:shadow-md"
                  style={{ 
                    borderColor: '#A388E7',
                    backgroundColor: '#f5f3ff'
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#6057C7';
                    e.currentTarget.style.backgroundColor = '#e9e5ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#A388E7';
                    e.currentTarget.style.backgroundColor = '#f5f3ff';
                  }}
                >
                  <RiAddLine className="w-8 h-8" style={{ color: '#6057C7' }} />
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
                    className={`cursor-pointer w-20 h-20 rounded-full overflow-hidden transition shadow-md hover:shadow-lg ${
                      selectedAvatar === avatar
                        ? "ring-4 ring-[#6057C7] ring-offset-2"
                        : "hover:ring-2 hover:ring-[#A388E7]"
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
                    className={`relative cursor-pointer w-20 h-20 rounded-full overflow-hidden transition shadow-md hover:shadow-lg ${
                      selectedAvatar === avatar.src
                        ? "ring-4 ring-[#6057C7] ring-offset-2"
                        : "hover:ring-2 hover:ring-[#A388E7]"
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
                      className="absolute -top-2 -right-2 bg-white text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg hover:scale-110 transition-all"
                      style={{ color: '#ef4444', border: '2px solid #ef4444' }}
                    >
                      <RiCloseLine className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-sm mt-2" style={{ color: '#6A6A6A' }}>
                Click the + icon to upload your own image (max 5MB)
              </p>
            </div>
          </div>
          

          {/* Tone Selection */}
          <div>
            <label className="block text-lg font-semibold mb-3" style={{ color: '#6A6A6A' }}>
              Communication Tone
            </label>
            <div className="flex flex-wrap gap-3">
              {[
                { name: "formal", color: "#fbbf24" },
                { name: "casual", color: "#6057C7" },
                { name: "friendly", color: "#ec4899" },
                { name: "professional", color: "#6366f1" }
              ].map((tone) => {
                const currentTone = formData.speakerType === "ai-host" ? formData.tone : formData.guestPersona.tone;
                const isSelected = currentTone === tone.name;
                
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
                    className="px-5 py-2.5 rounded-full font-semibold text-sm transition-all shadow-sm hover:shadow-md"
                    style={
                      isSelected
                        ? { backgroundColor: tone.color, color: '#FFFFFF' }
                        : { 
                            backgroundColor: 'white', 
                            color: tone.color,
                            border: `2px solid ${tone.color}`
                          }
                    }
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = `${tone.color}15`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'white';
                      }
                    }}
                  >
                    {tone.name.charAt(0).toUpperCase() + tone.name.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* AI Guest Additional Setup */}
        {formData.speakerType === "ai-guest" ? (
          <div className="mt-10">
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-3" style={{ color: '#6A6A6A' }}>
              <User className="w-7 h-7" style={{ color: '#6057C7' }} />
              AI Guest Persona Details
            </h3>
            
            {/* Row 1: Professional Role and Areas of Expertise */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Role */}
              <div>
                <label className="block text-lg font-semibold mb-3 flex items-center gap-3" style={{ color: '#6A6A6A' }}>
                  <Briefcase className="w-7 h-7" style={{ color: '#6057C7' }} />
                  Professional Role *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Professional Cricketer, Software Engineer"
                  value={formData.guestPersona.role}
                  onChange={(e) => setFormData({
                    ...formData,
                    guestPersona: { ...formData.guestPersona, role: e.target.value }
                  })}
                  className="w-full border-2 border-gray-300 rounded-xl p-4 text-lg focus:outline-none focus:ring-2 focus:ring-[#6057C7] focus:border-transparent transition-all"
                />
              </div>

              {/* Expertise Areas */}
              <div>
                <label className="block text-lg font-semibold mb-3 flex items-center gap-3" style={{ color: '#6A6A6A' }}>
                  <Award className="w-7 h-7" style={{ color: '#6057C7' }} />
                  Areas of Expertise {formData.guestPersona.expertise.length > 0 && `(${formData.guestPersona.expertise.length}/5)`}
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
                        disabled={formData.guestPersona.expertise.length >= 5}
                        className="w-full border-2 border-gray-300 rounded-xl p-4 pl-12 text-lg focus:outline-none focus:ring-2 focus:ring-light-purple focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                    <button
                      onClick={addExpertise}
                      disabled={formData.guestPersona.expertise.length >= 5 || !newExpertise.trim()}
                      className="px-6 py-4 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={formData.guestPersona.expertise.length >= 5 
                        ? { backgroundColor: '#e5e7eb', color: '#9ca3af' }
                        : { backgroundColor: '#6057C7', color: '#F9F5EB' }
                      }
                      onMouseEnter={(e) => {
                        if (formData.guestPersona.expertise.length < 5) {
                          e.currentTarget.style.backgroundColor = '#4f46e5';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (formData.guestPersona.expertise.length < 5) {
                          e.currentTarget.style.backgroundColor = '#6057C7';
                        }
                      }}
                    >
                      <RiAddLine className="w-5 h-5" />
                      Add
                    </button>
                  </div>
                  {formData.guestPersona.expertise.length >= 5 && (
                    <p className="text-sm" style={{ color: '#6A6A6A' }}>
                      Maximum 5 areas of expertise reached
                    </p>
                  )}
                  
                  {/* Display Expertise */}
                  {formData.guestPersona.expertise.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.guestPersona.expertise.map((exp, index) => (
                        <span
                          key={index}
                          className="px-4 py-2 rounded-full text-sm flex items-center gap-2 shadow-sm"
                          style={{ backgroundColor: '#6057C7', color: '#F9F5EB' }}
                        >
                          {exp}
                          <button
                            onClick={() => removeExpertise(exp)}
                            className="rounded-full p-1 transition-colors hover:opacity-80"
                          >
                            <RiCloseLine className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Row 2: Background & Experience and Communication Style */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Background */}
              <div>
                <label className="block text-lg font-semibold mb-3 flex items-center gap-3" style={{ color: '#6A6A6A' }}>
                  <GraduationCap className="w-7 h-7" style={{ color: '#6057C7' }} />
                  Background & Experience *
                </label>
                <textarea
                  placeholder="e.g., former team captain with years of experience"
                  value={formData.guestPersona.background}
                  onChange={(e) => setFormData({
                    ...formData,
                    guestPersona: { ...formData.guestPersona, background: e.target.value }
                  })}
                  rows={3}
                  className="w-full border-2 border-gray-300 rounded-xl p-4 text-lg focus:outline-none focus:ring-2 focus:ring-[#6057C7] focus:border-transparent transition-all resize-none"
                />
              </div>

              {/* Communication Style */}
              <div>
                <label className="block text-lg font-semibold mb-3 flex items-center gap-3" style={{ color: '#6A6A6A' }}>
                  <MessageSquare className="w-7 h-7" style={{ color: '#6057C7' }} />
                  Communication Style
                </label>
                <textarea
                  placeholder="e.g., uses cricket metaphors, friendly tone, speaks with confidence"
                  value={formData.guestPersona.style}
                  onChange={(e) => setFormData({
                    ...formData,
                    guestPersona: { ...formData.guestPersona, style: e.target.value }
                  })}
                  rows={3}
                  className="w-full border-2 border-gray-300 rounded-xl p-4 text-lg focus:outline-none focus:ring-2 focus:ring-[#6057C7] focus:border-transparent transition-all resize-none"
                />
              </div>
            </div>
          </div>
        ) : null}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-8">
          <button 
            onClick={goBack}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md hover:shadow-lg"
            style={{ backgroundColor: '#6057C7', color: '#F9F5EB' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4f46e5';
              e.currentTarget.style.transform = 'translateX(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6057C7';
              e.currentTarget.style.transform = 'translateX(0)';
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <button
            onClick={handleNext}
            disabled={!isFormValid()}
            className="px-8 py-4 rounded-full font-semibold text-lg transition-all shadow-md hover:shadow-lg"
            style={
              isFormValid()
                ? { backgroundColor: '#6057C7', color: '#F9F5EB' }
                : { backgroundColor: '#e5e7eb', color: '#9ca3af', cursor: 'not-allowed' }
            }
            onMouseEnter={(e) => {
              if (isFormValid()) {
                e.currentTarget.style.backgroundColor = '#4f46e5';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (isFormValid()) {
                e.currentTarget.style.backgroundColor = '#6057C7';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            Next: Voice Setup →
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};

export default AISpeakerSetup;
