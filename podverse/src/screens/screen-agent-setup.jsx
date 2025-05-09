import { useState } from "react";
import BaseLayout from "../components/layouts/BaseLayout";
import TimelineStepper from "../components/agent-setup/TimelineStepper";
import AgentCustomization from "../components/agent-setup/AgentCustomization";
import VoiceCustomization from "../components/agent-setup/VoiceCustomization";
import KnowledgeBaseSetup from "../components/agent-setup/KnowledgeBaseSetup";
import ReviewAndStart from "../components/agent-setup/ReviewAndStart";

const steps = [
  "Agent Customization",
  "Voice Customization",
  "Knowledge Base",
  "Review & Start"
];

const AgentSetupFlow = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    agentName: "",
    avatar: "",
    tone: "casual",
    role: "ai-host",
    voice: "",
    documents: [],
    metadata: ""
  });

  const goNext = () => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  const goBack = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  // Preview message examples based on tone
  const previewMessages = {
    formal: [
      "Good day. How may I assist you with your inquiries?",
      "I've analyzed the data and have prepared a detailed report for your review.",
      "Please allow me to provide you with comprehensive information on this topic."
    ],
    casual: [
      "Hey there! How can I help you today?",
      "I took a look at that info and here's what I found.",
      "Let me know if you need anything else!"
    ],
    friendly: [
      "Hi friend! What can I do for you? 😊",
      "Great question! I'd be happy to help with that!",
      "I'm excited to share what I've learned about this!"
    ]
  };

  // Get avatar placeholder based on selection or default
  const getAvatarSrc = () => {
    if (!formData.avatar) return "/api/placeholder/48/48";
    return "/api/placeholder/48/48"; // In a real app, this would be the selected avatar
  };

  return (
    <BaseLayout>
      <main className="flex-1 h-screen p-6 md:p-10 bg-gray-50">
        {/* Header */}
        <div className="text-2xl font-bold text-gray-800 mb-8">Personalize your AI Host or Guest</div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Side - Setup Flow */}
          <div className="lg:flex-1">
            <TimelineStepper steps={steps} currentStep={currentStep} />
            <div className="mt-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              {currentStep === 0 && (
                <AgentCustomization formData={formData} setFormData={setFormData} goNext={goNext} />
              )}
              {currentStep === 1 && (
                <VoiceCustomization formData={formData} setFormData={setFormData} goNext={goNext} goBack={goBack} />
              )}
              {currentStep === 2 && (
                <KnowledgeBaseSetup formData={formData} setFormData={setFormData} goNext={goNext} goBack={goBack} />
              )}
              {currentStep === 3 && (
                <ReviewAndStart formData={formData} goBack={goBack} />
              )}
            </div>
          </div>

          {/* Right Side - Live Preview */}
          {/* <div className="lg:w-1/3 xl:w-2/5">
            <div className="sticky top-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-indigo-50 p-4 border-b border-gray-100">
                  <h3 className="font-medium text-gray-800">Preview Your Agent</h3>
                  <p className="text-sm text-gray-500">See how your agent will appear and respond</p>
                </div>
                
                <div className="p-6">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-6">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
                      <img src={getAvatarSrc()} alt="Agent avatar" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">
                        {formData.agentName || "Your Agent"}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          {formData.role === "ai-host" ? "AI Host" : "AI Guest"}
                        </span>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded capitalize">
                          {formData.tone || "Casual"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-700">Example Responses:</h4>
                    <div className="space-y-3">
                      {(previewMessages[formData.tone] || previewMessages.casual).map((message, idx) => (
                        <div key={idx} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gray-200">
                            <img src={getAvatarSrc()} alt="Agent" className="w-full h-full object-cover" />
                          </div>
                          <div className="bg-gray-100 rounded-2xl rounded-tl-none p-3 text-sm text-gray-800">
                            {message}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {currentStep === 2 && (
                    <div className="mt-6 pt-6 border-t border-gray-100">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Knowledge Sources:</h4>
                      {formData.documents.length > 0 ? (
                        <div className="space-y-2">
                          {formData.documents.map((doc, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span>{doc.name || `Document ${idx + 1}`}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 italic">No documents added yet</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h4 className="font-medium text-gray-800 mb-2">Tips</h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Choose a tone that matches your brand's voice</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Add relevant documents to improve your agent's knowledge</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Select a voice that sounds natural and engaging</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
           */}
        </div>
      </main>
    </BaseLayout>
  );
};

export default AgentSetupFlow;