import React, { useRef } from "react";
import { 
  Music, 
  Mic, 
  Upload, 
  Play, 
  Volume2, 
  Headphones,
  Radio
} from "lucide-react";

const stockMusic = [
  { name: "Sunset Garden", duration: "2:14", genre: "Ambient" },
  { name: "Chill Cafe Vibes", duration: "3:10", genre: "Chill" },
  { name: "Urban Beats Vol. 3", duration: "3:20", genre: "Electronic" },
  { name: "Lofi Background Vlog Hip Hop", duration: "2:01", genre: "Lofi" },
  { name: "Synthwave Memories", duration: "2:56", genre: "Synthwave" }
];

const soundEffects = [
  { name: "Retro Bit Singing (Robotic, Quiet...)", duration: "2:14" },
  { name: "Large Crowd Medium Outdoor - Cl...", duration: "0:32" },
  { name: "Tura Fm Radio", duration: "0:03" },
  { name: "Tail Error Miracle Out of Time Sn...", duration: "0:05" }
];

export const Sidebar = ({ onFileUpload, audioTracks }) => {
  const fileInputRef = useRef(null);

  const handleFileUpload = (files) => {
    // Call the parent's file upload handler
    if (onFileUpload && files.length > 0) {
      onFileUpload(files);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* Custom CSS for purple theme */}
      <style>{`
        :root {
          --primary: 270 95% 65%;
          --primary-foreground: 0 0% 100%;
          --primary-muted: 270 70% 45%;
        }
      `}</style>

      {/* Header - Fixed */}
      <div className="p-6 border-b border-gray-200 flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Audio Editor</h1>
        
        {/* Upload Button - Purple themed */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg transition-colors font-medium shadow-sm"
        >
          <Upload size={20} />
          Upload Audio
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="audio/*"
          className="hidden"
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
        />
      </div>
    
      {/* Navigation - Fixed */}
      <div className="p-6 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Navigation
        </h2>
        <div className="space-y-2">
          <button className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors group">
            <Music className="w-5 h-5 text-gray-600 group-hover:text-purple-600" />
            <span className="text-gray-700 group-hover:text-purple-700">Audio</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors group">
            <Mic className="w-5 h-5 text-gray-600 group-hover:text-purple-600" />
            <span className="text-gray-700 group-hover:text-purple-700">Voice</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-left bg-purple-100 text-purple-700 rounded-lg transition-colors">
            <Headphones className="w-5 h-5 text-purple-600" />
            <span className="text-purple-700 font-medium">Stock Music</span>
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Uploaded Files Section - NEW: Shows uploaded files */}
        {audioTracks && audioTracks.length > 0 && (
          <div className="p-6 border-b border-purple-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Uploaded Files ({audioTracks.length})</h3>
            <div className="space-y-3">
              {audioTracks.map((track) => (
                <div key={track.id} className="group flex items-center gap-3 p-3 rounded-lg hover:bg-purple-50 cursor-pointer transition-all duration-200 border border-transparent hover:border-purple-100">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-sm flex-shrink-0">
                    <Music className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-medium text-gray-900 truncate mb-1 group-hover:text-purple-900">{track.name}</h4>
                    <p className="text-xs text-gray-500 group-hover:text-purple-600">{formatDuration(track.duration)}</p>
                  </div>
                  <div className="w-6 h-6 flex items-center justify-center bg-purple-600 text-white rounded-full shadow-sm">
                    <Play className="w-3 h-3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stock Music Section */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Stock Music</h3>
            <button className="text-purple-600 hover:text-purple-700 text-xs font-medium">
              View all
            </button>
          </div>
          
          {/* Genre Tags - Purple themed */}
          <div className="flex flex-wrap gap-2 mb-6">
            {["All", "Recent", "Ambient", "Chill", "Electronic", "Cinematic", "Acoustic"].map((genre) => (
              <button 
                key={genre}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  genre === "All" 
                    ? "bg-purple-600 text-white border-purple-600 shadow-sm" 
                    : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700"
                }`}
              >
                {genre}
              </button>
            ))}
          </div>

          {/* Music Tracks - Purple themed */}
          <div className="space-y-3">
            {stockMusic.map((track, index) => (
              <div key={index} className="group flex items-center gap-4 p-3 rounded-lg hover:bg-purple-50 cursor-pointer transition-all duration-200 border border-transparent hover:border-purple-100">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-sm flex-shrink-0">
                  <Music className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 truncate mb-1 group-hover:text-purple-900">{track.name}</h4>
                  <p className="text-xs text-gray-500 group-hover:text-purple-600">{track.duration} • {track.genre}</p>
                </div>
                <button className="opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-all shadow-sm">
                  <Play className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Sound Effects Section - Purple themed */}
        <div className="p-6 border-t border-purple-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Sound Effects</h3>
            <button className="text-purple-600 hover:text-purple-700 text-xs font-medium">
              View all
            </button>
          </div>
          
          {/* Category Tags - Purple themed */}
          <div className="flex flex-wrap gap-2 mb-6">
            {["All", "Recent", "Cartoon", "Clicks"].map((category) => (
              <button 
                key={category}
                className="text-xs px-3 py-1 rounded-full border bg-gray-50 text-gray-700 border-gray-200 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 transition-colors"
              >
                {category}
              </button>
            ))}
          </div>

          {/* Sound Effects - Purple themed */}
          <div className="space-y-3">
            {soundEffects.map((effect, index) => (
              <div key={index} className="group flex items-center gap-3 p-3 rounded-lg hover:bg-purple-50 cursor-pointer transition-all duration-200 border border-transparent hover:border-purple-100">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 flex items-center justify-center shadow-sm flex-shrink-0">
                  <Radio className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-medium text-gray-900 truncate mb-1 group-hover:text-purple-900">{effect.name}</h4>
                  <p className="text-xs text-gray-500 group-hover:text-purple-600">{effect.duration}</p>
                </div>
                <button className="w-8 h-8 flex items-center justify-center bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors shadow-sm">
                  <Play className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};