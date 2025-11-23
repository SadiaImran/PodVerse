import { useState } from 'react';
import {
  FaTrash, FaSearch,
  FaImage, FaVideo, FaMusic, FaUpload, FaDownload, FaEye, FaPlay,FaFileAlt, FaFolder,
  FaChartLine, FaDatabase
} from 'react-icons/fa';

const MediaLibrary = () => {
    const [activeTab, setActiveTab] = useState('videos');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('grid');
  
    const videos = [
      { id: 1, title: 'Intro Video', url: 'video1.mp4', size: '45 MB', duration: '5:30', uploadedBy: 'Admin', date: '2024-01-15', views: 1200 },
      { id: 2, title: 'Tutorial Episode 1', url: 'tutorial1.mp4', size: '120 MB', duration: '15:45', uploadedBy: 'Content Team', date: '2024-01-12', views: 890 },
      { id: 3, title: 'Product Demo', url: 'demo.mp4', size: '89 MB', duration: '8:20', uploadedBy: 'Marketing', date: '2024-01-10', views: 1500 }
    ];
  
    const audio = [
      { id: 1, title: 'Background Music 1', url: 'music1.mp3', size: '5 MB', duration: '3:45', type: 'Music', date: '2024-01-14' },
      { id: 2, title: 'Intro Jingle', url: 'jingle.mp3', size: '2 MB', duration: '0:30', type: 'Jingle', date: '2024-01-13' },
      { id: 3, title: 'Ambient Sounds', url: 'ambient.mp3', size: '8 MB', duration: '5:00', type: 'Effects', date: '2024-01-12' },
      { id: 4, title: 'Podcast Theme', url: 'theme.mp3', size: '4 MB', duration: '2:15', type: 'Music', date: '2024-01-11' }
    ];
  
    const images = [
      { id: 1, title: 'Cover Art 1', url: 'cover1.jpg', size: '2 MB', dimensions: '1920x1080', type: 'Cover', date: '2024-01-15' },
      { id: 2, title: 'Thumbnail 1', url: 'thumb1.jpg', size: '500 KB', dimensions: '1280x720', type: 'Thumbnail', date: '2024-01-14' },
      { id: 3, title: 'Banner Image', url: 'banner.jpg', size: '3 MB', dimensions: '2560x1440', type: 'Banner', date: '2024-01-13' },
      { id: 4, title: 'Profile Background', url: 'bg.jpg', size: '1.5 MB', dimensions: '1920x1080', type: 'Background', date: '2024-01-12' }
    ];
  
    return (
      <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 min-h-screen">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <FaFolder className="text-purple-400" />
            Media Library
          </h1>
          <p className="text-gray-400">Manage all your media files</p>
        </div>
  
        {/* Tabs */}
        <div className="bg-slate-800 rounded-lg p-1 inline-flex gap-1 mb-6">
          <button
            onClick={() => setActiveTab('videos')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'videos'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FaVideo className="inline mr-2" />
            Videos
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'audio'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FaMusic className="inline mr-2" />
            Audio
          </button>
          <button
            onClick={() => setActiveTab('images')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'images'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FaImage className="inline mr-2" />
            Images
          </button>
        </div>
  
        {/* Toolbar */}
        <div className="bg-slate-800 rounded-lg p-4 mb-6 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2">
            <FaUpload />
            Upload {activeTab.slice(0, -1)}
          </button>
        </div>
  
        {/* Storage Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Total Storage</span>
              <FaDatabase className="text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-white">2.5 GB / 10 GB</p>
            <div className="mt-3 bg-slate-700 rounded-full h-2">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 h-2 rounded-full" style={{width: '25%'}}></div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Total Files</span>
              <FaFileAlt className="text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white">156</p>
            <p className="text-sm text-gray-500 mt-1">Across all media types</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Bandwidth Used</span>
              <FaChartLine className="text-green-400" />
            </div>
            <p className="text-2xl font-bold text-white">45 GB</p>
            <p className="text-sm text-gray-500 mt-1">This month</p>
          </div>
        </div>
  
        {/* Media Grid */}
        {activeTab === 'videos' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map(video => (
              <div key={video.id} className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700 hover:border-purple-500 transition-all">
                <div className="aspect-video bg-slate-700 flex items-center justify-center">
                  <FaVideo className="text-6xl text-gray-600" />
                </div>
                <div className="p-4">
                  <h3 className="text-white font-semibold mb-2">{video.title}</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-400 mb-3">
                    <span>Size: {video.size}</span>
                    <span>Duration: {video.duration}</span>
                    <span>Views: {video.views}</span>
                    <span>By: {video.uploadedBy}</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all text-sm">
                      <FaPlay className="inline mr-1" /> Play
                    </button>
                    <button className="px-3 py-2 bg-slate-700 text-blue-400 rounded-lg hover:bg-slate-600 transition-all">
                      <FaDownload />
                    </button>
                    <button className="px-3 py-2 bg-slate-700 text-red-400 rounded-lg hover:bg-slate-600 transition-all">
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
  
        {activeTab === 'audio' && (
          <div className="grid gap-4">
            {audio.map(item => (
              <div key={item.id} className="bg-slate-800 rounded-lg p-4 hover:bg-slate-750 transition-all border border-slate-700 flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <FaMusic className="text-2xl text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>{item.size}</span>
                    <span>{item.duration}</span>
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">{item.type}</span>
                    <span>{item.date}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all">
                    <FaPlay className="inline mr-1" /> Play
                  </button>
                  <button className="p-2 text-blue-400 hover:bg-slate-700 rounded-lg transition-all">
                    <FaDownload />
                  </button>
                  <button className="p-2 text-red-400 hover:bg-slate-700 rounded-lg transition-all">
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
  
        {activeTab === 'images' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map(img => (
              <div key={img.id} className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700 hover:border-purple-500 transition-all">
                <div className="aspect-video bg-slate-700 flex items-center justify-center">
                  <FaImage className="text-6xl text-gray-600" />
                </div>
                <div className="p-3">
                  <h3 className="text-white font-semibold text-sm mb-2">{img.title}</h3>
                  <div className="text-xs text-gray-400 space-y-1 mb-3">
                    <p>{img.dimensions}</p>
                    <p>{img.size}</p>
                    <span className="inline-block px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded">{img.type}</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 px-2 py-1 bg-slate-700 text-white rounded hover:bg-slate-600 transition-all text-xs">
                      <FaEye className="inline" />
                    </button>
                    <button className="px-2 py-1 bg-slate-700 text-blue-400 rounded hover:bg-slate-600 transition-all text-xs">
                      <FaDownload />
                    </button>
                    <button className="px-2 py-1 bg-slate-700 text-red-400 rounded hover:bg-slate-600 transition-all text-xs">
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };
export default MediaLibrary;  