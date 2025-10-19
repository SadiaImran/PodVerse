import { useState } from "react";
import ProjectImage from '../../images/Speech-to-text-pana.png';
import ProjectImage2 from '../../images/Podcast-audience-pana.png';
import { Plus, X, Clock, Hash, Tag, Podcast } from "lucide-react";

const ProjectDetails = ({ formData, setFormData, goNext }) => {
  const [newTag, setNewTag] = useState("");

  const durationOptions = [
    { value: "5", label: "5 minutes" },
    { value: "10", label: "10 minutes" },
    { value: "15", label: "15 minutes" },
    { value: "20", label: "20 minutes" },
    { value: "30", label: "30 minutes" },
    { value: "45", label: "45 minutes" },
    { value: "60", label: "1 hour" }
  ];

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()]
      });
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const isFormValid = formData.podcastName.trim() && 
                     formData.description.trim() && 
                     formData.episodeNumber.trim();

  return (
    <div className="max-w-6xl mx-auto relative">
      {/* Left Side Image - Fixed position */}
      <div className="hidden lg:block absolute -left-1/3 top-1/3 transform -translate-y-1/2 z-0">
        <div className="w-1/3 h-full">
          <img 
            src={ProjectImage} 
            alt="Podcast Creation" 
            className="w-full h-full object-fill"
          />
        </div>
      </div>
      
      {/* Main Content - Centered */}
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Project Details</h2>
          <p className="text-gray-600">Tell us about your podcast episode</p>
        </div>

        <div className="space-y-8">
          {/* Podcast Name */}
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-3">
              Podcast Name *
            </label>
            <input
              type="text"
              placeholder="e.g., Daily Conversations, Help Me Grow, Tech Talk"
              value={formData.podcastName}
              onChange={(e) => setFormData({ ...formData, podcastName: e.target.value })}
              className="w-full border-2 border-gray-300 rounded-xl p-4 text-lg focus:outline-none focus:ring-2 focus:ring-light-purple focus:border-transparent transition-all relative z-20"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-3">
              Description *
            </label>
            <textarea
              placeholder="Describe what this episode will be about..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full border-2 border-gray-300 rounded-xl p-4 text-lg focus:outline-none focus:ring-2 focus:ring-light-purple focus:border-transparent transition-all resize-none relative z-20"
            />
          </div>

          {/* Episode Number */}
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-3">
              Episode Number *
            </label>
            <div className="relative">
              <Hash className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="e.g., Episode 1, Season 2 Episode 5"
                value={formData.episodeNumber}
                onChange={(e) => setFormData({ ...formData, episodeNumber: e.target.value })}
                className="w-full border-2 border-gray-300 rounded-xl p-4 pl-12 text-lg focus:outline-none focus:ring-2 focus:ring-light-purple focus:border-transparent transition-all relative z-20"
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-3">
              Expected Duration
            </label>
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="w-full border-2 border-gray-300 rounded-xl p-4 pl-12 text-lg focus:outline-none focus:ring-2 focus:ring-light-purple focus:border-transparent transition-all appearance-none bg-white"
              >
                {durationOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-3">
              Tags (Optional)
            </label>
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Add tags to categorize your podcast"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full border-2 border-gray-300 rounded-xl p-4 pl-12 text-lg focus:outline-none focus:ring-2 focus:ring-light-purple focus:border-transparent transition-all"
                  />
                </div>
                <button
                  onClick={addTag}
                  className="bg-light-purple text-white px-6 py-4 rounded-xl hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add
                </button>
              </div>
              
              {/* Display Tags */}
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-light-purple text-white px-4 py-2 rounded-full text-sm flex items-center gap-2"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:bg-purple-700 rounded-full p-1 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

          {/* Next Button */}
          <div className="flex justify-end mt-8">
            <button
              onClick={goNext}
              disabled={!isFormValid}
              className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all ${
                isFormValid
                  ? 'bg-light-purple text-white hover:bg-purple-700 hover:shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Next: AI Speaker Setup →
            </button>
          </div>
        </div>
      </div>
     
    </div>
  );
};

export default ProjectDetails;
