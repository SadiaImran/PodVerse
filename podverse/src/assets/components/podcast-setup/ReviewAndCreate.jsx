import { useState } from "react";
import { ArrowLeft, CheckCircle, FileText, Tag, Mic, Database, User, Bot, Briefcase, GraduationCap, MessageSquare, Award, Sparkles, Loader2, PlayCircle } from "lucide-react";
import ReviewImage from '../../images/Podcast-audience-pana.png';

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
    <div className="max-w-7xl mx-auto relative">
      {/* Left Side Image - Fixed position */}
      <div className="hidden lg:block absolute -left-1/4 top-10 z-0">
        <div className="w-64 h-64">
          <img 
            src={ReviewImage} 
            alt="Review & Create" 
            className="w-full h-full object-contain opacity-70"
          />
        </div>
      </div>
      
      {/* Main Content - Centered */}
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="rounded-[28px] border border-white/60 bg-white/85 backdrop-blur-xl shadow-[0_20px_60px_rgba(96,87,199,0.1)] p-8 md:p-10">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: '#6057C7' }}>
                <CheckCircle className="w-7 h-7" style={{ color: '#F9F5EB' }} />
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-1" style={{ color: '#6A6A6A' }}>
                  Review & Create
                </h2>
                <p style={{ color: '#6A6A6A' }}>Review your podcast configuration before creating</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Project Details Review */}
            <div className="rounded-2xl p-6 border border-white/60 bg-white/70 backdrop-blur-sm shadow-md">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#6057C7' }}>
                  <FileText className="w-6 h-6" style={{ color: '#F9F5EB' }} />
                </div>
                <h3 className="text-xl font-semibold" style={{ color: '#6A6A6A' }}>Project Details</h3>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9fafb' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <PlayCircle className="w-4 h-4" style={{ color: '#6057C7' }} />
                    <p className="text-sm font-medium" style={{ color: '#6A6A6A' }}>Podcast Name</p>
                  </div>
                  <p className="font-semibold text-base" style={{ color: '#1C1C1C' }}>{formData.podcastName}</p>
                </div>
                
                <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9fafb' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4" style={{ color: '#6057C7' }} />
                    <p className="text-sm font-medium" style={{ color: '#6A6A6A' }}>Description</p>
                  </div>
                  <p className="text-sm" style={{ color: '#1C1C1C' }}>{formData.description}</p>
                </div>
                
                <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9fafb' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-4 h-4" style={{ color: '#6057C7' }} />
                    <p className="text-sm font-medium" style={{ color: '#6A6A6A' }}>Tags</p>
                  </div>
                  {formData.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-3 py-1.5 rounded-full text-sm font-medium shadow-sm"
                          style={{ backgroundColor: '#6057C7', color: '#F9F5EB' }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm italic" style={{ color: '#ef4444' }}>No tags added</p>
                  )}
                </div>
              </div>
            </div>

            {/* AI Speaker Review */}
            <div className="rounded-2xl p-6 border border-white/60 bg-white/70 backdrop-blur-sm shadow-md">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#6057C7' }}>
                  {formData.speakerType === "ai-host" ? (
                    <Bot className="w-6 h-6" style={{ color: '#F9F5EB' }} />
                  ) : (
                    <User className="w-6 h-6" style={{ color: '#F9F5EB' }} />
                  )}
                </div>
                <h3 className="text-xl font-semibold" style={{ color: '#6A6A6A' }}>AI Speaker</h3>
              </div>
            
              {formData.speakerType === "ai-host" ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-xl" style={{ backgroundColor: '#f9fafb' }}>
                    <img
                      src={formData.avatar}
                      alt="Avatar"
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-offset-2"
                      style={{ ringColor: '#6057C7' }}
                    />
                    <div>
                      <p className="font-semibold text-base" style={{ color: '#1C1C1C' }}>{formData.agentName}</p>
                      <p className="text-sm" style={{ color: '#6A6A6A' }}>AI Host • {formData.tone} tone</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
                      <p className="text-xs mb-1" style={{ color: '#6A6A6A' }}>Type</p>
                      <p className="font-medium text-sm" style={{ color: '#1C1C1C' }}>AI Host</p>
                    </div>
                    <div className="p-3 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
                      <p className="text-xs mb-1" style={{ color: '#6A6A6A' }}>Tone</p>
                      <p className="font-medium text-sm capitalize" style={{ color: '#1C1C1C' }}>{formData.tone}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-xl" style={{ backgroundColor: '#f9fafb' }}>
                    <img
                      src={formData.avatar}
                      alt="Avatar"
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-offset-2"
                      style={{ ringColor: '#6057C7' }}
                    />
                    <div>
                      <p className="font-semibold text-base" style={{ color: '#1C1C1C' }}>{formData.guestPersona.name}</p>
                      <p className="text-sm" style={{ color: '#6A6A6A' }}>AI Guest • {formData.guestPersona.tone} tone</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <Briefcase className="w-4 h-4" style={{ color: '#6057C7' }} />
                        <p className="text-xs font-medium" style={{ color: '#6A6A6A' }}>Role</p>
                      </div>
                      <p className="font-medium text-sm" style={{ color: '#1C1C1C' }}>{formData.guestPersona.role}</p>
                    </div>
                    <div className="p-3 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <GraduationCap className="w-4 h-4" style={{ color: '#6057C7' }} />
                        <p className="text-xs font-medium" style={{ color: '#6A6A6A' }}>Background</p>
                      </div>
                      <p className="font-medium text-sm" style={{ color: '#1C1C1C' }}>{formData.guestPersona.background}</p>
                    </div>
                    <div className="p-3 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="w-4 h-4" style={{ color: '#6057C7' }} />
                        <p className="text-xs font-medium" style={{ color: '#6A6A6A' }}>Communication Style</p>
                      </div>
                      <p className="font-medium text-sm" style={{ color: '#1C1C1C' }}>{formData.guestPersona.style}</p>
                    </div>
                    {formData.guestPersona.expertise.length > 0 && (
                      <div className="p-3 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <Award className="w-4 h-4" style={{ color: '#6057C7' }} />
                          <p className="text-xs font-medium" style={{ color: '#6A6A6A' }}>Expertise</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {formData.guestPersona.expertise.map((exp, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 rounded-full text-xs font-medium"
                              style={{ backgroundColor: '#6057C7', color: '#F9F5EB' }}
                            >
                              {exp}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Knowledge Base Review */}
            <div className="rounded-2xl p-6 border border-white/60 bg-white/70 backdrop-blur-sm shadow-md">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#6057C7' }}>
                  <Database className="w-6 h-6" style={{ color: '#F9F5EB' }} />
                </div>
                <h3 className="text-xl font-semibold" style={{ color: '#6A6A6A' }}>Knowledge Base</h3>
              </div>
              
              {(() => {
                const kbInfo = localStorage.getItem('selectedKnowledgeBase');
                if (kbInfo) {
                  const kb = JSON.parse(kbInfo);
                  return (
                    <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9fafb' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#6057C7' }}>
                          <FileText className="w-5 h-5" style={{ color: '#F9F5EB' }} />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm" style={{ color: '#1C1C1C' }}>
                            {kb.type === 'new' ? kb.fileName :
                             kb.type === 'url' ? 'URL Knowledge Base' :
                             kb.fileName}
                          </p>
                          <p className="text-xs mt-1" style={{ color: '#6A6A6A' }}>
                            {kb.type === 'new' ? 'Uploaded Document' :
                             kb.type === 'url' ? `URL: ${kb.url}` :
                             'Existing Knowledge Base'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="p-4 rounded-xl text-center" style={{ backgroundColor: '#f9fafb' }}>
                      <p className="text-sm italic" style={{ color: '#6A6A6A' }}>No knowledge base configured</p>
                    </div>
                  );
                }
              })()}
            </div>

            {/* Voice Setup Review */}
            <div className="rounded-2xl p-6 border border-white/60 bg-white/70 backdrop-blur-sm shadow-md">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#6057C7' }}>
                  <Mic className="w-6 h-6" style={{ color: '#F9F5EB' }} />
                </div>
                <h3 className="text-xl font-semibold" style={{ color: '#6A6A6A' }}>Voice Setup</h3>
              </div>
              
              {(() => {
                const voiceName = sessionStorage.getItem('selected_voice_name') || 'Sample voice selected';
                return (
                  <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9fafb' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#6057C7' }}>
                        <Mic className="w-5 h-5" style={{ color: '#F9F5EB' }} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm" style={{ color: '#1C1C1C' }}>
                          {voiceName}
                        </p>
                        <p className="text-xs mt-1" style={{ color: '#6A6A6A' }}>
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
          <div className="mt-8 rounded-2xl p-8 shadow-lg" style={{ background: 'linear-gradient(135deg, #6057C7 0%, #8f7bff 50%, #a78bfa 100%)' }}>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4 backdrop-blur-sm">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">Ready to Create Your Podcast!</h3>
              <p className="text-white/90 text-base max-w-2xl mx-auto">
                Your podcast is perfectly configured and ready to go. Click "Create Podcast" to start recording 
                with your AI speaker and begin your amazing podcast journey.
              </p>
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
              onClick={handleCreatePodcast}
              disabled={isCreating}
              className="px-10 py-4 rounded-full font-bold text-lg transition-all flex items-center gap-3 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={
                isCreating
                  ? { backgroundColor: '#e5e7eb', color: '#9ca3af' }
                  : { backgroundColor: '#6057C7', color: '#F9F5EB' }
              }
              onMouseEnter={(e) => {
                if (!isCreating) {
                  e.currentTarget.style.backgroundColor = '#4f46e5';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isCreating) {
                  e.currentTarget.style.backgroundColor = '#6057C7';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Creating Your Podcast...
                </>
              ) : (
                <>
                  <CheckCircle className="w-6 h-6" />
                  Create Podcast
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewAndCreate;
