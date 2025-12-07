import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import BaseLayout from "../components/layouts/BaseLayout";
import PodcastSetupStepper from "../components/podcast-setup/PodcastSetupStepper";
import ProjectDetails from "../components/podcast-setup/ProjectDetails";
import KnowledgeBaseSetup from "../components/agent-setup/KnowledgeBaseSetup";
import ModeSelection from "../components/podcast-setup/ModeSelection";
import AISpeakerSetup from "../components/podcast-setup/AISpeakerSetup";
import VoiceCustomization from "../components/agent-setup/VoiceCustomization";
import ScriptGeneration from "../components/podcast-setup/ScriptGeneration";
import ReviewAndCreate from "../components/podcast-setup/ReviewAndCreate";
// Auto-creation components
import AutoScriptEditor from "../components/podcast-setup/AutoScriptEditor";
import AutoVoiceSetup from "../components/podcast-setup/AutoVoiceSetup";
import AutoAudioGeneration from "../components/podcast-setup/AutoAudioGeneration";

// Steps for Dynamic Conversation mode
const dynamicSteps = [
  "Project Details",
  "Knowledge Base",
  "Creation Mode",
  "AI Speaker Setup",
  "Voice Setup",
  "Script Generation",
  "Review & Create"
];

// Steps for Automatic Audio Creation mode
const automaticSteps = [
  "Project Details",
  "Knowledge Base",
  "Creation Mode",
  "Script Editor",
  "Voice Setup",
  "Generate Audio"
];

const PodcastSetupFlow = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    // Project Details
    podcastName: "",
    description: "",
    tags: [],

    // Knowledge Base (will be set by KnowledgeBaseSetup)
    selectedKnowledgeBase: null,

    // Creation Mode: "dynamic" or "automatic"
    creationMode: null,

    // AI Speaker Setup (for dynamic mode)
    speakerType: "ai-host", // ai-host or ai-guest
    agentName: "",
    avatar: "",
    tone: "casual",

    // AI Guest specific fields (when speakerType is ai-guest)
    guestPersona: {
      name: "",
      role: "",
      tone: "humble and motivational",
      background: "",
      expertise: [],
      style: "",
    },

    // Voice Setup (for dynamic mode - will be set by VoiceCustomization)
    voice: "",
    customVoiceUpload: false,
    sampleVoice: true,
    selectedVoice: "",
    customVoiceFile: null,

    // Automatic Audio Creation fields
    hostName: "Alex",
    guestName: "Jordan",
    scriptDuration: 5,
    scriptTone: "conversational",
    generatedScript: [],
    scriptMetadata: null,
    autoHostVoice: null,
    autoGuestVoice: null,
    autoHostCustomFile: null,
    autoGuestCustomFile: null,
    finalAudioUrl: null,
    finalAudioFilename: null
  });

  // Determine which steps to show based on creation mode
  const steps = useMemo(() => {
    if (formData.creationMode === "automatic") {
      return automaticSteps;
    }
    return dynamicSteps;
  }, [formData.creationMode]);

  const goNext = () => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  const goBack = () => {
    // If going back from mode-specific step to mode selection, reset mode
    if (currentStep === 3 && formData.creationMode) {
      // Don't reset mode, just go back
    }
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleCreatePodcast = () => {
    // Here you would save the podcast configuration and navigate to recording
    console.log("Creating podcast with data:", formData);
    navigate("/start-recording", { state: { podcastConfig: formData } });
  };

  // Render component based on current step and mode
  const renderStepContent = () => {
    // First 3 steps are same for both modes
    if (currentStep === 0) {
      return (
        <ProjectDetails
          formData={formData}
          setFormData={setFormData}
          goNext={goNext}
        />
      );
    }

    if (currentStep === 1) {
      return (
        <KnowledgeBaseSetup
          goNext={goNext}
          goBack={goBack}
        />
      );
    }

    if (currentStep === 2) {
      return (
        <ModeSelection
          formData={formData}
          setFormData={setFormData}
          goNext={goNext}
          goBack={goBack}
        />
      );
    }

    // After mode selection, render mode-specific components
    if (formData.creationMode === "automatic") {
      // Automatic Audio Creation flow
      switch (currentStep) {
        case 3:
          return (
            <AutoScriptEditor
              formData={formData}
              setFormData={setFormData}
              goNext={goNext}
              goBack={goBack}
            />
          );
        case 4:
          return (
            <AutoVoiceSetup
              formData={formData}
              setFormData={setFormData}
              goNext={goNext}
              goBack={goBack}
            />
          );
        case 5:
          return (
            <AutoAudioGeneration
              formData={formData}
              setFormData={setFormData}
              goBack={goBack}
            />
          );
        default:
          return null;
      }
    } else {
      // Dynamic Conversation flow (original)
      switch (currentStep) {
        case 3:
          return (
            <AISpeakerSetup
              formData={formData}
              setFormData={setFormData}
              goNext={goNext}
              goBack={goBack}
            />
          );
        case 4:
          return (
            <VoiceCustomization
              goNext={goNext}
              goBack={goBack}
            />
          );
        case 5:
          return (
            <ScriptGeneration
              formData={formData}
              goNext={goNext}
              goBack={goBack}
            />
          );
        case 6:
          return (
            <ReviewAndCreate
              formData={formData}
              goBack={goBack}
              onCreatePodcast={handleCreatePodcast}
            />
          );
        default:
          return null;
      }
    }
  };

  return (
    <BaseLayout homeScreen={false} autoCollapse={true}>
      <main className="relative min-h-screen flex flex-col" style={{ background: '#f3f4f6' }}>
        {/* Background Blobs - Contained */}
        <div className="fixed -top-28 -left-10 w-72 h-72 rounded-full blur-[120px] opacity-60 pointer-events-none z-0" style={{ background: '#b9a5ff' }} />
        <div className="fixed top-40 -right-10 w-96 h-96 rounded-full blur-[140px] opacity-40 pointer-events-none z-0" style={{ background: '#ffd5f6' }} />

        <div className="relative z-10 p-6 md:p-10">
          {/* Header */}
          <div className="text-3xl md:text-4xl font-headingPoppins font-bold mb-3" style={{ color: '#6057C7' }}>
            Podcast Setup
          </div>
          <p className="text-base md:text-lg mb-8" style={{ color: '#6A6A6A' }}>
            {formData.creationMode === "automatic"
              ? "Create an AI-generated podcast from your knowledge base."
              : "Let's create an amazing podcast episode with AI. We'll guide you through each step."}
          </p>

          {/* Timeline Stepper */}
          <PodcastSetupStepper steps={steps} currentStep={currentStep} />

          {/* Main Content */}
          <div className="mt-6 flex-1">
            {renderStepContent()}
          </div>
        </div>
      </main>
    </BaseLayout>
  );
};

export default PodcastSetupFlow;
