import { useState } from "react";
import { IoMdArrowRoundBack } from "react-icons/io";
import { HiOutlineCheck, HiOutlineDocument, HiOutlineClock, HiOutlineTag } from "react-icons/hi";
import { RiRobot3Fill, RiUserLine } from "react-icons/ri";

const ReviewAndCreate = ({ formData, goBack, onCreatePodcast }) => {
  const [isCreating, setIsCreating] = useState(false);

  const handleCreatePodcast = async () => {
    setIsCreating(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsCreating(false);
    onCreatePodcast();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-2xl border border-gray-200 p-8">
        {/* Header - Left Aligned */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-light-purple to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <HiOutlineCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-light-purple to-purple-600 bg-clip-text text-transparent">
                Review & Create
              </h2>
              <p className="text-gray-600">Review your podcast configuration before creating</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Project Details Review */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-200 shadow-lg">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <HiOutlineDocument className="w-5 h-5 text-white" />
              </div>
              Project Details
            </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Podcast Name</p>
                  <p className="font-medium text-gray-800">{formData.podcastName}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Episode</p>
                  <p className="font-medium text-gray-800">{formData.episodeNumber}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="font-medium text-gray-800 flex items-center gap-1">
                    <HiOutlineClock className="w-4 h-4" />
                    {formData.duration} minutes
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Description</p>
                  <p className="font-medium text-gray-800">{formData.description}</p>
                </div>
              </div>
              
              {formData.tags.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2 flex items-center gap-1">
                    <HiOutlineTag className="w-4 h-4" />
                    Tags
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="bg-gradient-to-r from-light-purple to-purple-600 text-white px-3 py-1 rounded-full text-sm shadow-md"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
          </div>

          {/* AI Speaker Review */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-200 shadow-lg">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                {formData.speakerType === "ai-host" ? (
                  <RiRobot3Fill className="w-5 h-5 text-white" />
                ) : (
                  <RiUserLine className="w-5 h-5 text-white" />
                )}
              </div>
              AI Speaker Configuration
            </h3>
            
            {formData.speakerType === "ai-host" ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <img
                    src={formData.avatar}
                    alt="Avatar"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-medium text-gray-800">{formData.agentName}</p>
                    <p className="text-sm text-gray-600">AI Host • {formData.tone} tone</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Speaker Type</p>
                    <p className="font-medium text-gray-800">AI Host</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Tone</p>
                    <p className="font-medium text-gray-800 capitalize">{formData.tone}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <img
                    src={formData.avatar}
                    alt="Avatar"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-medium text-gray-800">{formData.guestPersona.name}</p>
                    <p className="text-sm text-gray-600">AI Guest • {formData.guestPersona.tone} tone</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Guest Name</p>
                    <p className="font-medium text-gray-800">{formData.guestPersona.name}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Role</p>
                    <p className="font-medium text-gray-800">{formData.guestPersona.role}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Background</p>
                    <p className="font-medium text-gray-800">{formData.guestPersona.background}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Communication Style</p>
                    <p className="font-medium text-gray-800">{formData.guestPersona.style}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Tone</p>
                    <p className="font-medium text-gray-800 capitalize">{formData.guestPersona.tone}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Expertise</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.guestPersona.expertise.map((exp, index) => (
                        <span
                          key={index}
                          className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm"
                        >
                          {exp}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Knowledge Base Review */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-8 border border-orange-200 shadow-lg">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <HiOutlineDocument className="w-5 h-5 text-white" />
              </div>
              Knowledge Base
            </h3>
            
            {(() => {
              const kbInfo = localStorage.getItem('selectedKnowledgeBase');
              if (kbInfo) {
                const kb = JSON.parse(kbInfo);
                return (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Knowledge base configured
                    </p>
            <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
              <span className="text-2xl">📄</span>
              <div className="flex-1">
                <p className="font-medium text-gray-800">
                  {kb.type === 'new' ? kb.fileName :
                   kb.type === 'url' ? 'URL Knowledge Base' :
                   kb.fileName}
                </p>
                <p className="text-sm text-gray-500">
                  {kb.type === 'new' ? 'Uploaded Document' :
                   kb.type === 'url' ? `URL: ${kb.url}` :
                   'Existing Knowledge Base'}
                </p>
              </div>
            </div>
                  </div>
                );
              } else {
                return <p className="text-gray-500 italic">No knowledge base configured</p>;
              }
            })()}
          </div>

          {/* Voice Setup Review */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-200 shadow-lg">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <HiOutlineDocument className="w-5 h-5 text-white" />
              </div>
              Voice Setup
            </h3>
            
            {(() => {
              const voiceInfo = localStorage.getItem('selectedVoice') || 'Sample voice selected';
              return (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Voice configuration
                  </p>
                  <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
                    <span className="text-2xl">🎤</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">
                        {voiceInfo}
                      </p>
                      <p className="text-sm text-gray-500">
                        Voice ready for podcast
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Summary Section */}
        <div className="mt-8 bg-gradient-to-r from-light-purple via-purple-600 to-indigo-600 rounded-2xl p-8 text-white shadow-2xl">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
              <HiOutlineCheck className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Ready to Create Your Podcast!</h3>
            <p className="text-purple-100 text-lg max-w-2xl mx-auto">
              Your podcast is perfectly configured and ready to go. Click "Create Podcast" to start recording 
              with your AI speaker and begin your amazing podcast journey.
            </p>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-8">
          <button 
            onClick={goBack}
            className="text-light-purple font-medium text-3xl hover:underline transition-all hover:scale-110"
          >
            <IoMdArrowRoundBack />
          </button>
          <button
            onClick={handleCreatePodcast}
            disabled={isCreating}
            className={`px-10 py-4 rounded-2xl font-bold text-lg transition-all flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105 ${
              isCreating
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-light-purple to-purple-600 text-white hover:from-purple-600 hover:to-indigo-600'
            }`}
          >
            {isCreating ? (
              <>
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating Your Podcast...
              </>
            ) : (
              <>
                <HiOutlineCheck className="w-6 h-6" />
                Create Podcast
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewAndCreate;
