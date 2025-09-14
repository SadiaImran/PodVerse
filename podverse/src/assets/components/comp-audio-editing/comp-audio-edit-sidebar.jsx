import React, { useRef } from "react";
import { 
  Music, 
  Mic, 
  Upload, 
  Play, 
  Volume2, 
  Clock, 
  Zap,
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

export const Sidebar = () => {
  const fileInputRef = useRef(null);

  const handleFileUpload = (files) => {
    // Handle file upload logic here
    console.log('Files uploaded:', files);
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-screen">
      <div className="p-6 border-b border-gray-200 flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Audio Editor</h1>
        
        {/* Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-colors font-medium"
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
          <button className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 rounded-lg transition-colors">
            <Music className="w-5 h-5 text-gray-600" />
            <span className="text-gray-700">Audio</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 rounded-lg transition-colors">
            <Mic className="w-5 h-5 text-gray-600" />
            <span className="text-gray-700">Voice</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 rounded-lg transition-colors">
            <Headphones className="w-5 h-5 text-gray-600" />
            <span className="text-gray-700">Stock Music</span>
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Stock Music Section */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Stock Music</h3>
            <button className="text-blue-600 hover:text-blue-700 text-xs font-medium">
              View all
            </button>
          </div>
          
          {/* Genre Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {["All", "Recent", "Ambient", "Chill", "Electronic", "Cinematic", "Acoustic"].map((genre) => (
              <button 
                key={genre}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  genre === "All" 
                    ? "bg-blue-600 text-white border-blue-600" 
                    : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                }`}
              >
                {genre}
              </button>
            ))}
          </div>

          {/* Music Tracks */}
          <div className="space-y-3">
            {stockMusic.map((track, index) => (
              <div key={index} className="group flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-all duration-200">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-sm flex-shrink-0">
                  <Music className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 truncate mb-1">{track.name}</h4>
                  <p className="text-xs text-gray-500">{track.duration} • {track.genre}</p>
                </div>
                <button className="opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all">
                  <Play className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Sound Effects Section */}
        <div className="p-6 border-t border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Sound Effects</h3>
            <button className="text-blue-600 hover:text-blue-700 text-xs font-medium">
              View all
            </button>
          </div>
          
          {/* Category Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {["All", "Recent", "Cartoon", "Clicks"].map((category) => (
              <button 
                key={category}
                className="text-xs px-3 py-1 rounded-full border bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 transition-colors"
              >
                {category}
              </button>
            ))}
          </div>

          {/* Sound Effects */}
          <div className="space-y-3">
            {soundEffects.map((effect, index) => (
              <div key={index} className="group flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-all duration-200">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center shadow-sm flex-shrink-0">
                  <Radio className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-medium text-gray-900 truncate mb-1">{effect.name}</h4>
                  <p className="text-xs text-gray-500">{effect.duration}</p>
                </div>
                <button className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors">
                  <Play className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Extra content for testing scroll */}
        <div className="p-6 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Projects</h3>
          <div className="space-y-3">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-all duration-200">
                <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
                  <Volume2 className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">Project {i}</h4>
                  <p className="text-xs text-gray-500">Modified 2 days ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};