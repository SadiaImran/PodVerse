import { useState } from "react";
import { IoMdArrowRoundBack } from "react-icons/io";
import { Sparkles, BookOpen, Zap, FileText, Clock, CheckCircle } from "lucide-react";
import axios from "axios";
import { getSupabaseAuthorizedtoken } from "../../supabaseClient";

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
    <div className="max-w-5xl mx-auto">
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-2xl border border-gray-200 p-8">
        {/* Header - Left Aligned */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-light-purple to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-light-purple to-purple-600 bg-clip-text text-transparent">
                Script Generation
              </h2>
              <p className="text-gray-600">Generate a professional podcast script using AI</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Script Generation Section */}
          <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-purple-50 rounded-2xl p-8 border-2 border-purple-200 shadow-lg">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Main Generation (2/3 width) */}
              <div className="lg:col-span-2">
                <h3 className="text-2xl font-bold text-gray-800 mb-3">AI Script Generation</h3>
                <p className="text-purple-600 font-medium mb-6 text-lg">Powered by your knowledge base</p>

                {/* Description */}
                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-4">
                    <BookOpen className="w-6 h-6 text-purple-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-base font-medium text-gray-800">Based on:</p>
                      <p className="text-base text-purple-700 font-semibold">{documentName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <Zap className="w-6 h-6 text-indigo-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-base font-medium text-gray-800">Available in:</p>
                      <p className="text-base text-gray-700">Recording panel's Script tab</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <Clock className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-base font-medium text-gray-800">Generation time:</p>
                      <p className="text-base text-gray-700">10-15 seconds</p>
                    </div>
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerateScript}
                  disabled={isGenerating || scriptGenerated}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 font-semibold text-lg"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Generating...</span>
                    </>
                  ) : scriptGenerated ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Script Generated!</span>
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
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                  <h4 className="font-semibold text-gray-800 mb-4 text-lg">About Script Generation</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <FileText className="w-4 h-4 text-blue-500 mt-1 flex-shrink-0" />
                      <p className="text-sm text-gray-700">Creates structured conversation flow</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Zap className="w-4 h-4 text-indigo-500 mt-1 flex-shrink-0" />
                      <p className="text-sm text-gray-700">Based on your knowledge base content</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                      <p className="text-sm text-gray-700">Professional podcast quality</p>
                    </div>
                  </div>
                </div>

                {/* Skip Option */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 text-center">
                  <h4 className="font-semibold text-gray-800 mb-2 text-lg">Skip Script Generation</h4>
                  <p className="text-sm text-gray-600 mb-4">You can always generate a script later during recording</p>
                  <button
                    onClick={handleSkipScript}
                    className="text-gray-600 hover:text-gray-800 font-medium underline transition-colors text-base"
                  >
                    Continue Without Script
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-2">
                <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-xs font-semibold text-red-800">Generation Failed</p>
                  <p className="text-xs text-red-600 mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Success Message */}
            {scriptGenerated && (
              <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-500 rounded-lg flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-green-800">Script Generated!</p>
                  <p className="text-xs text-green-600 mt-1">Ready for recording</p>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
          <button 
            onClick={goBack}
            className="text-light-purple font-medium text-3xl hover:underline transition-all hover:scale-110"
          >
            <IoMdArrowRoundBack />
          </button>
          <button
            onClick={goNext}
            disabled={!scriptGenerated}
            className={`px-8 py-3 rounded-xl font-semibold transition-all ${
              scriptGenerated
                ? 'bg-gradient-to-r from-light-purple to-purple-600 text-white hover:from-purple-600 hover:to-indigo-600 hover:shadow-lg transform hover:scale-105'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Next: Review & Create →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScriptGeneration;
