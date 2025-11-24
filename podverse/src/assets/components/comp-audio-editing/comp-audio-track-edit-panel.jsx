import React, { useState, useEffect } from 'react';
import {
    ChevronRight,
    Sliders,
    Music,
    Volume2,
    VolumeX,
    Zap,
    Clock,
    Copy,
    Download,
    RotateCcw,
    Trash2,
    Check
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000/audio-edit';

const stripQueryString = (value = '') => value.split('?')[0];

const extractFileName = (value = '') => {
    const withoutQuery = stripQueryString(value);
    const parts = withoutQuery.split('/');
    return parts[parts.length - 1] || withoutQuery;
};

const sanitizeFileName = (value = '', fallbackPrefix = 'track') => {
    const extracted = extractFileName(value) || `${fallbackPrefix}.wav`;
    const sanitized = extracted.replace(/[^a-zA-Z0-9._-]/g, '_');
    if (sanitized) {
        return sanitized;
    }
    return `${fallbackPrefix}_${Date.now()}.wav`;
};

const buildSanitizedFileName = (value = '', fallbackPrefix = 'track') => {
    const base = value && value.includes('.') ? value : `${value || fallbackPrefix}.wav`;
    return sanitizeFileName(base, fallbackPrefix);
};

const getReadableTrackName = (value = '', fallback = 'Track') => {
    const baseName = extractFileName(value) || fallback;
    const underscoreIndex = baseName.indexOf('_');
    const friendly = underscoreIndex > 0 ? baseName.slice(0, underscoreIndex) : baseName;
    return friendly || fallback;
};

const getTrackDisplayName = (track) => {
    if (!track) return 'Track';
    if (track.displayName) return track.displayName;
    return getReadableTrackName(track.name || track.originalName || track.url || 'Track');
};

const downloadAudioAsBlob = async (url) => {
    const response = await fetch(url);
    const blob = await response.blob();
    return blob;
};
  
const uploadAudioToBackend = async (blob, filename, endpoint, formData = {}) => {
    const safeName = buildSanitizedFileName(filename || 'track.wav');
    const file = new File([blob], safeName, { type: blob.type || 'audio/wav' });
    const form = new FormData();
    form.append('file', file);
    
    Object.entries(formData).forEach(([key, value]) => {
        form.append(key, value);
    });
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        body: form,
    });
    
    if (!response.ok) {
        throw new Error(`Backend error: ${response.statusText}`);
    }
    
    return response.blob();
};

