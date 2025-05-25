import { BsPlayFill } from "react-icons/bs";
import { useState, useRef, useEffect } from "react";
import { IoMdArrowRoundBack } from "react-icons/io";
import { PiSpeakerHighBold } from "react-icons/pi";
import { HiOutlineUpload } from "react-icons/hi";

import SampleVoices from "./agent-voice-setup/agent-sample-voice";
import UploadVoices from "./agent-voice-setup/agent-upload-voice";

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

  return (
    <div className="flex flex-col md:flex-row gap-8">
      <div className="space-y-5 flex flex-col justify-between flex-[2] bg-white p-6 rounded-3xl shadow-md border-2 border-gray-300">
        <h2 className="text-2xl font-semibold text-gray-800">Choose or Upload AI Voice</h2>
        
        {/* Voice Selection Mode Toggle */}
        <div className="space-y-3 font-medium w-full">
          <div className="flex flex-col md:flex-row gap-4 w-full">
            
            {/* Use Sample Voice */}
            <div
              onClick={() => setFormData({
                ...formData,
                customVoiceUpload: false,
                sampleVoice: true
              })}
              className={`flex-1 cursor-pointer p-4 border rounded-lg transition-all ${
                formData.sampleVoice
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-blue-300"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 bg-blue-100 text-blue-600 p-2 rounded-full">
                  <PiSpeakerHighBold className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-medium text-lg">Use Sample Voices</h4>
                  <p className="text-gray-600 text-sm">Choose from our collection of high-quality voice samples.</p>
                </div>
              </div>
            </div>
      
            {/* Custom Upload */}
            <div
              onClick={() => setFormData({
                ...formData,
                customVoiceUpload: true,
                sampleVoice: false
              })}
              className={`flex-1 cursor-pointer p-4 border rounded-lg transition-all ${
                formData.customVoiceUpload
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-200 hover:border-purple-300"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 bg-purple-100 text-purple-600 p-2 rounded-full">
                  <HiOutlineUpload className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-medium text-lg">Upload Your Voice</h4>
                  <p className="text-gray-600 text-sm">Clone your own voice for a personalized experience.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Display appropriate content based on selection */}
        <div className="w-full">
          {formData.sampleVoice && (
            <SampleVoices onVoiceSelect={setSelectedVoiceData}  />
          )}
      
          {formData.customVoiceUpload && (
  
            <UploadVoices 
              formData={formData}
              setFormData={setFormData}
              hamdleVoiceUpload={handleVoiceUpload}
            >
            </UploadVoices>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 w-full">
          <button onClick={goBack} className="text-light-purple font-medium text-3xl hover:underline">
            <IoMdArrowRoundBack />
          </button>
          <button
            onClick={goNext}
            className="bg-light-purple text-white px-8 py-2 rounded-xl transition hover:text-gray-800 hover:border-2 hover:border-light-purple hover:bg-white font-semibold"
          >
            Next
          </button>
        </div>
      </div>
      {
       formData.sampleVoice && (
        <div className="flex bg-white p-6 rounded-xl shadow-md border border-gray-100 flex-[1] h-full overflow-auto ">
          {/* Voice Preview */}
      <div className="flex flex-col w-full"> 
        <div className="bg-indigo-50 p-4 border-b border-gray-100">
          <h3 className="font-semibold text-xl text-gray-800">Preview Your Voice</h3>
          <p className="text-base text-gray-500">See details about your selected voice</p>
        </div>
        
        {selectedVoiceData ? (
              <div className="p-6">
                <div className="mb-4 flex items-center justify-center gap-4">
                  <div className={`px-6 py-4 rounded-full ${selectedVoiceData.color} ${selectedVoiceData.textColor} flex items-center justify-center text-xl font-medium`}>
                    {selectedVoiceData.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{selectedVoiceData.name}</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedVoiceData.category.map((label, idx) => (
                        <span key={idx} className="text-xs bg-gray-100 rounded-full px-3 py-1">{label}</span>
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
                <audio controls src={selectedVoiceData.audioSrc} className="w-full mt-2" />
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <PiSpeakerHighBold className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>Select a voice to see its details</p>
              </div>
            )}
          </div>
        </div>
       )
      }

    </div>
  );
};

export default VoiceCustomization;