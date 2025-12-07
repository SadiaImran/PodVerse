import { useState, useEffect } from "react";
import { ArrowLeft, Sparkles, FileText, Edit3, Trash2, Plus, RefreshCw, Loader2, Save, User, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { getSupabaseAuthorizedtoken } from "../../supabaseClient";

const AutoScriptEditor = ({ formData, setFormData, goNext, goBack }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState(null);
    const [script, setScript] = useState(formData.generatedScript || []);
    const [metadata, setMetadata] = useState(formData.scriptMetadata || null);
    const [editingLineId, setEditingLineId] = useState(null);
    const [editText, setEditText] = useState("");

    // Settings for generation
    const [hostName, setHostName] = useState(formData.hostName || "Alex");
    const [guestName, setGuestName] = useState(formData.guestName || "Jordan");
    const [duration, setDuration] = useState(formData.scriptDuration || 5);
    const [tone, setTone] = useState(formData.scriptTone || "conversational");

    const toneOptions = [
        { value: "conversational", label: "Conversational" },
        { value: "professional", label: "Professional" },
        { value: "casual", label: "Casual & Fun" },
        { value: "educational", label: "Educational" },
        { value: "interview", label: "Interview Style" }
    ];

    const handleGenerateScript = async () => {
        setIsGenerating(true);
        setError(null);

        try {
            const token = await getSupabaseAuthorizedtoken();
            if (!token) {
                throw new Error("Authentication required");
            }

            const kb_id = sessionStorage.getItem('current_kb_id');
            if (!kb_id) {
                throw new Error("No knowledge base selected. Please go back and select one.");
            }

            const formDataToSend = new FormData();
            formDataToSend.append('kb_id', kb_id);
            formDataToSend.append('podcast_title', formData.podcastName || 'Podcast Episode');
            formDataToSend.append('host_name', hostName);
            formDataToSend.append('guest_name', guestName);
            formDataToSend.append('duration_minutes', duration.toString());
            formDataToSend.append('tone', tone);

            const response = await axios.post(
                'http://localhost:8000/auto-podcast/generate-script',
                formDataToSend,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    }
                }
            );

            if (response.data.success) {
                setScript(response.data.script);
                setMetadata(response.data.metadata);

                // Store in formData
                setFormData({
                    ...formData,
                    generatedScript: response.data.script,
                    scriptMetadata: response.data.metadata,
                    hostName,
                    guestName,
                    scriptDuration: duration,
                    scriptTone: tone
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

    const handleEditLine = (line) => {
        setEditingLineId(line.id);
        setEditText(line.text);
    };

    const handleSaveEdit = (lineId) => {
        setScript(prev => prev.map(line =>
            line.id === lineId ? { ...line, text: editText } : line
        ));
        setEditingLineId(null);
        setEditText("");
    };

    const handleDeleteLine = (lineId) => {
        setScript(prev => prev.filter(line => line.id !== lineId));
    };

    const handleAddLine = (afterIndex, speaker) => {
        const newLine = {
            id: `new-${Date.now()}`,
            speaker: speaker === 'HOST' ? hostName : guestName,
            speaker_label: speaker,
            text: "Enter your dialogue here..."
        };

        const newScript = [...script];
        newScript.splice(afterIndex + 1, 0, newLine);
        setScript(newScript);

        // Auto-edit the new line
        setEditingLineId(newLine.id);
        setEditText(newLine.text);
    };

    const handleNext = () => {
        // Save script to formData
        setFormData({
            ...formData,
            generatedScript: script,
            scriptMetadata: metadata,
            hostName,
            guestName
        });
        goNext();
    };

    // Calculate word count
    const totalWords = script.reduce((sum, line) => sum + line.text.split(' ').length, 0);
    const estimatedDuration = (totalWords / 150).toFixed(1);

    return (
        <div className="max-w-5xl mx-auto relative">
            <div className="rounded-[28px] border border-white/60 bg-white/85 backdrop-blur-xl shadow-[0_20px_60px_rgba(96,87,199,0.1)] p-8 md:p-10">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-3xl font-bold mb-2" style={{ color: '#1C1C1C' }}>
                                Script Editor
                            </h2>
                            <p style={{ color: '#6A6A6A' }}>
                                Generate and customize your podcast script
                            </p>
                        </div>
                        {script.length > 0 && (
                            <div className="text-right">
                                <div className="text-sm" style={{ color: '#6A6A6A' }}>
                                    {script.length} lines • {totalWords} words
                                </div>
                                <div className="text-sm font-medium" style={{ color: '#6057C7' }}>
                                    ~{estimatedDuration} min
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Generation Settings */}
                {script.length === 0 && (
                    <div className="rounded-xl p-6 mb-8" style={{ backgroundColor: '#f5f3ff' }}>
                        <h3 className="font-semibold mb-4" style={{ color: '#1C1C1C' }}>
                            <Sparkles className="w-5 h-5 inline mr-2" style={{ color: '#6057C7' }} />
                            Script Generation Settings
                        </h3>

                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                            {/* Host Name */}
                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: '#6A6A6A' }}>
                                    Host Name
                                </label>
                                <input
                                    type="text"
                                    value={hostName}
                                    onChange={(e) => setHostName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#6057C7] focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                                    placeholder="e.g., Alex"
                                />
                            </div>

                            {/* Guest Name */}
                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: '#6A6A6A' }}>
                                    Guest Name
                                </label>
                                <input
                                    type="text"
                                    value={guestName}
                                    onChange={(e) => setGuestName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#6057C7] focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                                    placeholder="e.g., Jordan"
                                />
                            </div>

                            {/* Duration */}
                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: '#6A6A6A' }}>
                                    Target Duration (minutes)
                                </label>
                                <select
                                    value={duration}
                                    onChange={(e) => setDuration(parseInt(e.target.value))}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#6057C7] focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                                >
                                    <option value={3}>~3 minutes</option>
                                    <option value={5}>~5 minutes</option>
                                    <option value={10}>~10 minutes</option>
                                    <option value={15}>~15 minutes</option>
                                </select>
                            </div>

                            {/* Tone */}
                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: '#6A6A6A' }}>
                                    Conversation Tone
                                </label>
                                <select
                                    value={tone}
                                    onChange={(e) => setTone(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#6057C7] focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                                >
                                    {toneOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerateScript}
                            disabled={isGenerating}
                            className="w-full py-4 rounded-xl font-semibold text-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                            style={{ backgroundColor: '#6057C7', color: '#F9F5EB' }}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Generating Script...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5" />
                                    Generate Script
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="rounded-xl p-4 mb-6 border border-red-200" style={{ backgroundColor: '#fef2f2' }}>
                        <p className="text-red-600 text-sm">{error}</p>
                    </div>
                )}

                {/* Script Editor */}
                {script.length > 0 && (
                    <>
                        {/* Toolbar */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium" style={{ color: '#6A6A6A' }}>
                                    <FileText className="w-4 h-4 inline mr-1" />
                                    {metadata?.podcast_title || 'Podcast Script'}
                                </span>
                            </div>
                            <button
                                onClick={handleGenerateScript}
                                disabled={isGenerating}
                                className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
                                style={{ backgroundColor: '#f5f3ff', color: '#6057C7' }}
                            >
                                <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                                Regenerate
                            </button>
                        </div>

                        {/* Script Lines */}
                        <div className="max-h-[500px] overflow-y-auto space-y-3 mb-6 pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#6057C7 #f3f4f6' }}>
                            <AnimatePresence>
                                {script.map((line, index) => (
                                    <motion.div
                                        key={line.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className={`rounded-xl p-4 border transition-all ${editingLineId === line.id
                                                ? 'border-[#6057C7] shadow-md'
                                                : 'border-gray-200 hover:border-[#A388E7]'
                                            }`}
                                        style={{ backgroundColor: line.speaker_label === 'HOST' ? '#faf8ff' : 'white' }}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Speaker Avatar */}
                                            <div
                                                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${line.speaker_label === 'HOST'
                                                        ? 'bg-gradient-to-br from-violet-500 to-purple-600'
                                                        : 'bg-gradient-to-br from-purple-500 to-indigo-600'
                                                    }`}
                                            >
                                                {line.speaker_label === 'HOST' ? (
                                                    <User className="w-5 h-5 text-white" />
                                                ) : (
                                                    <Users className="w-5 h-5 text-white" />
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="font-semibold text-sm" style={{ color: '#6057C7' }}>
                                                        {line.speaker}
                                                    </span>
                                                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f5f3ff', color: '#6A6A6A' }}>
                                                        {line.speaker_label}
                                                    </span>
                                                </div>

                                                {editingLineId === line.id ? (
                                                    <div>
                                                        <textarea
                                                            value={editText}
                                                            onChange={(e) => setEditText(e.target.value)}
                                                            className="w-full px-3 py-2 rounded-lg border border-[#6057C7] focus:ring-2 focus:ring-purple-100 outline-none resize-none"
                                                            rows={3}
                                                            autoFocus
                                                        />
                                                        <div className="flex gap-2 mt-2">
                                                            <button
                                                                onClick={() => handleSaveEdit(line.id)}
                                                                className="px-3 py-1.5 rounded-lg text-sm font-medium text-white"
                                                                style={{ backgroundColor: '#6057C7' }}
                                                            >
                                                                <Save className="w-4 h-4 inline mr-1" />
                                                                Save
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingLineId(null)}
                                                                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                                                                style={{ backgroundColor: '#f3f4f6', color: '#6A6A6A' }}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm" style={{ color: '#1C1C1C' }}>
                                                        {line.text}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            {editingLineId !== line.id && (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleEditLine(line)}
                                                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit3 className="w-4 h-4" style={{ color: '#6A6A6A' }} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteLine(line.id)}
                                                        className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-400" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Add Line Button */}
                                        {editingLineId !== line.id && (
                                            <div className="flex justify-center mt-2 opacity-0 hover:opacity-100 transition-opacity">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleAddLine(index, 'HOST')}
                                                        className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
                                                        style={{ backgroundColor: '#f5f3ff', color: '#6057C7' }}
                                                    >
                                                        <Plus className="w-3 h-3" /> Add Host Line
                                                    </button>
                                                    <button
                                                        onClick={() => handleAddLine(index, 'GUEST')}
                                                        className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
                                                        style={{ backgroundColor: '#f5f3ff', color: '#6057C7' }}
                                                    >
                                                        <Plus className="w-3 h-3" /> Add Guest Line
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between items-center mt-8">
                    <button
                        onClick={goBack}
                        className="w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md hover:shadow-lg"
                        style={{ backgroundColor: '#6057C7', color: '#F9F5EB' }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={script.length === 0}
                        className={`px-8 py-4 rounded-full font-semibold text-lg transition-all shadow-md hover:shadow-lg ${script.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        style={{
                            backgroundColor: script.length > 0 ? '#6057C7' : '#9ca3af',
                            color: '#F9F5EB'
                        }}
                    >
                        Next: Voice Setup →
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AutoScriptEditor;

