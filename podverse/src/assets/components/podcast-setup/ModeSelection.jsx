import { useState } from "react";
import { ArrowLeft, Mic, Wand2, Radio, Sparkles, Zap, Users } from "lucide-react";
import { motion } from "framer-motion";

const ModeSelection = ({ formData, setFormData, goNext, goBack }) => {
    const [selectedMode, setSelectedMode] = useState(formData.creationMode || null);

    const modes = [
        {
            id: "dynamic",
            title: "Dynamic Conversation",
            subtitle: "Real-time AI Interaction",
            description: "Have a live conversation with an AI host or guest. Record in real-time with LiveKit, get natural responses, and create authentic podcast content.",
            icon: <Mic className="w-8 h-8" />,
            features: [
                "Real-time AI conversation",
                "Natural back-and-forth dialogue",
                "Live recording with LiveKit",
                "Spontaneous content creation"
            ],
            gradient: "from-light-purple to-light-purple",
            recommended: false
        },
        {
            id: "automatic",
            title: "Automatic Audio Creation",
            subtitle: "AI-Generated Podcast",
            description: "Generate a complete podcast script from your knowledge base, edit it, choose voices, and get a polished audio file automatically.",
            icon: <Wand2 className="w-8 h-8" />,
            features: [
                "Script generated from your content",
                "Full script editing control",
                "Choose voices for each speaker",
                "Merged final audio output"
            ],
            gradient: "from-light-purple to-light-lavender",
            recommended: true
        }
    ];

    const handleSelect = (modeId) => {
        setSelectedMode(modeId);
    };

    const handleNext = () => {
        if (selectedMode) {
            setFormData({ ...formData, creationMode: selectedMode });
            goNext();
        }
    };

    return (
        <div className="max-w-5xl mx-auto relative">
            {/* Main Content */}
            <div className="rounded-[28px] border border-white/60 bg-white/85 backdrop-blur-xl shadow-[0_20px_60px_rgba(96,87,199,0.1)] p-8 md:p-10">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4" style={{ backgroundColor: '#f5f3ff', color: '#6057C7' }}>
                        <Radio className="w-4 h-4" />
                        Choose Your Creation Mode
                    </div>
                    <h2 className="text-3xl font-bold mb-3" style={{ color: '#1C1C1C' }}>
                        How would you like to create your podcast?
                    </h2>
                    <p className="text-lg" style={{ color: '#6A6A6A' }}>
                        Select the approach that best fits your content creation style
                    </p>
                </div>

                {/* Mode Cards */}
                <div className="grid md:grid-cols-2 gap-6 mb-10">
                    {modes.map((mode) => (
                        <motion.div
                            key={mode.id}
                            whileHover={{ y: -4, scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => handleSelect(mode.id)}
                            className={`relative cursor-pointer rounded-2xl p-6 border-2 transition-all duration-300 ${selectedMode === mode.id
                                ? 'border-[#6057C7] shadow-lg'
                                : 'border-gray-200 hover:border-[#A388E7]'
                                }`}
                            style={{
                                backgroundColor: selectedMode === mode.id ? '#faf8ff' : 'white'
                            }}
                        >
                            {/* Recommended Badge */}
                            {mode.recommended && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: '#6057C7' }}>
                                    <Sparkles className="w-3 h-3 inline mr-1" />
                                    RECOMMENDED
                                </div>
                            )}

                            {/* Selection Indicator */}
                            <div className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedMode === mode.id
                                ? 'border-[#6057C7] bg-[#6057C7]'
                                : 'border-gray-300'
                                }`}>
                                {selectedMode === mode.id && (
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>

                            {/* Icon */}
                            <div
                                className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-white bg-gradient-to-br ${mode.gradient}`}
                            >
                                {mode.icon}
                            </div>

                            {/* Content */}
                            <h3 className="text-xl font-bold mb-1" style={{ color: '#1C1C1C' }}>
                                {mode.title}
                            </h3>
                            <p className="text-sm font-medium mb-3" style={{ color: '#6057C7' }}>
                                {mode.subtitle}
                            </p>
                            <p className="text-sm mb-4" style={{ color: '#6A6A6A' }}>
                                {mode.description}
                            </p>

                            {/* Features */}
                            <ul className="space-y-2">
                                {mode.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-center gap-2 text-sm" style={{ color: '#6A6A6A' }}>
                                        <Zap className="w-4 h-4" style={{ color: '#6057C7' }} />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    ))}
                </div>

                {/* Info Box */}
                <div className="rounded-xl p-4 mb-8" style={{ backgroundColor: '#f5f3ff' }}>
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#6057C7' }}>
                            <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h4 className="font-semibold mb-1" style={{ color: '#1C1C1C' }}>
                                {selectedMode === 'dynamic' ? 'Dynamic Mode Selected' : selectedMode === 'automatic' ? 'Automatic Mode Selected' : 'Select a Mode'}
                            </h4>
                            <p className="text-sm" style={{ color: '#6A6A6A' }}>
                                {selectedMode === 'dynamic'
                                    ? "You'll have a real-time conversation with AI. Perfect for interviews, Q&A sessions, and spontaneous discussions."
                                    : selectedMode === 'automatic'
                                        ? "Your knowledge base content will be transformed into a polished podcast script. You can edit it before generating the final audio."
                                        : "Choose how you want to create your podcast content. Both options use your knowledge base for accurate information."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between items-center">
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
                        onClick={handleNext}
                        disabled={!selectedMode}
                        className={`px-8 py-4 rounded-full font-semibold text-lg transition-all shadow-md hover:shadow-lg ${!selectedMode ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        style={{
                            backgroundColor: selectedMode ? '#6057C7' : '#9ca3af',
                            color: '#F9F5EB'
                        }}
                        onMouseEnter={(e) => {
                            if (selectedMode) {
                                e.currentTarget.style.backgroundColor = '#4f46e5';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (selectedMode) {
                                e.currentTarget.style.backgroundColor = '#6057C7';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }
                        }}
                    >
                        Continue →
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModeSelection;

