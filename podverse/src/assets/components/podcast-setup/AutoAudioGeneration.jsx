import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Play, Pause, Download, Loader2, CheckCircle, AlertCircle, Wand2, Volume2, FileAudio } from "lucide-react";
import { motion } from "framer-motion";
import axios from "axios";
import { getSupabaseAuthorizedtoken } from "../../supabaseClient";
import { useNavigate } from "react-router-dom";

const AutoAudioGeneration = ({ formData, setFormData, goBack }) => {
    const navigate = useNavigate();
    const [stage, setStage] = useState('ready'); // ready, generating, merging, uploading, complete, error
    const [progress, setProgress] = useState(0);
    const [currentLine, setCurrentLine] = useState(0);
    const [error, setError] = useState(null);
    const [audioSegments, setAudioSegments] = useState([]);

    // Local file URL (from backend)
    const [localAudioUrl, setLocalAudioUrl] = useState(null);
    const [localAudioFilename, setLocalAudioFilename] = useState(null);

    // Supabase URL (after upload)
    const [supabaseAudioUrl, setSupabaseAudioUrl] = useState(null);
    const [supabaseFilename, setSupabaseFilename] = useState(null);

    // Audio playback
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioBlobUrl, setAudioBlobUrl] = useState(null);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioProgress, setAudioProgress] = useState(0);
    const [audioDuration, setAudioDuration] = useState(0);
    const audioRef = useRef(null);

    const totalLines = formData.generatedScript?.length || 0;

    // Load audio blob when localAudioUrl changes
    useEffect(() => {
        const loadAudioBlob = async () => {
            if (localAudioUrl && (stage === 'complete' || stage === 'uploading')) {
                try {
                    // Download endpoint is public, no auth needed
                    const response = await axios.get(localAudioUrl, {
                        responseType: 'blob'
                    });

                    // Determine mime type from filename
                    const isMP3 = localAudioFilename?.endsWith('.mp3');
                    const mimeType = isMP3 ? 'audio/mpeg' : 'audio/wav';

                    const blob = new Blob([response.data], { type: mimeType });
                    const url = window.URL.createObjectURL(blob);
                    setAudioBlob(blob);
                    setAudioBlobUrl(url);
                } catch (err) {
                    console.error("Failed to load audio:", err);
                }
            }
        };

        loadAudioBlob();

        return () => {
            if (audioBlobUrl) {
                window.URL.revokeObjectURL(audioBlobUrl);
            }
        };
    }, [localAudioUrl, stage, localAudioFilename]);

    const handleGenerateAudio = async () => {
        setStage('generating');
        setProgress(0);
        setError(null);

        try {
            const token = await getSupabaseAuthorizedtoken();
            if (!token) {
                throw new Error("Authentication required");
            }

            // Prepare form data for audio generation
            const audioFormData = new FormData();
            audioFormData.append('script', JSON.stringify(formData.generatedScript));

            // Add Edge TTS voice IDs
            const hostVoiceName = formData.autoHostVoice?.id || "en-US-GuyNeural";
            const guestVoiceName = formData.autoGuestVoice?.id || "en-GB-SoniaNeural";

            audioFormData.append('host_voice', hostVoiceName);
            audioFormData.append('guest_voice', guestVoiceName);

            console.log(`🎤 Using voices - Host: ${hostVoiceName}, Guest: ${guestVoiceName}`);

            // Simulate progress for better UX (actual API call happens in background)
            const progressInterval = setInterval(() => {
                setProgress(prev => {
                    const newProgress = prev + (100 - prev) * 0.1;
                    setCurrentLine(Math.floor((newProgress / 100) * totalLines));
                    return newProgress > 95 ? 95 : newProgress;
                });
            }, 500);

            // Generate audio segments
            const response = await axios.post(
                'http://localhost:8000/auto-podcast/generate-audio',
                audioFormData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data',
                    },
                    timeout: 300000 // 5 minute timeout for long audio generation
                }
            );

            clearInterval(progressInterval);

            if (response.data.success) {
                setAudioSegments(response.data.segments);
                setProgress(100);
                setCurrentLine(totalLines);

                // Move to merging stage
                await handleMergeAudio(token, response.data.segments);
            } else {
                throw new Error(response.data.error || "Failed to generate audio");
            }

        } catch (err) {
            console.error("Audio generation error:", err);
            setError(err.response?.data?.detail || err.message || "Failed to generate audio");
            setStage('error');
        }
    };

    const handleMergeAudio = async (token, segments) => {
        setStage('merging');

        try {
            const mergeFormData = new FormData();
            mergeFormData.append('segments', JSON.stringify(segments));
            mergeFormData.append('output_name', formData.podcastName?.replace(/\s+/g, '_') || 'podcast');
            mergeFormData.append('add_silence_gap', '0.3');

            const response = await axios.post(
                'http://localhost:8000/auto-podcast/merge-audio',
                mergeFormData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    }
                }
            );

            if (response.data.success) {
                const downloadUrl = `http://localhost:8000${response.data.download_url}`;
                const filename = response.data.output_filename;

                setLocalAudioUrl(downloadUrl);
                setLocalAudioFilename(filename);

                // Now upload to Supabase
                await handleUploadToSupabase(token, downloadUrl, filename);
            } else {
                throw new Error(response.data.error || "Failed to merge audio");
            }

        } catch (err) {
            console.error("Audio merge error:", err);
            setError(err.response?.data?.detail || err.message || "Failed to merge audio");
            setStage('error');
        }
    };

    const handleUploadToSupabase = async (token, downloadUrl, filename) => {
        setStage('uploading');

        try {
            console.log('📤 Uploading audio to Supabase...');

            // Download the merged audio file
            const audioResponse = await axios.get(downloadUrl, {
                responseType: 'blob'
            });

            const isMP3 = filename?.endsWith('.mp3');
            const mimeType = isMP3 ? 'audio/mpeg' : 'audio/wav';
            const blob = new Blob([audioResponse.data], { type: mimeType });

            // Create a proper filename for Supabase
            const timestamp = Date.now();
            const safePodcastName = (formData.podcastName || 'podcast').replace(/[^a-zA-Z0-9_-]/g, '_');
            const supabaseFilename = `auto_podcast_${safePodcastName}_${timestamp}${isMP3 ? '.mp3' : '.wav'}`;

            // Create File object for upload
            const audioFile = new File([blob], supabaseFilename, { type: mimeType });

            // Upload to Supabase using the existing endpoint
            const uploadFormData = new FormData();
            uploadFormData.append('file', audioFile);
            uploadFormData.append('kb_id', formData.selectedKnowledgeBase || 'auto_generated');
            uploadFormData.append('podcast_title', formData.podcastName || 'Auto Generated Podcast');

            const uploadResponse = await axios.post(
                'http://localhost:8000/audios/upload-edited-audio',
                uploadFormData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    }
                }
            );

            if (uploadResponse.data.audio_url) {
                const supabaseUrl = uploadResponse.data.audio_url;
                console.log('✅ Audio uploaded to Supabase:', supabaseUrl);

                setSupabaseAudioUrl(supabaseUrl);
                setSupabaseFilename(supabaseFilename);

                // Save to formData
                setFormData({
                    ...formData,
                    finalAudioUrl: supabaseUrl,
                    finalAudioFilename: supabaseFilename,
                    supabaseAudioUrl: supabaseUrl
                });

                setStage('complete');
            } else {
                throw new Error("Failed to get Supabase URL");
            }

        } catch (err) {
            console.error("Supabase upload error:", err);
            // Don't fail completely - still mark as complete with local URL
            console.warn('⚠️ Supabase upload failed, using local URL');
            setSupabaseAudioUrl(null);
            setStage('complete');
        }
    };

    const handlePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleDownload = async () => {
        const downloadUrl = supabaseAudioUrl || localAudioUrl;
        const downloadFilename = supabaseFilename || localAudioFilename || 'podcast.mp3';

        if (downloadUrl) {
            try {
                const response = await axios.get(downloadUrl, {
                    responseType: 'blob'
                });

                const isMP3 = downloadFilename?.endsWith('.mp3');
                const mimeType = isMP3 ? 'audio/mpeg' : 'audio/wav';

                const blob = new Blob([response.data], { type: mimeType });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = downloadFilename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            } catch (err) {
                console.error("Download error:", err);
                window.open(downloadUrl, '_blank');
            }
        }
    };

    const handleSendToEditor = () => {
        // Use Supabase URL if available, otherwise fall back to local URL
        const audioUrl = supabaseAudioUrl || localAudioUrl;
        const filename = supabaseFilename || localAudioFilename || 'podcast.mp3';

        if (!audioUrl) {
            console.error("No audio URL available");
            return;
        }

        // Store audio URL in sessionStorage using the keys the audio editor expects
        sessionStorage.setItem('recordingUrl', audioUrl);
        sessionStorage.setItem('recordingFilename', filename);

        // Store script data for skipping diarization in video generation
        if (formData.generatedScript) {
            sessionStorage.setItem('autoAudioScriptData', JSON.stringify(formData.generatedScript));
            sessionStorage.setItem('autoAudioDuration', audioDuration.toString());
            console.log('📝 Stored script data for video generation');
        }

        console.log('📤 Sending to editor:', { audioUrl, filename });

        // Navigate to audio editing page
        navigate('/audio-edit');
    };

    const handleAudioEnded = () => {
        setIsPlaying(false);
        setAudioProgress(0);
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
            setAudioProgress(progress);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setAudioDuration(audioRef.current.duration);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="max-w-4xl mx-auto relative">
            {/* Hidden audio element */}
            <audio
                ref={audioRef}
                src={audioBlobUrl}
                onEnded={handleAudioEnded}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                style={{ display: 'none' }}
            />

            <div className="rounded-[28px] border border-white/60 bg-white/85 backdrop-blur-xl shadow-[0_20px_60px_rgba(96,87,199,0.1)] p-8 md:p-10">
                {/* Header */}
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold mb-2" style={{ color: '#1C1C1C' }}>
                        Audio Generation
                    </h2>
                    <p style={{ color: '#6A6A6A' }}>
                        Generate your podcast audio from the script
                    </p>
                </div>

                {/* Ready State */}
                {stage === 'ready' && (
                    <div className="text-center py-8">
                        <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: '#f5f3ff' }}>
                            <Wand2 className="w-12 h-12" style={{ color: '#6057C7' }} />
                        </div>

                        <h3 className="text-xl font-semibold mb-2" style={{ color: '#1C1C1C' }}>
                            Ready to Generate
                        </h3>
                        <p className="mb-6" style={{ color: '#6A6A6A' }}>
                            Your script has {totalLines} lines. Click below to generate the audio.
                        </p>

                        {/* Summary */}
                        <div className="rounded-xl p-4 mb-6 text-left" style={{ backgroundColor: '#f5f3ff' }}>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span style={{ color: '#6A6A6A' }}>Host Voice:</span>
                                    <span className="ml-2 font-medium" style={{ color: '#6057C7' }}>
                                        {formData.autoHostVoice?.name || 'Default'}
                                    </span>
                                </div>
                                <div>
                                    <span style={{ color: '#6A6A6A' }}>Guest Voice:</span>
                                    <span className="ml-2 font-medium" style={{ color: '#6057C7' }}>
                                        {formData.autoGuestVoice?.name || 'Default'}
                                    </span>
                                </div>
                                <div>
                                    <span style={{ color: '#6A6A6A' }}>Script Lines:</span>
                                    <span className="ml-2 font-medium" style={{ color: '#6057C7' }}>
                                        {totalLines}
                                    </span>
                                </div>
                                <div>
                                    <span style={{ color: '#6A6A6A' }}>Est. Duration:</span>
                                    <span className="ml-2 font-medium" style={{ color: '#6057C7' }}>
                                        ~{formData.scriptMetadata?.estimated_duration_minutes || 5} min
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleGenerateAudio}
                            className="px-8 py-4 rounded-full font-semibold text-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 mx-auto"
                            style={{ backgroundColor: '#6057C7', color: '#F9F5EB' }}
                        >
                            <Wand2 className="w-5 h-5" />
                            Generate Podcast Audio
                        </button>
                    </div>
                )}

                {/* Generating/Merging/Uploading State */}
                {(stage === 'generating' || stage === 'merging' || stage === 'uploading') && (
                    <div className="text-center py-8">
                        <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: '#f5f3ff' }}>
                            <Loader2 className="w-12 h-12 animate-spin" style={{ color: '#6057C7' }} />
                        </div>

                        <h3 className="text-xl font-semibold mb-2" style={{ color: '#1C1C1C' }}>
                            {stage === 'generating' ? 'Generating Audio...' :
                                stage === 'merging' ? 'Merging Audio...' :
                                    'Saving...'}
                        </h3>
                        <p className="mb-6" style={{ color: '#6A6A6A' }}>
                            {stage === 'generating'
                                ? `Processing line ${currentLine} of ${totalLines}`
                                : stage === 'merging'
                                    ? 'Creating your final podcast audio'
                                    : 'Finalizing your podcast'}
                        </p>

                        {/* Progress Bar */}
                        <div className="max-w-md mx-auto mb-4">
                            <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#e5e7eb' }}>
                                <motion.div
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: '#6057C7' }}
                                    initial={{ width: 0 }}
                                    animate={{ width: stage === 'uploading' ? '100%' : `${progress}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                            <p className="text-sm mt-2" style={{ color: '#6A6A6A' }}>
                                {stage === 'uploading' ? 'Almost done...' : `${Math.round(progress)}% complete`}
                            </p>
                        </div>

                        <p className="text-xs" style={{ color: '#9ca3af' }}>
                            This may take a few minutes depending on the script length
                        </p>
                    </div>
                )}

                {/* Complete State */}
                {stage === 'complete' && (
                    <div className="text-center py-8">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center"
                            style={{ backgroundColor: '#dcfce7' }}
                        >
                            <CheckCircle className="w-12 h-12 text-green-600" />
                        </motion.div>

                        <h3 className="text-xl font-semibold mb-2" style={{ color: '#1C1C1C' }}>
                            Audio Generated Successfully!
                        </h3>
                        <p className="mb-6" style={{ color: '#6A6A6A' }}>
                            Your podcast audio is ready. Preview it below or send it to the editor.
                        </p>

                        {/* Audio Player */}
                        <div className="max-w-md mx-auto rounded-xl p-6 mb-6" style={{ backgroundColor: '#f5f3ff' }}>
                            <div className="flex items-center justify-center gap-4 mb-4">
                                <button
                                    onClick={handlePlayPause}
                                    disabled={!audioBlobUrl}
                                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-md hover:shadow-lg ${!audioBlobUrl ? 'opacity-50' : ''}`}
                                    style={{ backgroundColor: '#6057C7', color: 'white' }}
                                >
                                    {!audioBlobUrl ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : isPlaying ? (
                                        <Pause className="w-6 h-6" />
                                    ) : (
                                        <Play className="w-6 h-6 ml-1" />
                                    )}
                                </button>
                                <div className="text-left flex-1">
                                    <p className="font-medium" style={{ color: '#1C1C1C' }}>
                                        {formData.podcastName || 'Podcast'}
                                    </p>
                                    <p className="text-sm" style={{ color: '#6A6A6A' }}>
                                        {audioDuration > 0 ? formatTime(audioDuration) : 'Loading...'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className="text-xs font-mono" style={{ color: '#6A6A6A' }}>
                                    {audioRef.current ? formatTime(audioRef.current.currentTime) : '0:00'}
                                </span>
                                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#e5e7eb' }}>
                                    <motion.div
                                        className="h-full rounded-full"
                                        style={{ backgroundColor: '#6057C7', width: `${audioProgress}%` }}
                                        transition={{ duration: 0.1 }}
                                    />
                                </div>
                                <span className="text-xs font-mono" style={{ color: '#6A6A6A' }}>
                                    {audioDuration > 0 ? formatTime(audioDuration) : '0:00'}
                                </span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={handleDownload}
                                className="px-6 py-3 rounded-full font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                                style={{ backgroundColor: 'white', color: '#6057C7', border: '2px solid #6057C7' }}
                            >
                                <Download className="w-5 h-5" />
                                Download Audio
                            </button>
                            <button
                                onClick={handleSendToEditor}
                                className="px-6 py-3 rounded-full font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                                style={{ backgroundColor: '#6057C7', color: '#F9F5EB' }}
                            >
                                <FileAudio className="w-5 h-5" />
                                Send to Audio Editor
                            </button>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {stage === 'error' && (
                    <div className="text-center py-8">
                        <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: '#fef2f2' }}>
                            <AlertCircle className="w-12 h-12 text-red-500" />
                        </div>

                        <h3 className="text-xl font-semibold mb-2" style={{ color: '#1C1C1C' }}>
                            Generation Failed
                        </h3>
                        <p className="mb-6 text-red-600">
                            {error}
                        </p>

                        <button
                            onClick={() => {
                                setStage('ready');
                                setError(null);
                                setProgress(0);
                            }}
                            className="px-6 py-3 rounded-full font-semibold transition-all shadow-md hover:shadow-lg"
                            style={{ backgroundColor: '#6057C7', color: '#F9F5EB' }}
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
                    <button
                        onClick={goBack}
                        disabled={stage === 'generating' || stage === 'merging' || stage === 'uploading'}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md hover:shadow-lg ${(stage === 'generating' || stage === 'merging' || stage === 'uploading') ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        style={{ backgroundColor: '#6057C7', color: '#F9F5EB' }}
                    >
                        <ArrowLeft size={20} />
                    </button>

                    {stage === 'complete' && (
                        <button
                            onClick={() => navigate('/create-podcast')}
                            className="px-6 py-3 rounded-full font-semibold transition-all"
                            style={{ backgroundColor: '#f3f4f6', color: '#6A6A6A' }}
                        >
                            Back to Dashboard
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AutoAudioGeneration;
