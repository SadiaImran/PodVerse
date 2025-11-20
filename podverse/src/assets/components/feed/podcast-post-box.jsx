import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Video, Library, X, Play, Clock } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import ProfileMarry from "../../images/icon-profile-marry.png";
import { supabase } from "../../supabaseClient.js";

const API_BASE_URL = 'http://localhost:8000';

function PodcastPostBox() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [libraryVideos, setLibraryVideos] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from("profiles")
          .select("profile_url, full_name")
          .eq("id", user.id)
          .single();
        if (data) setUserProfile(data);
      }
    };
    fetchProfile();
  }, [user]);

  const fetchLibraryVideos = async () => {
    if (!user?.id) return;
    
    setLoadingVideos(true);
    try {
      // Fetch user's posts that might be drafts or incomplete
      // For now, we'll fetch all user posts - you can add a status field later
      const { data, error } = await supabase
        .from("posts")
        .select("id, title, description, video_url, thumbnail_url, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setLibraryVideos(data || []);
    } catch (error) {
      console.error("Error fetching library videos:", error);
    } finally {
      setLoadingVideos(false);
    }
  };

  const handleLibraryClick = () => {
    setShowLibraryModal(true);
    fetchLibraryVideos();
  };

  const handleCreateNewClick = () => {
    setShowCreateConfirm(true);
  };

  const confirmCreateNew = () => {
    setShowCreateConfirm(false);
    navigate('/agent-setup');
  };

  const profileUrl = userProfile?.profile_url || ProfileMarry;
  const profileName = userProfile?.full_name || user?.email?.split("@")[0] || "You";

  return (
    <>
      <div className="bg-gradient-to-br from-purple-50 via-pink-50/50 to-white p-6 rounded-2xl shadow-lg border-2 border-purple-100 mb-6 hover:shadow-xl transition-all">
        <div className="flex items-start gap-4">
          <img
            src={profileUrl}
            alt={profileName}
            className="w-12 h-12 rounded-full object-cover border-2 border-purple-300 ring-2 ring-purple-100 flex-shrink-0"
            onError={(e) => {
              e.target.src = ProfileMarry;
            }}
          />
          <div className="flex-1">
            <div className="mb-4">
              <h3 className="font-bold text-gray-900 mb-1 text-lg">Create a new post</h3>
              <p className="text-sm text-gray-600">Share your podcast video with your followers</p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleLibraryClick}
                className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 transition-all group shadow-lg shadow-blue-500/30"
              >
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                  <Library size={24} />
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold text-sm text-white">From Library</p>
                  <p className="text-xs text-white/80 mt-0.5">Choose existing</p>
                </div>
              </button>

              <button
                onClick={handleCreateNewClick}
                className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all group shadow-lg shadow-purple-500/30"
              >
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                  <Video size={24} />
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold text-sm text-white">Create New</p>
                  <p className="text-xs text-white/80 mt-0.5">Record podcast</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Library Modal */}
      {showLibraryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl p-6 md:p-8 relative max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Your Library</h2>
                <p className="text-sm text-gray-500 mt-1">Select a video to post</p>
              </div>
              <button
                className="text-gray-400 hover:text-red-500 text-2xl transition-colors"
                onClick={() => setShowLibraryModal(false)}
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingVideos ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : libraryVideos.length === 0 ? (
                <div className="text-center py-12">
                  <Library size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 font-medium">No videos in library</p>
                  <p className="text-sm text-gray-500 mt-2">Create a new podcast to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {libraryVideos.map((video) => (
                    <div
                      key={video.id}
                      className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
                      onClick={() => {
                        // Navigate to post creation/edit with this video
                        navigate(`/create-podcast?video=${video.id}`);
                        setShowLibraryModal(false);
                      }}
                    >
                      <div className="relative aspect-video bg-gray-100">
                        {video.thumbnail_url ? (
                          <img
                            src={video.thumbnail_url}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
                            <Play className="w-12 h-12 text-purple-400" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                          <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="w-6 h-6 text-purple-600 ml-1" />
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-1">
                          {video.title || 'Untitled Video'}
                        </h3>
                        {video.description && (
                          <p className="text-xs text-gray-500 line-clamp-2 mb-2">{video.description}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Clock size={12} />
                          <span>{new Date(video.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create New Confirmation Modal */}
      {showCreateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 md:p-8 relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-2xl transition-colors"
              onClick={() => setShowCreateConfirm(false)}
              aria-label="Close"
            >
              <X size={24} />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Create New Podcast?</h2>
              <p className="text-gray-600">Do you want to make a new podcast?</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateConfirm(false)}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmCreateNew}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all font-semibold shadow-lg shadow-purple-500/30"
              >
                Yes, Create
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PodcastPostBox;
