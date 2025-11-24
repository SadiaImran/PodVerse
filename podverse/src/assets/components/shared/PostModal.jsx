import React, { useState, useEffect, useRef } from 'react';
import { X, Heart, MessageCircle, Play, Pause, Volume2, VolumeX, Eye, Tag, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProfileMarry from '../../images/icon-profile-marry.png';
import { supabase } from '../../supabaseClient.js';

/**
 * PostModal Component
 * 
 * A reusable modal component for displaying posts in full view
 * Opens when user clicks on a post thumbnail/card
 */
const PostModal = ({ 
  post, 
  isOpen, 
  onClose,
  onLike,
  onComment,
  onView,
  onTagClick
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [liked, setLiked] = useState(post?.user_liked || false);
  const [likesCount, setLikesCount] = useState(post?.likes_count || post?.likes || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(post?.comments || []);
  const [commentsCount, setCommentsCount] = useState(post?.comments_count || 0);
  const [commentInput, setCommentInput] = useState('');
  const [loadingComment, setLoadingComment] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const videoRef = useRef(null);
  const viewTracked = useRef(false);
  const commentInputRef = useRef(null);
  const navigate = useNavigate();

  // Fetch user profile from database
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (post?.user_id) {
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('full_name, username, profile_url')
            .eq('id', post.user_id)
            .single();
          
          if (profile && !error) {
            setUserProfile(profile);
          } else {
            console.error('Error fetching profile:', error);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    };
    
    if (post && isOpen) {
      fetchUserProfile();
    }
  }, [post, isOpen]);

  // Update state when post changes
  useEffect(() => {
    if (post) {
      setLiked(post.user_liked || false);
      setLikesCount(post.likes_count || post.likes || 0);
      setComments(post.comments || []);
      setCommentsCount(post.comments_count || 0);
      // Reset video state when post changes
      setIsPlaying(false);
      setIsMuted(true);
      setVideoLoaded(false);
      setVideoError(false);
      viewTracked.current = false;
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        videoRef.current.load(); // Reload video
      }
    }
  }, [post]);

  // Load video when modal opens
  useEffect(() => {
    if (isOpen && post && videoRef.current) {
      const video = videoRef.current;
      video.load();
      
      const handleCanPlay = () => {
        setVideoLoaded(true);
        setVideoError(false);
      };
      
      const handleError = () => {
        setVideoError(true);
        setVideoLoaded(false);
      };
      
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('error', handleError);
      
      return () => {
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
      };
    }
  }, [isOpen, post]);

  // Track view when modal opens
  useEffect(() => {
    if (isOpen && post && !viewTracked.current) {
      viewTracked.current = true;
      onView?.(post.id);
    }
  }, [isOpen, post, onView]);

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !post) return null;

  const videoUrl = post.video_url || post.media_url;
  const profile = post.profiles || {};
  // Use database profile if available, otherwise fallback to post profile
  const displayProfile = userProfile || profile;
  const profileName = displayProfile?.full_name || displayProfile?.username || profile?.full_name || profile?.username || 'Unknown';
  
  // Get profile image URL - prioritize database fetch
  const profileImageUrl = userProfile?.profile_url || profile?.profile_url || null;

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleLike = async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1));
    
    if (onLike) {
      await onLike(post.id, newLiked);
    }
  };

  const handleAddComment = async () => {
    if (!commentInput.trim() || loadingComment) return;
    
    setLoadingComment(true);
    try {
      if (onComment) {
        const newComment = await onComment(post.id, commentInput.trim());
        if (newComment) {
          setComments(prev => [newComment, ...prev]);
          setCommentsCount(prev => prev + 1);
          setCommentInput('');
        }
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setLoadingComment(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const now = new Date();
    const postTime = new Date(timestamp);
    const diffInMs = now - postTime;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return postTime.toLocaleDateString();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: '#e5e7eb', backgroundColor: '#ffffff' }}>
          <div className="flex items-center gap-3">
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt={profileName}
                className="w-10 h-10 rounded-full object-cover cursor-pointer flex-shrink-0 border-2"
                style={{ borderColor: '#A388E7' }}
                onClick={() => {
                  onClose();
                  navigate(`/profile/${profile?.id || post.user_id}`);
                }}
                onError={(e) => {
                  // Hide image and show initial on error
                  e.target.style.display = 'none';
                  const fallback = e.target.nextElementSibling;
                  if (fallback) {
                    fallback.style.display = 'flex';
                  }
                }}
              />
            ) : null}
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white cursor-pointer flex-shrink-0 border-2"
              style={{ 
                backgroundColor: '#6057C7', 
                borderColor: '#A388E7',
                display: profileImageUrl ? 'none' : 'flex'
              }}
              onClick={() => {
                onClose();
                navigate(`/profile/${profile?.id || post.user_id}`);
              }}
            >
              {profileName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 
                className="font-semibold text-sm cursor-pointer hover:underline"
                style={{ color: '#1C1C1C' }}
                onClick={() => {
                  onClose();
                  navigate(`/profile/${profile.id || post.user_id}`);
                }}
                onMouseEnter={(e) => e.target.style.color = '#6057C7'}
                onMouseLeave={(e) => e.target.style.color = '#1C1C1C'}
              >
                {profileName}
              </h3>
              <p className="text-xs" style={{ color: '#6A6A6A' }}>
                {formatTime(post.created_at)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: '#6A6A6A' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Video/Media Content - Compact YouTube style, 16:9 aspect ratio */}
        <div className="relative bg-black flex items-center justify-center overflow-hidden w-full" style={{ height: '320px', maxHeight: '40vh' }}>
          {videoUrl ? (
            <>
              {!videoLoaded && !videoError && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#6057C7' }}></div>
                </div>
              )}
              
              {videoError && (
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  <div className="text-center">
                    <Play size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Unable to load video</p>
                  </div>
                </div>
              )}
              
              <video
                ref={videoRef}
                src={videoUrl}
                className={`w-full h-full ${videoLoaded ? 'block' : 'hidden'}`}
                muted={isMuted}
                loop
                playsInline
                preload="auto"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onLoadedData={() => {
                  setVideoLoaded(true);
                  setVideoError(false);
                }}
                onError={() => {
                  setVideoError(true);
                  setVideoLoaded(false);
                }}
                style={{ 
                  display: videoLoaded ? 'block' : 'none',
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
              
              {/* Video Controls Overlay */}
              {videoLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-all group pointer-events-none">
                  <button
                    onClick={handlePlayPause}
                    className="w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-2xl pointer-events-auto"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    {isPlaying ? (
                      <Pause size={36} style={{ color: '#6057C7' }} />
                    ) : (
                      <Play size={36} fill="#6057C7" style={{ color: '#6057C7', marginLeft: '4px' }} />
                    )}
                  </button>
                  
                  {/* Mute button */}
                  <button
                    onClick={handleMuteToggle}
                    className="absolute bottom-5 right-5 p-3 rounded-full transition-all hover:scale-110 pointer-events-auto"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
                  >
                    {isMuted ? (
                      <VolumeX size={20} style={{ color: '#ffffff' }} />
                    ) : (
                      <Volume2 size={20} style={{ color: '#ffffff' }} />
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-white py-20">
              <Play size={48} className="mx-auto mb-4 opacity-50" />
              <p>No media available</p>
            </div>
          )}
        </div>

        {/* Post Details - YouTube style */}
        <div className="p-4 overflow-y-auto flex-1 bg-white" style={{ maxHeight: 'calc(90vh - 380px)' }}>
          {/* Title and Description */}
          <div className="mb-4">
            <h2 className="text-xl font-bold mb-2" style={{ color: '#1C1C1C' }}>
              {post.title || post.podcastTitle || 'Untitled'}
            </h2>
            {post.description && (
              <p className="text-sm leading-relaxed mb-3" style={{ color: '#3E3F5B' }}>
                {post.description}
              </p>
            )}
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (onTagClick) {
                      onTagClick(tag.name || tag);
                    }
                  }}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-all hover:scale-105 flex items-center gap-1.5"
                  style={{ 
                    backgroundColor: '#A388E7',
                    color: '#F9F5EB'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#6057C7';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#A388E7';
                  }}
                >
                  <Tag size={12} />
                  {tag.name || tag}
                </button>
              ))}
            </div>
          )}

          {/* Stats and Actions - YouTube style */}
          <div className="flex items-center gap-6 mb-4 pb-4 border-b" style={{ borderColor: '#e5e7eb' }}>
            <button
              onClick={handleLike}
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:bg-gray-50"
              style={{ color: liked ? '#6057C7' : '#6A6A6A' }}
            >
              <Heart size={18} fill={liked ? '#6057C7' : 'none'} strokeWidth={liked ? 0 : 2} />
              <span className="font-semibold text-sm">{likesCount}</span>
            </button>
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:bg-gray-50"
              style={{ color: '#6A6A6A' }}
            >
              <MessageCircle size={18} />
              <span className="font-semibold text-sm">{commentsCount}</span>
            </button>
            <div className="flex items-center gap-2" style={{ color: '#6A6A6A' }}>
              <Eye size={16} />
              <span className="text-sm font-medium">{post.views_count || post.views || 0} views</span>
            </div>
          </div>

          {/* Comments Section - YouTube style */}
          {showComments && (
            <div className="mt-3">
              <h3 className="font-semibold text-base mb-4" style={{ color: '#1C1C1C' }}>Comments ({commentsCount})</h3>
              
              {/* Comment Input */}
              <div className="flex gap-2 mb-5">
                <input
                  ref={commentInputRef}
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                  placeholder="Add a comment..."
                  className="flex-1 px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 transition-all text-sm"
                  style={{ 
                    borderColor: '#e5e7eb',
                    color: '#1C1C1C'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#A388E7';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                  }}
                />
                <button
                  onClick={handleAddComment}
                  disabled={!commentInput.trim() || loadingComment}
                  className="px-4 py-2.5 rounded-lg flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  style={{ 
                    backgroundColor: '#6057C7',
                    color: '#F9F5EB'
                  }}
                  onMouseEnter={(e) => {
                    if (!e.target.disabled) {
                      e.target.style.backgroundColor = '#2F2867';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.target.disabled) {
                      e.target.style.backgroundColor = '#6057C7';
                    }
                  }}
                >
                  <Send size={16} className="mr-1" />
                  Comment
                </button>
              </div>

              {/* Comments List */}
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {comments.length > 0 ? (
                  comments.map((comment, idx) => (
                    <div key={comment.id || idx} className="flex gap-3 pb-3 border-b last:border-0" style={{ borderColor: '#f3f4f6' }}>
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 text-xs"
                        style={{ backgroundColor: '#A388E7' }}
                      >
                        {(comment.full_name || comment.username || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-xs" style={{ color: '#1C1C1C' }}>
                            {comment.full_name || comment.username || 'User'}
                          </span>
                          <span className="text-xs" style={{ color: '#6A6A6A' }}>
                            {formatTime(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: '#3E3F5B' }}>
                          {comment.content || comment.text}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <MessageCircle size={24} className="mx-auto mb-2" style={{ color: '#d1d5db' }} />
                    <p className="text-xs font-medium" style={{ color: '#6A6A6A' }}>
                      No comments yet
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostModal;