const TrackEditPanel = ({ track, isVisible, onClose, onUpdate, onDuplicate, onDelete, onExport, onReset }) => {
    const [localSettings, setLocalSettings] = useState({
        volume: 100,
        speed: 1.0,
        duration: track?.duration || 0,
        startTime: track?.startTime || 0
    });
    const [pendingChanges, setPendingChanges] = useState({});
    const [isProcessing, setIsProcessing] = useState(false);
    const friendlyName = track ? getTrackDisplayName(track) : 'Track';
    const fallbackPrefix = friendlyName.replace(/\s+/g, '_').toLowerCase() || 'track';

    // Speed options
    const speedOptions = [0.25, 0.5, 1.0, 1.5, 1.75, 2.0];

    useEffect(() => {
        if (track) {
            setLocalSettings({
                volume: track.volume || 100,
                speed: track.speed || 1.0,
                duration: track.duration,
                startTime: track.startTime || 0
            });
            setPendingChanges({});
        }
    }, [track]);

    if (!isVisible || !track) return null;

    const handleSettingChange = async (key, value) => {
        const newSettings = { ...localSettings, [key]: value };
        setLocalSettings(newSettings);
        
        // Apply changes through backend for volume and speed
        if (key === 'volume' || key === 'speed') {
            setIsProcessing(true);
            
            try {
                console.log(`Applying ${key} change: ${value}`);
                
                const audioBlob = await downloadAudioAsBlob(track.url);
                console.log('Downloaded audio blob:', audioBlob.size, 'bytes');
                
                let processedBlob;
                
                if (key === 'volume') {
                    const volumeFactor = value / 100;
                    console.log('Volume factor:', volumeFactor);
                    
                    processedBlob = await uploadAudioToBackend(
                        audioBlob,
                        buildSanitizedFileName(`${friendlyName}.wav`, fallbackPrefix),
                        '/volume',
                        { volume: volumeFactor }
                    );
                } else if (key === 'speed') {
                    console.log('Speed value:', value);
                    
                    processedBlob = await uploadAudioToBackend(
                        audioBlob,
                        buildSanitizedFileName(`${friendlyName}.wav`, fallbackPrefix),
                        '/speed',
                        { speed: value }
                    );
                    
                    // CRITICAL: Update duration based on speed change
                    // When speed increases, duration decreases (and vice versa)
                    newSettings.duration = track.duration / value;
                    console.log(`Duration changed from ${track.duration}s to ${newSettings.duration}s due to ${value}x speed`);
                }
                
                console.log('Processed blob received:', processedBlob.size, 'bytes');
                
                // Create new URL for processed audio
                const newUrl = URL.createObjectURL(processedBlob);
                newSettings.url = newUrl;
                
                // Clean up old URL if it's a blob URL
                if (track.url && track.url.startsWith('blob:')) {
                    URL.revokeObjectURL(track.url);
                }
                
                onUpdate && onUpdate(track.id, newSettings);
                
                // Show success notification
                const notification = document.createElement('div');
                notification.textContent = `${key.charAt(0).toUpperCase() + key.slice(1)} updated successfully!`;
                notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
                document.body.appendChild(notification);
                setTimeout(() => document.body.removeChild(notification), 2000);
                
            } catch (error) {
                console.error(`Error applying ${key} change:`, error);
                alert(`Failed to apply ${key} change: ${error.message}`);
                // Revert the local setting on error
                setLocalSettings(prev => ({ ...prev, [key]: track[key] || (key === 'volume' ? 100 : 1.0) }));
            } finally {
                setIsProcessing(false);
            }
        } else {
            // For startTime, apply immediately (no backend processing needed)
            onUpdate && onUpdate(track.id, newSettings);
        }
    };

    const handleApplyChanges = async () => {
        if (Object.keys(pendingChanges).length === 0) {
            alert('No changes to apply');
            return;
        }

        setIsProcessing(true);

        try {
            const loadingNotif = document.createElement('div');
            loadingNotif.textContent = 'Applying changes...';
            loadingNotif.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
            loadingNotif.id = 'loading-notif';
            document.body.appendChild(loadingNotif);

            let processedBlob = await downloadAudioAsBlob(track.url);
            let currentSettings = { ...localSettings };

            // Apply volume change if pending
            if (pendingChanges.volume !== undefined) {
                const volumeFactor = pendingChanges.volume / 100;
                processedBlob = await uploadAudioToBackend(
                    processedBlob,
                    buildSanitizedFileName(`${friendlyName}.wav`, fallbackPrefix),
                    '/volume',
                    { volume: volumeFactor }
                );
            }

            // Apply speed change if pending
            if (pendingChanges.speed !== undefined) {
                processedBlob = await uploadAudioToBackend(
                    processedBlob,
                    buildSanitizedFileName(`${friendlyName}.wav`, fallbackPrefix),
                    '/speed',
                    { speed: pendingChanges.speed }
                );
            }

            // Create new URL for processed audio
            const newUrl = URL.createObjectURL(processedBlob);
            currentSettings.url = newUrl;

            // Clean up old URL if it's a blob URL
            if (track.url && track.url.startsWith('blob:')) {
                URL.revokeObjectURL(track.url);
            }

            onUpdate && onUpdate(track.id, currentSettings);
            setPendingChanges({});

            const loadingElement = document.getElementById('loading-notif');
            if (loadingElement) document.body.removeChild(loadingElement);
            
            const notification = document.createElement('div');
            notification.textContent = 'Changes applied successfully!';
            notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
            document.body.appendChild(notification);
            setTimeout(() => document.body.removeChild(notification), 3000);

        } catch (error) {
            console.error('Error applying changes:', error);
            alert('Failed to apply changes. Please try again.');
            const loadingElement = document.getElementById('loading-notif');
            if (loadingElement) document.body.removeChild(loadingElement);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDuplicate = () => {
        onDuplicate && onDuplicate(track.id);
    };

    const handleExport = async () => {
        if (!track) return;
        
        try {
            const loadingNotif = document.createElement('div');
            loadingNotif.textContent = `Exporting: ${friendlyName}...`;
            loadingNotif.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
            document.body.appendChild(loadingNotif);
        
            const audioBlob = await downloadAudioAsBlob(track.url);
            const exportedBlob = await uploadAudioToBackend(
                audioBlob,
                buildSanitizedFileName(`${friendlyName}.wav`, fallbackPrefix),
                '/export',
                { format: 'wav' }
            );
        
            const url = URL.createObjectURL(exportedBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = buildSanitizedFileName(`${friendlyName}_exported.wav`, fallbackPrefix);
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        
            document.body.removeChild(loadingNotif);
            const notification = document.createElement('div');
            notification.textContent = 'Export successful!';
            notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
            document.body.appendChild(notification);
            setTimeout(() => document.body.removeChild(notification), 3000);
        
            onExport && onExport(track.id);
        } catch (error) {
            console.error('Export error:', error);
            alert('Export failed. Please try again.');
        }
    };

    const handleReset = () => {
        const resetSettings = {
            volume: 100,
            speed: 1.0,
            startTime: 0
        };
        setLocalSettings(prev => ({ ...prev, ...resetSettings }));
        setPendingChanges({});
        onReset && onReset(track.id, resetSettings);
    };

    const handleDelete = () => {
        if (window.confirm(`Are you sure you want to delete "${friendlyName}"?`)) {
            onDelete && onDelete(track.id);
            onClose();
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(1);
        return `${mins}:${secs.padStart(4, '0')}`;
    };

    return (
        <div className="w-80 bg-white border-r border-gray-200 shadow-lg flex-shrink-0 overflow-y-auto">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <Sliders className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Track Settings</h3>
                            <p className="text-sm text-gray-600">{friendlyName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
                    >
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-6">
                {/* Track Info */}
                <div className="space-y-3">
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        <Music className="w-4 h-4 text-indigo-600" />
                        Track Information
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Duration:</span>
                            <span className="font-medium">{formatTime(track.duration)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Start Time:</span>
                            <span className="font-medium">{formatTime(localSettings.startTime)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">End Time:</span>
                            <span className="font-medium">{formatTime(localSettings.startTime + track.duration)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Volume:</span>
                            <span className="font-medium">{localSettings.volume}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Speed:</span>
                            <span className="font-medium">{localSettings.speed.toFixed(2)}x</span>
                        </div>
                    </div>
                </div>

                {/* Volume Control */}
                <div className="space-y-3">
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-indigo-600" />
                        Volume {pendingChanges.volume !== undefined && <span className="text-xs text-orange-600">(pending)</span>}
                    </h4>
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <VolumeX className="w-4 h-4 text-gray-400" />
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={localSettings.volume}
                                onChange={(e) => handleSettingChange('volume', parseInt(e.target.value))}
                                className="flex-1 accent-indigo-600"
                            />
                            <Volume2 className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">0%</span>
                            <span className="font-medium text-indigo-600">{localSettings.volume}%</span>
                            <span className="text-gray-600">100%</span>
                        </div>
                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={() => handleSettingChange('volume', 0)}
                                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                            >
                                Mute
                            </button>
                            <button
                                onClick={() => handleSettingChange('volume', 50)}
                                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                            >
                                50%
                            </button>
                            <button
                                onClick={() => handleSettingChange('volume', 100)}
                                className="px-2 py-1 text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded transition-colors"
                            >
                                100%
                            </button>
                        </div>
                    </div>
                </div>

                {/* Speed Control - Button Selection */}
                <div className="space-y-3">
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-indigo-600" />
                        Playback Speed {pendingChanges.speed !== undefined && <span className="text-xs text-orange-600">(pending)</span>}
                    </h4>
                    <div className="space-y-2">
                        <div className="text-center mb-3">
                            <span className="text-2xl font-bold text-indigo-600">{localSettings.speed.toFixed(2)}x</span>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                            {speedOptions.map((speed) => (
                                <button
                                    key={speed}
                                    onClick={() => handleSettingChange('speed', speed)}
                                    className={`px-2 py-2 text-xs rounded transition-colors ${
                                        localSettings.speed === speed
                                            ? 'bg-indigo-600 text-white font-bold'
                                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                    }`}
                                >
                                    {speed}x
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Start Time Adjustment */}
                <div className="space-y-3">
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-600" />
                        Position
                    </h4>
                    <div className="space-y-2">
                        <input
                            type="range"
                            min="0"
                            max="120"
                            step="0.1"
                            value={localSettings.startTime}
                            onChange={(e) => handleSettingChange('startTime', parseFloat(e.target.value))}
                            className="w-full accent-indigo-600"
                        />
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">0:00.0</span>
                            <span className="font-medium text-indigo-600">{formatTime(localSettings.startTime)}</span>
                            <span className="text-gray-600">2:00.0</span>
                        </div>
                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={() => handleSettingChange('startTime', 0)}
                                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                            >
                                Start
                            </button>
                            <button
                                onClick={() => handleSettingChange('startTime', Math.max(0, localSettings.startTime - 1))}
                                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                disabled={localSettings.startTime <= 0}
                            >
                                -1s
                            </button>
                            <button
                                onClick={() => handleSettingChange('startTime', localSettings.startTime + 1)}
                                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                            >
                                +1s
                            </button>
                        </div>
                    </div>
                </div>

                {/* Apply Changes Button */}
                {Object.keys(pendingChanges).length > 0 && (
                    <button 
                        onClick={handleApplyChanges}
                        disabled={isProcessing}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors font-medium ${
                            isProcessing 
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                    >
                        {isProcessing ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Processing...
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                Apply Changes ({Object.keys(pendingChanges).length})
                            </>
                        )}
                    </button>
                )}

                {/* Action Buttons */}
                <div className="space-y-3 pt-4 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900">Actions</h4>
                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={handleDuplicate}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors text-sm"
                        >
                            <Copy className="w-4 h-4" />
                            Duplicate
                        </button>
                        <button 
                            onClick={handleExport}
                            className="flex items-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors text-sm"
                        >
                            <Download className="w-4 h-4" />
                            Export
                        </button>
                        <button 
                            onClick={handleReset}
                            className="flex items-center gap-2 px-3 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg transition-colors text-sm"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Reset
                        </button>
                        <button 
                            onClick={handleDelete}
                            className="flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors text-sm"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrackEditPanel;