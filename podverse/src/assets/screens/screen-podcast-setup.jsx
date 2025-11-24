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
        </div>
      </main>
    </BaseLayout>
  );
};

export default PodcastSetupFlow;
