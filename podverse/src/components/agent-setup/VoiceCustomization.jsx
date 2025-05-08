import { useState } from "react";

const VoiceCustomization = ({ formData, setFormData, goNext, goBack }) => {
  const aiVoices = [
    "Nova (Female - Warm)",
    "Ethan (Male - Friendly)",
    "Lumi (Female - Calm)",
    "Zeno (Male - Energetic)",
    "Echo (Gender-neutral - Neutral)"
  ];

  const [useCustomVoice, setUseCustomVoice] = useState(formData.useCustomVoice || false);

  const handleVoiceUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, customVoiceFile: file, voice: "custom", useCustomVoice: true });
    }
  };

  const handleVoiceSelection = (voice) => {
    setFormData({ ...formData, voice, useCustomVoice: false, customVoiceFile: null });
    setUseCustomVoice(false);
  };

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-semibold text-gray-800">Choose or Upload AI Voice</h2>

      {/* Voice Selection Mode Toggle */}
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="voiceOption"
            checked={!useCustomVoice}
            onChange={() => handleVoiceSelection(formData.voice || "")}
            className="accent-light-purple"
          />
          <span className="text-gray-700">Predefined Voice</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="voiceOption"
            checked={useCustomVoice}
            onChange={() => setUseCustomVoice(true)}
            className="accent-light-purple"
          />
          <span className="text-gray-700">Upload Custom Voice</span>
        </label>
      </div>

      {/* Predefined Voice Selection */}
      {!useCustomVoice && (
        <select
          value={formData.voice}
          onChange={(e) => handleVoiceSelection(e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-2 text-gray-700"
        >
          <option value="">Select Voice</option>
          {aiVoices.map((voice, index) => (
            <option key={index} value={voice}>
              {voice}
            </option>
          ))}
        </select>
      )}

      {/* Custom Voice Upload */}
      {useCustomVoice && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Upload Voice Sample</label>
          <input
            type="file"
            accept="audio/*"
            onChange={handleVoiceUpload}
            className="w-full border border-gray-300 rounded-lg p-2 text-gray-700"
          />
          {formData.customVoiceFile && (
            <p className="text-sm text-green-600">Uploaded: {formData.customVoiceFile.name}</p>
          )}
          <p className="text-xs text-gray-500">Supported formats: .mp3, .wav. Max size: 10MB.</p>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        <button onClick={goBack} className="text-gray-600 hover:underline">
          Back
        </button>
        <button
          onClick={goNext}
          className="bg-light-purple text-white px-5 py-2 rounded-lg hover:bg-purple-700 transition"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default VoiceCustomization;
