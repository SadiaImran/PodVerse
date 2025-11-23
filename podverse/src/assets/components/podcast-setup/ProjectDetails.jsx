import { useState } from "react";
import ProjectImage from '../../images/Speech-to-text-pana.png';
import ProjectImage2 from '../../images/Podcast-audience-pana.png';
import { Plus, X, Tag, Podcast } from "lucide-react";

const ProjectDetails = ({ formData, setFormData, goNext }) => {
  const [newTag, setNewTag] = useState("");

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
                     formData.tags.length > 0;

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
        <div className="rounded-[28px] border border-white/60 bg-white/85 backdrop-blur-xl shadow-[0_20px_60px_rgba(96,87,199,0.1)] p-8 md:p-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2" style={{ color: '#1C1C1C' }}>Project Details</h2>
          <p style={{ color: '#6A6A6A' }}>Tell us about your podcast episode</p>
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

          {/* Tags */}
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-3">
              Tags *
            </label>
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Add at least one tag to categorize your podcast"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full border-2 border-gray-300 rounded-xl p-4 pl-12 text-lg focus:outline-none focus:ring-2 focus:ring-light-purple focus:border-transparent transition-all"
                  />
                </div>
                <button
                  onClick={addTag}
                  className="px-6 py-4 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                  style={{ backgroundColor: '#6057C7', color: '#F9F5EB' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#4f46e5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#6057C7';
                  }}
                >
                  <Plus className="w-5 h-5" />
                  Add
                </button>
              </div>
              
              {/* Display Tags */}
              {formData.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 rounded-full text-sm flex items-center gap-2 shadow-sm"
                      style={{ backgroundColor: '#6057C7', color: '#F9F5EB' }}
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="rounded-full p-1 transition-colors hover:opacity-80"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm italic" style={{ color: '#ef4444' }}>
                  Please add at least one tag (required)
                </p>
              )}
            </div>
          </div>
        </div>

          {/* Next Button */}
          <div className="flex justify-end mt-8">
            <button
              onClick={goNext}
              disabled={!isFormValid}
              className="px-8 py-4 rounded-full font-semibold text-lg transition-all shadow-md hover:shadow-lg"
              style={
                isFormValid
                  ? { backgroundColor: '#6057C7', color: '#F9F5EB' }
                  : { backgroundColor: '#e5e7eb', color: '#9ca3af', cursor: 'not-allowed' }
              }
              onMouseEnter={(e) => {
                if (isFormValid) {
                  e.currentTarget.style.backgroundColor = '#4f46e5';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (isFormValid) {
                  e.currentTarget.style.backgroundColor = '#6057C7';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
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
