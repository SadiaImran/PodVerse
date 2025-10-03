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
    Trash2
} from 'lucide-react';

const TrackEditPanel = ({ track, isVisible, onClose, onUpdate, onDuplicate, onDelete, onExport, onReset }) => {
    const [localSettings, setLocalSettings] = useState({
        volume: 100,
        speed: 1.0,
        duration: track?.duration || 0,
        startTime: track?.startTime || 0
    });

    useEffect(() => {
        if (track) {
            setLocalSettings({
                volume: track.volume || 100,
                speed: track.speed || 1.0,
                duration: track.duration,
                startTime: track.startTime || 0
            });
        }
    }, [track]);

    if (!isVisible || !track) return null;

    const handleSettingChange = (key, value) => {
        const newSettings = { ...localSettings, [key]: value };
        setLocalSettings(newSettings);
        onUpdate && onUpdate(track.id, newSettings);
    };

    const handleDuplicate = () => {
        onDuplicate && onDuplicate(track.id);
    };

    const handleExport = () => {
        onExport && onExport(track.id);
    };

    const handleReset = () => {
        const resetSettings = {
            volume: 100,
            speed: 1.0,
            startTime: 0
        };
        setLocalSettings(prev => ({ ...prev, ...resetSettings }));
        onReset && onReset(track.id, resetSettings);
    };

    const handleDelete = () => {
        if (window.confirm(`Are you sure you want to delete "${track.name}"?`)) {
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
                            <p className="text-sm text-gray-600">{track.name}</p>
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
                        Volume
                    </h4>
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <VolumeX className="w-4 h-4 text-gray-400" />
                            <input
                                type="range"
                                min="0"
                                max="200"
                                value={localSettings.volume}
                                onChange={(e) => handleSettingChange('volume', parseInt(e.target.value))}
                                className="flex-1 accent-indigo-600"
                            />
                            <Volume2 className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">0%</span>
                            <span className="font-medium text-indigo-600">{localSettings.volume}%</span>
                            <span className="text-gray-600">200%</span>
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

                {/* Speed Control */}
                <div className="space-y-3">
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-indigo-600" />
                        Playback Speed
                    </h4>
                    <div className="space-y-2">
                        <input
                            type="range"
                            min="0.25"
                            max="3"
                            step="0.05"
                            value={localSettings.speed}
                            onChange={(e) => handleSettingChange('speed', parseFloat(e.target.value))}
                            className="w-full accent-indigo-600"
                        />
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">0.25x</span>
                            <span className="font-medium text-indigo-600">{localSettings.speed.toFixed(2)}x</span>
                            <span className="text-gray-600">3.0x</span>
                        </div>
                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={() => handleSettingChange('speed', 0.5)}
                                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                            >
                                0.5x
                            </button>
                            <button
                                onClick={() => handleSettingChange('speed', 1.0)}
                                className="px-3 py-1 text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded transition-colors"
                            >
                                1.0x
                            </button>
                            <button
                                onClick={() => handleSettingChange('speed', 1.5)}
                                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                            >
                                1.5x
                            </button>
                            <button
                                onClick={() => handleSettingChange('speed', 2.0)}
                                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                            >
                                2.0x
                            </button>
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
                                onClick={() => handleSettingChange('startTime', localSettings.startTime - 1)}
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