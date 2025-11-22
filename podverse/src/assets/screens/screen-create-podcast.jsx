import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Layers, UploadCloud, Film, BookmarkCheck, Clock, Eye, Heart, MessageCircle, Play, Trash2, Edit } from "lucide-react";
import BaseLayout from "../components/layouts/BaseLayout";
import banner2 from "../images/banner-2.png";
import { supabase } from "../supabaseClient.js";
import DeleteConfirmationModal from "../components/shared/DeleteConfirmationModal";
import PostModal from "../components/shared/PostModal";
import CreateProjectModal from "../components/shared/CreateProjectModal";

const API_BASE_URL = 'http://localhost:8000';

const CreatePodcastPage = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [activeTab, setActiveTab] = useState("drafts");
  const [posts, setPosts] = useState({
    drafts: [],
    published: [],
    saved: []
  });
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [error, setError] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, postId: null, postTitle: null });
  const [deleting, setDeleting] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Load user profile from Supabase
  useEffect(() => {
    const checkAuthAndLoadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const userId = user.id;

        // 1. FETCH PROFILE and ONBOARDING STATUS
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, onboarding_complete")
          .eq("id", userId)
          .maybeSingle();

        console.log("Profile check after login:", profile);

        if (!profile || profile.onboarding_complete === false) {
          console.log("Redirecting to onboarding...");
          return navigate("/onboarding", { replace: true });
        }

        setFullName(profile?.full_name || "User");
        await loadUserPosts(userId);
      } else {
        console.log("No user session found, redirecting to home.");
        navigate("/home", { replace: true });
      }
    };

    const loadUserPosts = async (userId) => {
      setLoadingPosts(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError("Please sign in to view your content.");
          setLoadingPosts(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/posts/user/${userId}?include=saved`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.detail || "Failed to load posts");
        }

        const result = await response.json();
        const userPosts = result.posts || [];
        const savedPosts = result.saved_posts || [];

        setPosts({
          drafts: userPosts.filter(post => post.status === 'draft'),
          published: userPosts.filter(post => post.status === 'published' || !post.status),
          saved: savedPosts
        });
      } catch (fetchError) {
        console.error("Error loading posts from API, trying Supabase fallback:", fetchError);
        
        // Fallback to Supabase
        try {
          const { data: postsData, error: postsError } = await supabase
            .from('posts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (!postsError && postsData) {
            setPosts({
              drafts: postsData.filter(post => post.status === 'draft'),
              published: postsData.filter(post => post.status === 'published' || !post.status),
              saved: []
            });
          } else {
            setError("Failed to load posts");
          }
        } catch (supabaseError) {
          console.error("Supabase fallback also failed:", supabaseError);
          setError("Failed to load posts");
        }
      } finally {
        setLoadingPosts(false);
        setLoadingSaved(false);
      }
    };

    checkAuthAndLoadProfile();
  }, [navigate]);

  const filteredVideos = useMemo(() => {
    switch (activeTab) {
      case 'drafts':
        return posts.drafts;
      case 'published':
        return posts.published;
      case 'saved':
        return posts.saved;
      default:
        return [];
    }
  }, [activeTab, posts]);

  const handleDeleteDraft = async () => {
    if (!deleteModal.postId) return;
    
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Please sign in to delete posts.");
        setDeleteModal({ open: false, postId: null, postTitle: null });
        setDeleting(false);
        return;
      }

      // Use Supabase directly since API endpoint might not exist
      const { error: deleteError } = await supabase
        .from('posts')
        .delete()
        .eq('id', deleteModal.postId)
        .eq('user_id', session.user.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      // Remove from local state
      setPosts(prev => ({
        ...prev,
        drafts: prev.drafts.filter(post => post.id !== deleteModal.postId)
      }));

      setDeleteModal({ open: false, postId: null, postTitle: null });
    } catch (err) {
      console.error("Error deleting draft:", err);
      setError("Failed to delete draft. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  // Handle like/unlike
  const handleLike = async (postId, liked) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const endpoint = 'like';
      const method = liked ? 'POST' : 'DELETE';
      const url = `${API_BASE_URL}/posts/${postId}/${endpoint}`;

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        // Update in all post arrays
        setPosts(prev => ({
          drafts: prev.drafts.map(p => p.id === postId ? { ...p, likes: result.likes_count, user_liked: result.liked } : p),
          published: prev.published.map(p => p.id === postId ? { ...p, likes: result.likes_count, user_liked: result.liked } : p),
          saved: prev.saved.map(p => p.id === postId ? { ...p, likes: result.likes_count, user_liked: result.liked } : p)
        }));
        
        // Update selected post if it's the one being liked
        if (selectedPost && selectedPost.id === postId) {
          setSelectedPost(prev => ({
            ...prev,
            likes: result.likes_count,
            user_liked: result.liked
          }));
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // Handle comment
  const handleComment = async (postId, content) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          post_id: postId,
          content: content
        }),
      });

      const result = await response.json();
      if (result.success) {
        // Update comments count in all post arrays
        setPosts(prev => ({
          drafts: prev.drafts.map(p => p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p),
          published: prev.published.map(p => p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p),
          saved: prev.saved.map(p => p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p)
        }));
        
        return result.comment;
      }
      return null;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  };

  // Handle view tracking
  const handleView = async (postId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${API_BASE_URL}/posts/${postId}/view`, {
        method: 'POST',
        headers: session ? {
          'Authorization': `Bearer ${session.access_token}`,
        } : {},
      });

      const result = await response.json();
      
      if (result.success && result.viewed) {
        // Update views in all post arrays
        setPosts(prev => ({
          drafts: prev.drafts.map(p => p.id === postId ? { ...p, views: result.views || (p.views || 0), views_count: result.views || (p.views_count || 0) } : p),
          published: prev.published.map(p => p.id === postId ? { ...p, views: result.views || (p.views || 0), views_count: result.views || (p.views_count || 0) } : p),
          saved: prev.saved.map(p => p.id === postId ? { ...p, views: result.views || (p.views || 0), views_count: result.views || (p.views_count || 0) } : p)
        }));
      }
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  // Handle tag click
  const handleTagClick = (tagName) => {
    navigate(`/search?q=${encodeURIComponent(tagName)}`);
  };

  return (
    <BaseLayout homeScreen={false} autoCollapse={true}>
      <main className="relative min-h-full" style={{ background: '#f3f4f6' }}>
        {/* Background Blobs - Contained */}
        <div className="fixed -top-28 -left-10 w-72 h-72 rounded-full blur-[120px] opacity-60 pointer-events-none z-0" style={{ background: '#b9a5ff' }} />
        <div className="fixed top-40 -right-10 w-96 h-96 rounded-full blur-[140px] opacity-40 pointer-events-none z-0" style={{ background: '#ffd5f6' }} />
        
        {/* Hero Banner */}
        <div className="relative h-64 md:h-80 overflow-hidden z-10">
          {banner2 && (
            <img 
              src={banner2}
              alt="PodVerse Banner" 
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-br from-[#6057C7]/40 via-[#8f7bff]/30 to-[#f6a9ff]/20" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/25" />
          <div className="relative z-10 flex items-center h-full px-6 md:px-10">
            <div className="text-white drop-shadow-lg">
              <h1 className="text-3xl md:text-4xl font-bold mb-3 font-subheadingDMSans">Welcome to PodVerse</h1>
              <p className="text-lg md:text-xl text-white/95 font-medium font-labelDMSans">Turn your ideas into podcasts that inspire and connect</p>
            </div>
          </div>
        </div>

        {/* Greeting Section */}
        <div className="relative px-6 md:px-10 py-8 z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold mb-2" style={{ color: '#6057C7' }}>
                Hello, {fullName} 👋
              </h2>
              <p className="text-base" style={{ color: '#6A6A6A' }}>Manage your content library</p>
            </div>
            
            {/* New Project Button */}
            <button 
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 rounded-full font-semibold shadow-md transition-all duration-200 flex items-center gap-2 hover:shadow-lg"
              style={{ backgroundColor: '#6057C7', color: '#F9F5EB' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#4f46e5';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#6057C7';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Plus size={20} />
              New Project
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="relative px-6 md:px-10 pb-16 z-10">
          <div className="rounded-[28px] border border-white/60 bg-white/85 backdrop-blur-xl shadow-[0_20px_60px_rgba(96,87,199,0.1)] p-6 md:p-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
              <div>
                <p className="text-sm uppercase tracking-[0.2em]" style={{ color: '#A388E7' }}>Content Library</p>
                <h2 className="text-2xl font-bold mt-1" style={{ color: '#6057C7' }}>Your Work</h2>
                <p className="text-sm mt-1" style={{ color: '#6A6A6A' }}>
                  {filteredVideos.length} {activeTab === 'drafts' ? 'draft' : activeTab === 'published' ? 'published' : 'saved'} {filteredVideos.length === 1 ? 'piece' : 'pieces'}
                </p>
              </div>
            </div>
          
            {/* Tabs */}
            <div className="flex items-center gap-2 bg-[#f5f3ff] rounded-full p-1 mb-8">
              {[
                { key: 'drafts', label: 'Drafts', count: posts.drafts.length, icon: Layers, color: '#A388E7' },
                { key: 'published', label: 'Published', count: posts.published.length, icon: UploadCloud, color: '#6057C7' },
                { key: 'saved', label: 'Saved', count: posts.saved.length, icon: BookmarkCheck, color: '#FF8DC7' },
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all ${
                      isActive ? 'shadow-md' : ''
                    }`}
                    style={
                      isActive
                        ? { backgroundColor: '#6057C7', color: '#F9F5EB' }
                        : { color: '#6057C7' }
                    }
                    onClick={() => setActiveTab(tab.key)}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.target.style.backgroundColor = '#e9e5ff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.target.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <Icon size={18} />
                    {tab.label}
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      isActive ? 'bg-white/20' : 'bg-white/60'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Videos Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loadingPosts ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <div key={`skeleton-${index}`} className="bg-white/60 border border-white/70 rounded-2xl p-4 animate-pulse space-y-4">
                    <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl" />
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                ))
              ) : filteredVideos.length > 0 ? (
                filteredVideos.map((video) => {
                  const videoUrl = video.video_url || video.media_url;
                  const thumbnailUrl = video.thumbnail_url || videoUrl;
                  const title = video.title || video.podcastTitle || 'Untitled';
                  
                  return (
                    <div 
                      key={video.id} 
                      className="group bg-white/80 border border-white/70 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer"
                      onClick={() => {
                        if (activeTab === 'drafts') {
                          // For drafts, still navigate to edit
                          navigate(`/podcast-setup?post=${video.id}`);
                        } else {
                          // For published and saved, open in modal
                          setSelectedPost(video);
                          setIsPostModalOpen(true);
                        }
                      }}
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-video bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 overflow-hidden">
                        {thumbnailUrl ? (
                          <img 
                            src={thumbnailUrl} 
                            alt={title} 
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-white/80">
                            <Film size={32} />
                            <p className="text-xs mt-2">No preview</p>
                          </div>
                        )}
                        
                        {/* Status Badge */}
                        <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm shadow-md"
                          style={{
                            backgroundColor: activeTab === 'drafts' ? 'rgba(254, 243, 199, 0.9)' : activeTab === 'published' ? 'rgba(220, 252, 231, 0.9)' : 'rgba(224, 242, 254, 0.9)',
                            color: activeTab === 'drafts' ? '#92400e' : activeTab === 'published' ? '#166534' : '#075985'
                          }}>
                          {activeTab === 'drafts' ? 'Draft' : activeTab === 'published' ? 'Published' : 'Saved'}
                        </div>
                        
                        {/* Play Overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl"
                              style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
                              <Play size={24} fill="#6057C7" style={{ color: '#6057C7', marginLeft: '2px' }} />
                            </div>
                          </div>
                        </div>
                        
                        {/* Duration */}
                        {video.duration && (
                          <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-semibold text-white">
                            {video.duration}
                          </div>
                        )}
                      </div>
                      
                      {/* Info */}
                      <div className="p-5 space-y-3">
                        <h4 className="font-semibold text-base line-clamp-2 group-hover:underline transition-all" style={{ color: '#1C1C1C' }}>
                          {title}
                        </h4>
                        
                        {video.description && (
                          <p className="text-sm line-clamp-2" style={{ color: '#6A6A6A' }}>
                            {video.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs" style={{ color: '#6A6A6A' }}>
                          <div className="flex items-center gap-1.5">
                            <Eye size={14} />
                            <span>{video.views_count || video.views || 0} views</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock size={14} />
                            <span>{new Date(video.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      {activeTab === 'drafts' && (
                        <div className="px-5 pb-5 flex gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/podcast-setup?post=${video.id}`);
                            }}
                            className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm"
                            style={{ backgroundColor: '#6057C7', color: '#F9F5EB' }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#2F2867'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#6057C7'}
                          >
                            <Edit size={14} className="inline mr-2" />
                            Continue
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteModal({ 
                                open: true, 
                                postId: video.id, 
                                postTitle: title 
                              });
                            }}
                            className="px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all"
                            style={{ borderColor: '#e5e7eb', color: '#6A6A6A' }}
                            onMouseEnter={(e) => {
                              e.target.style.borderColor = '#ef4444';
                              e.target.style.color = '#ef4444';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.borderColor = '#e5e7eb';
                              e.target.style.color = '#6A6A6A';
                            }}
                          >
                            <Trash2 size={14} className="inline" />
                          </button>
                        </div>
                      )}
                      
                      {activeTab === 'saved' && (
                        <div className="px-5 pb-5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/profile/${video.user_id}`);
                            }}
                            className="w-full text-sm font-semibold px-4 py-2.5 rounded-xl border transition-all"
                            style={{ borderColor: '#e5e7eb', color: '#6057C7' }}
                            onMouseEnter={(e) => {
                              e.target.style.borderColor = '#A388E7';
                              e.target.style.backgroundColor = '#f5f3ff';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.borderColor = '#e5e7eb';
                              e.target.style.backgroundColor = 'transparent';
                            }}
                          >
                            View Creator
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full text-center py-16">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
                    style={{ backgroundColor: '#f5f3ff' }}>
                    {activeTab === 'drafts' ? (
                      <Layers size={32} style={{ color: '#A388E7' }} />
                    ) : activeTab === 'published' ? (
                      <UploadCloud size={32} style={{ color: '#6057C7' }} />
                    ) : (
                      <BookmarkCheck size={32} style={{ color: '#FF8DC7' }} />
                    )}
                  </div>
                  <p className="text-lg font-semibold mb-2" style={{ color: '#1C1C1C' }}>
                    No {activeTab} content yet
                  </p>
                  <p className="text-sm mb-6" style={{ color: '#6A6A6A' }}>
                    {activeTab === 'drafts' 
                      ? 'Start creating and your drafts will appear here'
                      : activeTab === 'published'
                      ? 'Publish your first piece to see it here'
                      : 'Save posts from creators you follow'}
                  </p>
                  {activeTab === 'drafts' && (
                    <button
                      onClick={() => navigate("/podcast-setup")}
                      className="px-6 py-3 rounded-full font-semibold shadow-md transition-all"
                      style={{ backgroundColor: '#6057C7', color: '#F9F5EB' }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#2F2867'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#6057C7'}
                    >
                      <Plus size={18} className="inline mr-2" />
                      Create Your First Draft
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={deleteModal.open}
          onClose={() => setDeleteModal({ open: false, postId: null, postTitle: null })}
          onConfirm={handleDeleteDraft}
          title="Delete Draft?"
          message="Are you sure you want to delete this draft? This action cannot be undone."
          itemName={deleteModal.postTitle || 'this draft'}
          isLoading={deleting}
          confirmText="Delete"
          cancelText="Cancel"
        />

        {/* Post Modal */}
        <PostModal
          post={selectedPost}
          isOpen={isPostModalOpen}
          onClose={() => {
            setIsPostModalOpen(false);
            setSelectedPost(null);
          }}
          onLike={handleLike}
          onComment={handleComment}
          onView={handleView}
          onTagClick={handleTagClick}
        />

        {/* Create Project Modal */}
        <CreateProjectModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onProceed={() => {
            setShowCreateModal(false);
            navigate("/podcast-setup");
          }}
        />
      </main>
    </BaseLayout>
  );
};

export default CreatePodcastPage;