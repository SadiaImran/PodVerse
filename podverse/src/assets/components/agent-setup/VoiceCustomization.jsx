import { BsPlayFill } from "react-icons/bs";
import { useState, useRef, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { PiSpeakerHighBold } from "react-icons/pi";
import { HiOutlineUpload } from "react-icons/hi";

import SampleVoices from "./agent-voice-setup/agent-sample-voice";
import VoiceUploadSystem from "./agent-voice-setup/agent-upload-voice";
import VoiceImage from '../../images/Speech-to-text-bro.png';

// Main component
const VoiceCustomization = ({ goNext, goBack }) => {
  const [selectedVoiceData, setSelectedVoiceData] = useState(null);

  const [formData, setFormData] = useState({
    customVoiceUpload: false,
    sampleVoice: true,
    selectedVoice: "",
    customVoiceFile: null
  });
  
  const handleVoiceUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ 
        ...formData, 
        customVoiceFile: file, 
        selectedVoice: "custom" 
      });
    }
  };

  // Handle view voice - update the preview panel
  const handleViewVoice = (voice) => {
    setSelectedVoiceData(voice);
  };

  // Save voice name to sessionStorage when voice is selected
  useEffect(() => {
    if (selectedVoiceData && selectedVoiceData.name) {
      sessionStorage.setItem('selected_voice_name', selectedVoiceData.name);
      console.log("🎤 Voice name saved to sessionStorage:", selectedVoiceData.name);
    }
  }, [selectedVoiceData]);

  return (
    <div className="max-w-7xl mx-auto relative">
      {/* Left Side Image - Fixed position */}
      <div className="hidden lg:block absolute -left-1/4 top-10 z-0">
        <div className="w-64 h-64">
          <img 
            src={VoiceImage} 
            alt="Voice Setup" 
            className="w-full h-full object-contain opacity-70"
          />
        </div>
      </div>
      
      {/* Main Content - Centered */}
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="rounded-[28px] border border-white/60 bg-white/85 backdrop-blur-xl shadow-[0_20px_60px_rgba(96,87,199,0.1)] p-8 md:p-10">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2" style={{ color: '#6A6A6A' }}>Voice Setup</h2>
            <p style={{ color: '#6A6A6A' }}>Choose or upload your AI voice</p>
          </div>

          {/* Voice Options - Tab Switching */}
          <div className="mb-8">
            <div className="flex gap-4 justify-center">
              {/* Sample Voices Tab */}
              <button
                onClick={() => setFormData({
                  ...formData,
                  customVoiceUpload: false,
                  sampleVoice: true
                })}
                className={`px-8 py-4 rounded-full font-semibold text-lg transition-all shadow-md hover:shadow-lg flex items-center gap-3 ${
                  formData.sampleVoice
                    ? "text-white"
                    : "text-gray-600 border-2 border-gray-300 bg-white hover:border-[#6057C7]"
                }`}
                style={formData.sampleVoice
                  ? { backgroundColor: '#6057C7', color: '#F9F5EB' }
                  : {}
                }
                onMouseEnter={(e) => {
                  if (!formData.sampleVoice) {
                    e.currentTarget.style.borderColor = '#6057C7';
                    e.currentTarget.style.backgroundColor = '#f5f3ff';
                  } else {
                    e.currentTarget.style.backgroundColor = '#4f46e5';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!formData.sampleVoice) {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.backgroundColor = 'white';
                  } else {
                    e.currentTarget.style.backgroundColor = '#6057C7';
                  }
                }}
              >
                <PiSpeakerHighBold className="h-5 w-5" />
                <span>Sample Voices</span>
              </button>
        
              {/* Upload Voice Tab */}
              <button
                onClick={() => {
                  setFormData({
                    ...formData,
                    customVoiceUpload: true,
                    sampleVoice: false,
                  });
                }}
                className={`px-8 py-4 rounded-full font-semibold text-lg transition-all shadow-md hover:shadow-lg flex items-center gap-3 ${
                  formData.customVoiceUpload
                    ? "text-white"
                    : "text-gray-600 border-2 border-gray-300 bg-white hover:border-[#6057C7]"
                }`}
                style={formData.customVoiceUpload
                  ? { backgroundColor: '#6057C7', color: '#F9F5EB' }
                  : {}
                }
                onMouseEnter={(e) => {
                  if (!formData.customVoiceUpload) {
                    e.currentTarget.style.borderColor = '#6057C7';
                    e.currentTarget.style.backgroundColor = '#f5f3ff';
                  } else {
                    e.currentTarget.style.backgroundColor = '#4f46e5';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!formData.customVoiceUpload) {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.backgroundColor = 'white';
                  } else {
                    e.currentTarget.style.backgroundColor = '#6057C7';
                  }
                }}
              >
                <HiOutlineUpload className="h-5 w-5" />
                <span>Upload Voice</span>
              </button>
            </div>
          </div>

          {/* Content Section */}
          <div className="space-y-6">
            {/* Voice Preview Panel - Show for sample voices when selected */}
            {formData.sampleVoice && selectedVoiceData && (
              <div className="rounded-2xl p-6 md:p-8 border border-white/60 bg-white/70 backdrop-blur-sm shadow-md">
                <div className="mb-6 pb-4 border-b border-gray-200">
                  <h3 className="text-xl font-semibold mb-2" style={{ color: '#6A6A6A' }}>Preview Your Voice</h3>
                  <p style={{ color: '#6A6A6A' }}>See details about your selected voice</p>
                </div>
                
                <div>
                  <div className="mb-4 flex items-center justify-center gap-4">
                    <div 
                      className="px-6 py-4 rounded-full flex items-center justify-center text-xl font-medium shadow-lg"
                      style={{ backgroundColor: '#6057C7', color: '#F9F5EB' }}
                    >
                      {selectedVoiceData.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold" style={{ color: '#6A6A6A' }}>{selectedVoiceData.name}</h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedVoiceData.category.map((label, idx) => (
                          <span 
                            key={idx} 
                            className="text-xs rounded-full px-3 py-1"
                            style={{ backgroundColor: '#6057C7', color: '#F9F5EB' }}
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {selectedVoiceData.description && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium mb-2" style={{ color: '#6A6A6A' }}>Description</h4>
                      <p style={{ color: '#6A6A6A' }}>{selectedVoiceData.description}</p>
                    </div>
                  )}
                  <audio controls src={selectedVoiceData.audioSrc} className="w-full mt-2 rounded-lg" />
                </div>
              </div>
            )}

            {/* Voice Content */}
            <div className="rounded-2xl p-6 md:p-8 border border-white/60 bg-white/70 backdrop-blur-sm shadow-md">
              {formData.sampleVoice && (
                <SampleVoices onVoiceSelect={setSelectedVoiceData} />
              )}
          
              {formData.customVoiceUpload && (
                <VoiceUploadSystem 
                  formData={formData}
                  setFormData={setFormData}
                  hamdleVoiceUpload={handleVoiceUpload}
                />
              )}
            </div>
          </div>

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
              onClick={goNext}
              className="px-8 py-4 rounded-full font-semibold text-lg transition-all shadow-md hover:shadow-lg"
              style={{ backgroundColor: '#6057C7', color: '#F9F5EB' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#4f46e5';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#6057C7';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Next: Script Generation →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceCustomization;