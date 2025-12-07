import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, Play, Pause, User, Users, CheckCircle, Volume2, Loader2 } from "lucide-react";
import axios from "axios";

// Deepgram Aura Voices
const DEEPGRAM_VOICES = [
    { id: "aura-asteria-en", name: "Asteria", gender: "female", style: "Warm" },
    { id: "aura-luna-en", name: "Luna", gender: "female", style: "Friendly" },
    { id: "aura-stella-en", name: "Stella", gender: "female", style: "Professional" },
    { id: "aura-athena-en", name: "Athena", gender: "female", style: "Confident" },
    { id: "aura-hera-en", name: "Hera", gender: "female", style: "Mature" },
    { id: "aura-orion-en", name: "Orion", gender: "male", style: "Deep" },
    { id: "aura-arcas-en", name: "Arcas", gender: "male", style: "Confident" },
    { id: "aura-perseus-en", name: "Perseus", gender: "male", style: "Warm" },
    { id: "aura-angus-en", name: "Angus", gender: "male", style: "Friendly" },
    { id: "aura-orpheus-en", name: "Orpheus", gender: "male", style: "Natural" },
    { id: "aura-helios-en", name: "Helios", gender: "male", style: "Energetic" },
    { id: "aura-zeus-en", name: "Zeus", gender: "male", style: "Authoritative" },
];

const AutoVoiceSetup = ({ formData, setFormData, goNext, goBack }) => {
    const [hostVoice, setHostVoice] = useState(
        formData.autoHostVoice || DEEPGRAM_VOICES.find(v => v.id === "aura-orpheus-en")
    );
    const [guestVoice, setGuestVoice] = useState(
        formData.autoGuestVoice || DEEPGRAM_VOICES.find(v => v.id === "aura-asteria-en")
    );

    const [hostFilter, setHostFilter] = useState("all");
    const [guestFilter, setGuestFilter] = useState("all");
    const [previewingVoice, setPreviewingVoice] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(null);
    const audioRef = useRef(null);
    const currentAudioUrl = useRef(null);

    const stopCurrentAudio = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.onended = null;
            audioRef.current.onerror = null;
            audioRef.current = null;
        }
        if (currentAudioUrl.current) {
            URL.revokeObjectURL(currentAudioUrl.current);
            currentAudioUrl.current = null;
        }
        setPreviewingVoice(null);
        setPreviewLoading(null);
    }, []);

    const previewVoice = useCallback(async (voiceId) => {
        // If clicking the same voice that's playing, stop it
        if (previewingVoice === voiceId) {
            stopCurrentAudio();
            return;
        }

        // Stop any currently playing audio first
        stopCurrentAudio();

        setPreviewLoading(voiceId);

        try {
            const response = await axios.get(
                `http://localhost:8000/auto-podcast/voice-preview/${voiceId}`,
                { responseType: 'blob', timeout: 15000 }
            );

            const audioUrl = URL.createObjectURL(response.data);
            currentAudioUrl.current = audioUrl;

            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            audio.onended = () => {
                stopCurrentAudio();
            };

            audio.onerror = () => {
                stopCurrentAudio();
            };

            await audio.play();
            setPreviewingVoice(voiceId);
            setPreviewLoading(null);
        } catch (error) {
            console.error("Preview error:", error);
            stopCurrentAudio();
        }
    }, [previewingVoice, stopCurrentAudio]);

    useEffect(() => {
        return () => {
            stopCurrentAudio();
        };
    }, [stopCurrentAudio]);

    const handleNext = () => {
        stopCurrentAudio();
        setFormData({
            ...formData,
            autoHostVoice: hostVoice,
            autoGuestVoice: guestVoice,
        });
        goNext();
    };

    const getFilteredVoices = (filter) => {
        if (filter === "all") return DEEPGRAM_VOICES;
        return DEEPGRAM_VOICES.filter(v => v.gender === filter);
    };

    const FilterButtons = ({ filter, setFilter }) => (
        <div className="flex gap-1 mb-3">
            {["all", "male", "female"].map((f) => (
                <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${filter === f
                            ? 'bg-[#6057C7] text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    {f === "all" ? "All" : f === "male" ? "Male" : "Female"}
                </button>
            ))}
        </div>
    );

    const VoiceItem = ({ voice, isSelected, onSelect }) => {
        const isPreviewing = previewingVoice === voice.id;
        const isLoading = previewLoading === voice.id;

        return (
            <div
                onClick={() => onSelect(voice)}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isSelected
                        ? 'border-[#6057C7] bg-light-lavender/30'
                        : 'border-gray-200 hover:border-light-lavender/50 bg-white'
                    }`}
            >
                {/* Avatar */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${voice.gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'
                    }`}>
                    {voice.name.charAt(0)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 text-sm">{voice.name}</span>
                        {isSelected && <CheckCircle className="w-4 h-4 text-[#6057C7]" />}
                    </div>
                    <span className="text-xs text-gray-500">{voice.style}</span>
                </div>

                {/* Play Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        previewVoice(voice.id);
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${isPreviewing
                            ? 'bg-[#6057C7] text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-light-lavender/30 hover:text-[#6057C7]'
                        }`}
                >
                    {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isPreviewing ? (
                        <Pause className="w-3.5 h-3.5" />
                    ) : (
                        <Play className="w-3.5 h-3.5 ml-0.5" />
                    )}
                </button>
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-lg p-6 md:p-8">
                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">Voice Setup</h2>
                    <p className="text-gray-500 text-sm">
                        Select voices for your podcast speakers. Click play to preview.
                    </p>
                </div>

                {/* Speaker Summary */}
                <div className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 mb-6 text-sm">
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-[#6057C7]" />
                        <span className="text-gray-700">Host: <strong>{formData.hostName || 'Alex'}</strong></span>
                    </div>
                    <div className="w-px h-4 bg-gray-300" />
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#6057C7]" />
                        <span className="text-gray-700">Guest: <strong>{formData.guestName || 'Jordan'}</strong></span>
                    </div>
                    <div className="ml-auto text-gray-500">
                        {formData.generatedScript?.length || 0} lines
                    </div>
                </div>

                {/* Voice Selection - Two Columns */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                    {/* Host Voice */}
                    <div className="border border-gray-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 rounded-md bg-violet-500 flex items-center justify-center">
                                <User className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 text-sm">{formData.hostName || 'Host'}'s Voice</h3>
                                <p className="text-xs text-[#6057C7]">{hostVoice?.name || 'Select voice'}</p>
                            </div>
                        </div>

                        <FilterButtons filter={hostFilter} setFilter={setHostFilter} />

                        <div className="space-y-2 max-h-[240px] overflow-y-auto">
                            {getFilteredVoices(hostFilter).map((voice) => (
                                <VoiceItem
                                    key={`host-${voice.id}`}
                                    voice={voice}
                                    isSelected={hostVoice?.id === voice.id}
                                    onSelect={setHostVoice}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Guest Voice */}
                    <div className="border border-gray-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 rounded-md bg-light-purple flex items-center justify-center">
                                <Users className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 text-sm">{formData.guestName || 'Guest'}'s Voice</h3>
                                <p className="text-xs text-[#6057C7]">{guestVoice?.name || 'Select voice'}</p>
                            </div>
                        </div>

                        <FilterButtons filter={guestFilter} setFilter={setGuestFilter} />

                        <div className="space-y-2 max-h-[240px] overflow-y-auto">
                            {getFilteredVoices(guestFilter).map((voice) => (
                                <VoiceItem
                                    key={`guest-${voice.id}`}
                                    voice={voice}
                                    isSelected={guestVoice?.id === voice.id}
                                    onSelect={setGuestVoice}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Selected Summary */}
                <div className="flex items-center justify-center gap-8 p-4 rounded-xl bg-light-lavender/30 mb-6">
                    <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium ${hostVoice?.gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'
                            }`}>
                            {hostVoice?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Host Voice</p>
                            <p className="font-semibold text-[#6057C7] text-sm">{hostVoice?.name || '-'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-gray-400">
                        <Volume2 className="w-5 h-5" />
                    </div>

                    <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium ${guestVoice?.gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'
                            }`}>
                            {guestVoice?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Guest Voice</p>
                            <p className="font-semibold text-[#6057C7] text-sm">{guestVoice?.name || '-'}</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between items-center">
                    <button
                        onClick={() => { stopCurrentAudio(); goBack(); }}
                        className="w-11 h-11 rounded-full flex items-center justify-center bg-[#6057C7] text-white shadow-md hover:shadow-lg transition-all"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={!hostVoice || !guestVoice}
                        className={`px-6 py-3 rounded-full font-semibold shadow-md hover:shadow-lg transition-all ${(!hostVoice || !guestVoice)
                                ? 'opacity-50 cursor-not-allowed bg-gray-400'
                                : 'bg-[#6057C7] hover:bg-[#4e47a3]'
                            } text-white`}
                    >
                        Next: Generate Audio →
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AutoVoiceSetup;
