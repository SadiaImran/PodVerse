import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BaseLayout from "../components/layouts/BaseLayout";
import PodcastSetupStepper from "../components/podcast-setup/PodcastSetupStepper";
import ProjectDetails from "../components/podcast-setup/ProjectDetails";
import KnowledgeBaseSetup from "../components/agent-setup/KnowledgeBaseSetup";
import AISpeakerSetup from "../components/podcast-setup/AISpeakerSetup";
import VoiceCustomization from "../components/agent-setup/VoiceCustomization";
import ScriptGeneration from "../components/podcast-setup/ScriptGeneration";
import ReviewAndCreate from "../components/podcast-setup/ReviewAndCreate";

const steps = [
  "Project Details",
  "Knowledge Base",
  "AI Speaker Setup", 
  "Voice Setup",
  "Script Generation",
  "Review & Create"
];

const PodcastSetupFlow = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    // Project Details
    podcastName: "",
    description: "",
    episodeNumber: "",
    duration: "15", // minutes
    tags: [],
    
    // Knowledge Base (will be set by KnowledgeBaseSetup)
    selectedKnowledgeBase: null,
    
    // AI Speaker Setup
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
    
    // Voice Setup (will be set by VoiceCustomization)
    voice: "",
    customVoiceUpload: false,
    sampleVoice: true,
    selectedVoice: "",
    customVoiceFile: null
  });

  const goNext = () => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  const goBack = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  const handleCreatePodcast = () => {
    // Here you would save the podcast configuration and navigate to recording
    console.log("Creating podcast with data:", formData);
    navigate("/start-recording", { state: { podcastConfig: formData } });
  };

  return (
    <BaseLayout homeScreen={false} autoCollapse={true}>
      <main className="p-6 bg-gray-50 min-h-screen flex flex-col">
        {/* Header */}
        <div className="text-3xl font-headingPoppins font-bold text-light-purple mb-6">
          Podcast Setup
        </div>
        <p className="text-gray-600 mb-8 text-lg">
          Let's create an amazing podcast episode with AI. We'll guide you through each step.
        </p>

        {/* Timeline Stepper */}
        <PodcastSetupStepper steps={steps} currentStep={currentStep} />

        {/* Main Content */}
        <div className="mt-6 flex-1">
          {currentStep === 0 && (
            <ProjectDetails 
              formData={formData} 
              setFormData={setFormData} 
              goNext={goNext} 
            />
          )}
          {currentStep === 1 && (
            <KnowledgeBaseSetup 
              goNext={goNext} 
              goBack={goBack} 
            />
          )}
          {currentStep === 2 && (
            <AISpeakerSetup 
              formData={formData} 
              setFormData={setFormData} 
              goNext={goNext} 
              goBack={goBack} 
            />
          )}
          {currentStep === 3 && (
            <VoiceCustomization 
              goNext={goNext} 
              goBack={goBack} 
            />
          )}
          {currentStep === 4 && (
            <ScriptGeneration 
              formData={formData}
              goNext={goNext} 
              goBack={goBack} 
            />
          )}
          {currentStep === 5 && (
            <ReviewAndCreate 
              formData={formData} 
              goBack={goBack}
              onCreatePodcast={handleCreatePodcast}
            />
          )}
        </div>
      </main>
    </BaseLayout>
  );
};

export default PodcastSetupFlow;
