import { useState } from "react";
import BaseLayout from "../components/layouts/BaseLayout"; // Import BaseLayout
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
    tone: "",
    role: "",
    voice: "",
    documents: [],
    metadata: ""
  });

  const goNext = () => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  const goBack = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  return (
    <BaseLayout>
      <main className="flex-1 overflow-y-auto p-6 md:p-10 bg-light space-y-8">
        {/* Header */}
        <div className="text-2xl font-bold text-gray-800">Personalize your AI Host or Guest</div>

        {/* Stepper and Form Section */}
        <div className="max-w-4xl mx-auto">
          <TimelineStepper steps={steps} currentStep={currentStep} />
          <div className="mt-8 bg-white p-6 rounded-xl shadow">
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
      </main>
    </BaseLayout>
  );
};

export default AgentSetupFlow;
