// ReviewAndStart.jsx - Enhanced UI Design
import { CheckCircle, FileText, User, Mic, Info, Loader2, Sparkles, Zap, BookOpen } from "lucide-react";
import { IoMdArrowRoundBack } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import { getSupabaseAuthorizedtoken } from "../../supabaseClient";

const ReviewAndStart = ({ formData, goBack }) => {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerateScript = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const token = await getSupabaseAuthorizedtoken();
      if (!token) {
        throw new Error("Authentication required");
      }

      const formDataToSend = new FormData();
      formDataToSend.append('role', formData.role || 'guest');
      formDataToSend.append('topic', formData.agentName || '');
      formDataToSend.append('length', 'medium');

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
        navigate('/start-recording', { 
          state: { scriptGenerated: true }
        });
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

  const handleStartWithoutScript = () => {
    sessionStorage.removeItem('podcastScript');
    navigate('/start-recording');
  };

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Left Section - Review Summary */}
      <div className="space-y-6 flex-[2] bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800">Final Check: Ready to Launch?</h2>

        <div className="space-y-4">
          {/* Agent Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
              <User className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Agent Name</p>
              <p className="text-sm text-gray-800 font-semibold">{formData.agentName || "Not provided"}</p>
            </div>
          </div>

          {/* Role */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <Info className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Role</p>
              <p className="text-sm text-gray-800 font-semibold capitalize">{formData.role || "Not selected"}</p>
            </div>
          </div>

          {/* Tone */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
              <Mic className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Tone</p>
              <p className="text-sm text-gray-800 font-semibold capitalize">{formData.tone || "Not selected"}</p>
            </div>
          </div>

          {/* Documents */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Documents</p>
              <p className="text-sm text-gray-800 font-semibold">1 uploaded</p>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Metadata</p>
              <p className="text-sm text-gray-800 font-semibold">{formData.metadata || "None"}</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-6"></div>

        {/* AI Script Generation Section - Enhanced Design */}
        <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-purple-50 rounded-2xl p-6 border-2 border-purple-200 shadow-sm">
          {/* Header with gradient */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">AI Script Generation</h3>
              <p className="text-xs text-purple-600 font-medium">Powered by your knowledge base</p>
            </div>
          </div>

          {/* Description with icons */}
          <div className="space-y-3 mb-5">
            <div className="flex items-start gap-2">
              <BookOpen className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">
                Generate a professional podcast script based on your uploaded documents
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">
                The script will be instantly available in the recording panel's Script tab
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-2 animate-shake">
              <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-red-800">Generation Failed</p>
                <p className="text-xs text-red-600 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerateScript}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-xl shadow-lg hover:shadow-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-lg flex items-center justify-center gap-3 font-semibold text-base relative overflow-hidden group"
          >
            {/* Animated background on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            {/* Button content */}
            <div className="relative flex items-center gap-3">
              {isGenerating ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Generating Your Script...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6" />
                  <span>Generate Script</span>
                </>
              )}
            </div>
          </button>

          {/* Info Footer */}
          <div className="mt-4 flex items-center gap-2 text-xs text-purple-700 bg-white/60 rounded-lg p-3 border border-purple-100">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>This typically takes 10-15 seconds depending on document size</span>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-200">
          <button
            onClick={goBack}
            className="text-purple-600 hover:text-purple-700 font-medium text-lg hover:underline transition-all flex items-center gap-2"
          >
            <IoMdArrowRoundBack className="text-3xl" />
            <span className="text-sm">Back</span>
          </button>
          <button
            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-8 py-3 rounded-xl shadow-md hover:shadow-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-300 font-semibold flex items-center gap-2"
            onClick={handleStartWithoutScript}
          >
            <span>Start Recording</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Right Section - Tips */}
      <div className="flex-[1] bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-5">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h3 className="font-bold text-xl text-white">Pro Tips</h3>
          </div>
          <p className="text-sm text-indigo-100">Make your podcast recording flawless</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-800">Verify Agent Details</p>
              <p className="text-xs text-gray-600 mt-1">Double-check the agent's name and role match your needs</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-800">Match Brand Voice</p>
              <p className="text-xs text-gray-600 mt-1">Ensure the tone aligns with your brand's personality</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-800">Review Documents</p>
              <p className="text-xs text-gray-600 mt-1">Confirm all uploaded documents are correct and relevant</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
            <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-800">Use AI Script</p>
              <p className="text-xs text-gray-600 mt-1">Generate a script for a more structured, professional conversation</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewAndStart;