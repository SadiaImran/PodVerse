import { useState } from "react";
import { ArrowLeft, Sparkles, BookOpen, Zap, FileText, Clock, CheckCircle, Wand2, Brain, PlayCircle, SkipForward, AlertCircle, Loader2 } from "lucide-react";
import axios from "axios";
import { getSupabaseAuthorizedtoken } from "../../supabaseClient";
import ScriptImage from '../../images/Speech-to-text-pana.png';

const ScriptGeneration = ({ formData, goNext, goBack }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [scriptGenerated, setScriptGenerated] = useState(false);

  const handleGenerateScript = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const token = await getSupabaseAuthorizedtoken();
      if (!token) {
        throw new Error("Authentication required");
      }

      // Get KB_ID from session storage
      const kb_id = sessionStorage.getItem('current_kb_id');
      
      if (!kb_id) {
        console.warn("⚠️ No kb_id found - will use all user documents");
      } else {
        console.log("✅ Using kb_id for script generation:", kb_id);
      }

      const formDataToSend = new FormData();
      formDataToSend.append('role', formData.speakerType === "ai-host" ? "host" : "guest");
      formDataToSend.append('topic', formData.podcastName || '');
      formDataToSend.append('agent_name', formData.speakerType === "ai-host" ? formData.agentName : formData.guestPersona.name);
      
      // Add KB_ID to request
      if (kb_id) {
        formDataToSend.append('kb_id', kb_id);
      }

      const response = await axios.post(
        'http://localhost:8000/generate-podcast-script/',
        formDataToSend,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        }
      );

      if (response.data.success) {
        sessionStorage.setItem('podcastScript', JSON.stringify(response.data));
        setScriptGenerated(true);
        console.log("✅ Script generated successfully:", response.data);
      } else {
        setError(response.data.message || "Failed to generate script");
      }
    } catch (err) {
      console.error("Script generation error:", err);
      setError(err.response?.data?.detail || err.message || "Failed to generate script");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSkipScript = () => {
    sessionStorage.removeItem('podcastScript');
    goNext();
  };

  // Get knowledge base info for display
  const kbInfo = JSON.parse(localStorage.getItem('selectedKnowledgeBase') || '{}');
  const documentName = kbInfo.fileName || kbInfo.url || "Not selected";

  return (
    <div className="max-w-7xl mx-auto relative">
      {/* Left Side Image - Fixed position */}
      <div className="hidden lg:block absolute -left-1/4 top-10 z-0">
        <div className="w-64 h-64">
          <img 
            src={ScriptImage} 
            alt="Script Generation" 
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
                <Wand2 className="w-7 h-7" style={{ color: '#F9F5EB' }} />
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-1" style={{ color: '#6A6A6A' }}>Script Generation</h2>
                <p style={{ color: '#6A6A6A' }}>Generate a professional podcast script using AI</p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Script Generation Section */}
            <div className="rounded-2xl p-6 md:p-8 border border-white/60" style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(10px)' }}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Main Generation (2/3 width) */}
                <div className="lg:col-span-2">
                  <div className="flex items-center gap-3 mb-4">
                    <Brain className="w-7 h-7" style={{ color: '#6057C7' }} />
                    <h3 className="text-2xl font-bold" style={{ color: '#6A6A6A' }}>AI Script Generation</h3>
                  </div>
                  <p className="mb-6 text-lg font-medium" style={{ color: '#6057C7' }}>Powered by your knowledge base</p>

                  {/* Description Cards */}
                  <div className="space-y-4 mb-8">
                    <div className="flex items-start gap-4 p-4 rounded-xl border border-white/60" style={{ backgroundColor: 'rgba(245, 243, 255, 0.5)' }}>
                      <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#6057C7' }}>
                        <BookOpen className="w-6 h-6" style={{ color: '#F9F5EB' }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-semibold mb-1" style={{ color: '#6A6A6A' }}>Based on:</p>
                        <p className="text-base font-medium" style={{ color: '#6057C7' }}>{documentName}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 rounded-xl border border-white/60" style={{ backgroundColor: 'rgba(245, 243, 255, 0.5)' }}>
                      <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#6057C7' }}>
                        <PlayCircle className="w-6 h-6" style={{ color: '#F9F5EB' }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-semibold mb-1" style={{ color: '#6A6A6A' }}>Available in:</p>
                        <p className="text-base" style={{ color: '#6A6A6A' }}>Recording panel's Script tab</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 rounded-xl border border-white/60" style={{ backgroundColor: 'rgba(245, 243, 255, 0.5)' }}>
                      <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#6057C7' }}>
                        <Clock className="w-6 h-6" style={{ color: '#F9F5EB' }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-semibold mb-1" style={{ color: '#6A6A6A' }}>Generation time:</p>
                        <p className="text-base" style={{ color: '#6A6A6A' }}>10-15 seconds</p>
                      </div>
                    </div>
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={handleGenerateScript}
                    disabled={isGenerating || scriptGenerated}
                    className="w-full px-8 py-4 rounded-full font-semibold text-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={isGenerating || scriptGenerated
                      ? { backgroundColor: '#6057C7', color: '#F9F5EB' }
                      : { backgroundColor: '#6057C7', color: '#F9F5EB' }
                    }
                    onMouseEnter={(e) => {
                      if (!isGenerating && !scriptGenerated) {
                        e.currentTarget.style.backgroundColor = '#4f46e5';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isGenerating && !scriptGenerated) {
                        e.currentTarget.style.backgroundColor = '#6057C7';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Generating Script...</span>
                      </>
                    ) : scriptGenerated ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        <span>Script Generated Successfully!</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>Generate Script</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Right Column - Info & Skip (1/3 width) */}
                <div className="space-y-6">
                  {/* Info Card */}
                  <div className="rounded-xl p-6 border border-white/60" style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(10px)' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="w-5 h-5" style={{ color: '#6057C7' }} />
                      <h4 className="font-semibold text-lg" style={{ color: '#6A6A6A' }}>About Script Generation</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f5f3ff' }}>
                          <FileText className="w-4 h-4" style={{ color: '#6057C7' }} />
                        </div>
                        <p className="text-sm pt-1" style={{ color: '#6A6A6A' }}>Creates structured conversation flow</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f5f3ff' }}>
                          <Zap className="w-4 h-4" style={{ color: '#6057C7' }} />
                        </div>
                        <p className="text-sm pt-1" style={{ color: '#6A6A6A' }}>Based on your knowledge base content</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f5f3ff' }}>
                          <CheckCircle className="w-4 h-4" style={{ color: '#6057C7' }} />
                        </div>
                        <p className="text-sm pt-1" style={{ color: '#6A6A6A' }}>Professional podcast quality</p>
                      </div>
                    </div>
                  </div>

                  {/* Skip Option */}
                  <div className="rounded-xl p-6 border border-white/60 text-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(10px)' }}>
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <SkipForward className="w-5 h-5" style={{ color: '#6057C7' }} />
                      <h4 className="font-semibold text-lg" style={{ color: '#6A6A6A' }}>Skip Script Generation</h4>
                    </div>
                    <p className="text-sm mb-4" style={{ color: '#6A6A6A' }}>You can always generate a script later during recording</p>
                    <button
                      onClick={handleSkipScript}
                      className="px-4 py-2 rounded-full font-medium transition-all text-sm"
                      style={{ color: '#6057C7', backgroundColor: '#f5f3ff' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#e9e5ff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f5f3ff';
                      }}
                    >
                      Continue Without Script
                    </button>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mt-6 p-4 rounded-xl border-l-4 flex items-start gap-3" style={{ backgroundColor: '#fef2f2', borderColor: '#ef4444' }}>
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: '#991b1b' }}>Generation Failed</p>
                    <p className="text-sm" style={{ color: '#dc2626' }}>{error}</p>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {scriptGenerated && (
                <div className="mt-6 p-4 rounded-xl border-l-4 flex items-start gap-3" style={{ backgroundColor: '#f0fdf4', borderColor: '#22c55e' }}>
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#22c55e' }} />
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: '#166534' }}>Script Generated Successfully!</p>
                    <p className="text-sm" style={{ color: '#16a34a' }}>Ready for recording in the recording panel</p>
                  </div>
                </div>
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
              disabled={!scriptGenerated}
              className="px-8 py-4 rounded-full font-semibold text-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={scriptGenerated
                ? { backgroundColor: '#6057C7', color: '#F9F5EB' }
                : { backgroundColor: '#e5e7eb', color: '#9ca3af' }
              }
              onMouseEnter={(e) => {
                if (scriptGenerated) {
                  e.currentTarget.style.backgroundColor = '#4f46e5';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (scriptGenerated) {
                  e.currentTarget.style.backgroundColor = '#6057C7';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              Next: Review & Create →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScriptGeneration;
