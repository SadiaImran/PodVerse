import { BsPlayFill } from "react-icons/bs";
import { useState, useRef, useEffect } from "react";
import { IoMdArrowRoundBack } from "react-icons/io";
import { PiSpeakerHighBold } from "react-icons/pi";
import { HiOutlineUpload } from "react-icons/hi";

import SampleVoices from "./agent-voice-setup/agent-sample-voice";
import VoiceUploadSystem from "./agent-voice-setup/agent-upload-voice";

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
    <div className="max-w-7xl mx-auto">
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-2xl border border-gray-200 p-8">
        {/* Header - Left Aligned */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-light-purple to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <PiSpeakerHighBold className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-light-purple to-purple-600 bg-clip-text text-transparent">
                Voice Setup
              </h2>
              <p className="text-gray-600">Choose or upload your AI voice</p>
            </div>
          </div>
        </div>

        {/* Voice Options - Top Section */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Choose Voice Option</h3>
          <div className="flex gap-4 justify-center">
            {/* Use Sample Voice */}
            <button
              onClick={() => setFormData({
                ...formData,
                customVoiceUpload: false,
                sampleVoice: true
              })}
              className={`px-6 py-3 rounded-xl transition-all border-2 ${
                formData.sampleVoice
                  ? "border-blue-500 bg-blue-500 text-white shadow-md"
                  : "border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <PiSpeakerHighBold className="h-5 w-5" />
                <span className="font-medium">Sample Voices</span>
              </div>
            </button>
      
            {/* Custom Upload */}
            <button
              onClick={() => {
                setFormData({
                  ...formData,
                  customVoiceUpload: true,
                  sampleVoice: false,
                });
                console.log("FormData after clicking Upload Your Voice:", formData);
              }}
              className={`px-6 py-3 rounded-xl transition-all border-2 ${
                formData.customVoiceUpload
                  ? "border-purple-500 bg-purple-500 text-white shadow-md"
                  : "border-gray-300 bg-white text-gray-700 hover:border-purple-400 hover:bg-purple-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <HiOutlineUpload className="h-5 w-5" />
                <span className="font-medium">Upload Voice</span>
              </div>
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="space-y-6">
          {/* Voice Preview Panel - Show for sample voices when selected */}
          {formData.sampleVoice && selectedVoiceData && (
            <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl shadow-lg border border-gray-200">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 rounded-t-xl -m-6 mb-6">
                <h3 className="font-semibold text-xl text-white">Preview Your Voice</h3>
                <p className="text-indigo-100">See details about your selected voice</p>
              </div>
              
              <div>
                <div className="mb-4 flex items-center justify-center gap-4">
                  <div className={`px-6 py-4 rounded-full ${selectedVoiceData.color} ${selectedVoiceData.textColor} flex items-center justify-center text-xl font-medium shadow-lg`}>
                    {selectedVoiceData.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">{selectedVoiceData.name}</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedVoiceData.category.map((label, idx) => (
                        <span key={idx} className="text-xs bg-gradient-to-r from-light-purple to-purple-600 text-white rounded-full px-3 py-1">{label}</span>
                      ))}
                    </div>
                  </div>
                </div>
                {selectedVoiceData.description && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                    <p className="text-gray-600">{selectedVoiceData.description}</p>
                  </div>
                )}
                <audio controls src={selectedVoiceData.audioSrc} className="w-full mt-2 rounded-lg" />
              </div>
            </div>
          )}

          {/* Voice Content */}
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
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
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
          <button onClick={goBack} className="text-light-purple font-medium text-3xl hover:underline transition-all hover:scale-110">
            <IoMdArrowRoundBack />
          </button>
          <button
            onClick={goNext}
            className="bg-gradient-to-r from-light-purple to-purple-600 text-white px-8 py-3 rounded-xl transition-all hover:from-purple-600 hover:to-indigo-600 hover:shadow-lg font-semibold transform hover:scale-105"
          >
            Next: Script Generation →
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceCustomization;