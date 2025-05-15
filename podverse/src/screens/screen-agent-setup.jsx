import { useState } from "react";
import BaseLayout from "../components/layouts/BaseLayout";
import TimelineStepper from "../components/agent-setup/TimelineStepper";
import AgentCustomization from "../components/agent-setup/AgentCustomization";
import VoiceCustomization from "../components/agent-setup/VoiceCustomization";
import KnowledgeBaseSetup from "../components/agent-setup/KnowledgeBaseSetup";
import ReviewAndStart from "../components/agent-setup/ReviewAndStart";
import Photo from "../assets/avatars/avatar2.jpg"; // Placeholder for avatar image

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

  

  return (
    <BaseLayout>
      <main className="p-6 bg-gray-50 min-h-screen flex flex-col">
        {/* Header */}
        <div className="text-2xl font-bold text-gray-800 mb-6">Personalize your AI Host or Guest</div>

        {/* Timeline Stepper */}
        <TimelineStepper steps={steps} currentStep={currentStep} />

        {/* Main Content */}
          {/*  - Setup Flow */}
          <div className={`mt-6`}>
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
      </main>
      
    </BaseLayout>
  );
};

export default AgentSetupFlow;