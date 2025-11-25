import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Play, Pause, Volume2, VolumeX, Eye, Tag, MoreVertical, Bookmark, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProfileMarry from '../../images/icon-profile-marry.png';
import { supabase } from '../../supabaseClient';

/**
 * Premium PostCard Component
 * 
 * A beautiful, reusable social media post card component with Dribbble-quality UI
 * Features:
 * - Modern glassmorphism design
 * - Smooth animations and transitions
 * - Interactive video player
 * - Comments section
 * - Like/Bookmark actions
 * - Tag support
 * - Responsive design
 */

const API_BASE_URL = 'http://localhost:8000';

const PostCard = ({ 
  post, 
  onLike, 
  onComment, 
  onView, 
  onTagClick,
  onBookmark,
  variant = 'default' // 'default', 'compact', 'featured'
}) => {
  const [liked, setLiked] = useState(post.user_liked || false);
  const [bookmarked, setBookmarked] = useState(post.user_bookmarked || false);
  const [likesCount, setLikesCount] = useState(post.likes || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(post.comments || []);
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [loadingComment, setLoadingComment] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const videoRef = useRef(null);
  const commentInputRef = useRef(null);
  const viewTracked = useRef(false);
  const navigate = useNavigate();

  // Track view when video starts playing
  useEffect(() => {
    if (videoRef.current && isPlaying && !viewTracked.current) {
      viewTracked.current = true;
      onView?.(post.id);
    }
  }, [isPlaying, post.id, onView]);

  // Update state when post prop changes
  useEffect(() => {
    setLiked(post.user_liked || false);
    setLikesCount(post.likes || 0);
    setComments(post.comments || []);
    setCommentsCount(post.comments_count || 0);
    setBookmarked(post.user_bookmarked || false);
    setSummaryData(null);
    setSummaryVisible(false);
    setSummaryError(null);
    setSummaryLoading(false);
  }, [post]);

  const handleVideoPlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMute = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1));
    
    if (onLike) {
      await onLike(post.id, newLiked);
    }
  };

  const handleBookmark = async (e) => {
    e.stopPropagation();
    const newBookmarked = !bookmarked;
    setBookmarked(newBookmarked);
    
    if (onBookmark) {
      await onBookmark(post.id, newBookmarked);
    }
  };

  const handleAddComment = async () => {
    const content = commentInputRef.current?.value?.trim();
    if (!content) return;

    setLoadingComment(true);
    try {
      if (onComment) {
        const newComment = await onComment(post.id, content);
        if (newComment) {
          setComments(prev => [newComment, ...prev]);
          setCommentsCount(prev => prev + 1);
          commentInputRef.current.value = '';
        }
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setLoadingComment(false);
    }
  };

  const handleToggleSummary = async (e) => {
    e?.stopPropagation?.();

    if (summaryVisible) {
      setSummaryVisible(false);
      return;
    }

    if (summaryData) {
      setSummaryVisible(true);
      return;
    }

    if (!post.transcript_url) {
      setSummaryError('Transcript is not available for this post yet.');
      setSummaryVisible(true);
      return;
    }

    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSummaryError('Please sign in to view the summary.');
        setSummaryLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/posts/${post.id}/summary`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        setSummaryData(result);
        setSummaryVisible(true);
      } else {
        setSummaryError(result.detail || result.message || 'Failed to generate summary.');
        setSummaryVisible(true);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
      setSummaryError(error.message || 'Failed to generate summary.');
      setSummaryVisible(true);
    } finally {
      setSummaryLoading(false);
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

  const profile = post.profiles || {};
  const profileUrl = profile.profile_url || ProfileMarry;
  const profileName = profile.full_name || profile.username || 'Unknown';

  const isCompact = variant === 'compact';
  const isFeatured = variant === 'featured';
  const canSummarize = Boolean(post.transcript_url);
  const shouldRenderSummarySection = canSummarize || summaryData || summaryError || summaryLoading;

  return (
    <article 
      className={`
        group relative
        bg-white dark:bg-gray-900
        rounded-3xl
        shadow-md hover:shadow-2xl
        border-2
        overflow-hidden
        transition-all duration-500 ease-out
        ${isFeatured ? 'ring-2 ring-indigo-500/20' : ''}
        ${isHovered ? 'scale-[1.01]' : ''}
        w-full
      `}
      style={{ borderColor: '#e5e7eb' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header Section */}
      <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-50 dark:border-gray-800/50">
        <div 
          className="flex items-center gap-3 cursor-pointer group/profile flex-1 min-w-0"
          onClick={() => navigate(`/profile/${profile.id || post.user_id}`)}
        >
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 rounded-full opacity-0 group-hover/profile:opacity-100 blur-md transition-opacity duration-300" style={{ backgroundColor: '#A388E7' }} />
            <img
              src={profileUrl}
              alt={profileName}
              className="relative w-12 h-12 rounded-full object-cover border-2 border-white dark:border-gray-800 ring-2 ring-gray-100 dark:ring-gray-700 transition-all duration-300"
              style={{ ringColor: '#A388E7' }}
              onError={(e) => {
                e.target.src = ProfileMarry;
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm transition-colors truncate"
              style={{ color: '#1C1C1C' }}
              onMouseEnter={(e) => {
                e.target.style.color = '#6057C7';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = '#1C1C1C';
              }}
            >
              {profileName}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-gray-500 dark:text-gray-400 text-xs">{formatTime(post.created_at)}</p>
            </div>
          </div>
        </div>

        {/* More Menu */}
        <div className="relative flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <MoreVertical size={18} className="text-gray-500 dark:text-gray-400" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 z-50">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleBookmark(e);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <Bookmark size={16} className={bookmarked ? 'fill-current' : ''} />
                {bookmarked ? 'Remove bookmark' : 'Save post'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content Section */}
      {(post.title || post.description) && (
        <div className="px-6 pt-5 pb-4">
          {post.title && (
            <h2 className="text-xl font-bold mb-2 leading-tight" style={{ color: '#6057C7' }}>
              {post.title}
            </h2>
          )}
          {post.description && (
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed line-clamp-3">
              {post.description}
            </p>
          )}
        </div>
      )}

      {/* Tags Section */}
      {post.tags && post.tags.length > 0 && (
        <div className="px-6 pb-4">
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <button
                key={tag.id || tag.tag_id}
                onClick={(e) => {
                  e.stopPropagation();
                  onTagClick?.(tag.name || tag.tag?.name);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer group/tag hover:scale-105 border"
                style={{
                  backgroundColor: '#A388E7',
                  color: '#F9F5EB',
                  borderColor: '#7d6ce3'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#7d6ce3';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#A388E7';
                }}
              >
                <Tag size={12} className="group-hover/tag:rotate-12 transition-transform" />
                <span>#{tag.name || tag.tag?.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {shouldRenderSummarySection && (
        <>
          <div className="px-6 pb-4 flex items-center justify-end">
            <button
              onClick={handleToggleSummary}
              disabled={summaryLoading}
              title={!canSummarize ? 'Transcript is not available yet' : undefined}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                backgroundColor: summaryVisible ? '#F3F4FF' : '#6057C7',
                color: summaryVisible ? '#2F2867' : '#F9F5EB'
              }}
              onMouseEnter={(e) => {
                if (!summaryVisible && !summaryLoading && canSummarize) {
                  e.target.style.backgroundColor = '#2F2867';
                }
              }}
              onMouseLeave={(e) => {
                if (!summaryVisible && !summaryLoading && canSummarize) {
                  e.target.style.backgroundColor = '#6057C7';
                }
              }}
            >
              {summaryLoading ? 'Generating summary...' : summaryVisible ? 'Hide Summary' : 'View Summary'}
            </button>
          </div>

          {summaryVisible && (
            <div className="px-6 pb-4">
              <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 p-4 space-y-3">
                {summaryError && (
                  <p className="text-sm text-red-500">{summaryError}</p>
                )}
                {!summaryError && (
                  <>
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                      {summaryData?.summary || 'Summary unavailable.'}
                    </p>
                    {summaryData?.key_points && summaryData.key_points.length > 0 && (
                      <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                        {summaryData.key_points.map((point, idx) => (
                          <li key={idx}>{point}</li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Video Section */}
      <div 
        className="relative bg-black group/video cursor-pointer overflow-hidden"
        onClick={handleVideoPlay}
      >
        <video
          ref={videoRef}
          className="w-full aspect-video object-cover"
          poster={post.thumbnail_url}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              setIsMuted(videoRef.current.muted);
            }
          }}
          muted={isMuted}
          loop
        >
          <source src={post.video_url} type="video/mp4" />
        </video>
        
        {/* Video Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover/video:opacity-100 transition-opacity duration-300" />

        {/* Play/Pause Button */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
            isPlaying ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover/video:opacity-100 pointer-events-auto'
          }`}
          style={{ visibility: isPlaying ? 'hidden' : 'visible' }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleVideoPlay();
            }}
            className="w-20 h-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white dark:hover:bg-gray-800 hover:scale-110 transition-all shadow-2xl"
            style={{ color: '#6057C7' }}
          >
            {isPlaying ? (
              <Pause size={32} className="fill-current" />
            ) : (
              <Play size={32} className="ml-1 fill-current" />
            )}
          </button>
        </div>

        {/* Volume Control */}
        <button
          onClick={handleMute}
          className="absolute bottom-4 right-4 w-10 h-10 bg-black/70 dark:bg-gray-900/70 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/90 dark:hover:bg-gray-800/90 transition-all shadow-lg opacity-0 group-hover/video:opacity-100"
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        {/* Views Badge */}
        <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/70 dark:bg-gray-900/70 backdrop-blur-md rounded-full flex items-center gap-1.5 text-white text-xs font-semibold">
          <Eye size={14} />
          <span>{(post.views || 0).toLocaleString()}</span>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800" style={{ backgroundColor: '#FAFAFBFF' }}>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <button
              onClick={handleLike}
              className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-colors group/like"
            >
              <Heart 
                size={18} 
                className={`transition-all ${liked ? 'fill-red-500 text-red-500 scale-110' : 'group-hover/like:scale-110'}`} 
              />
              <span className="font-bold">{likesCount.toLocaleString()}</span>
            </button>
            
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 transition-colors group/comment"
            >
              <MessageCircle 
                size={18} 
                className={`transition-all ${showComments ? 'fill-blue-500 text-blue-500' : 'group-hover/comment:scale-110'}`} 
              />
              <span className="font-bold">{commentsCount}</span>
            </button>
          </div>

          <button
            onClick={handleBookmark}
            className={`p-2 rounded-full transition-all ${
              bookmarked 
                ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' 
                : 'text-gray-500 dark:text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
            }`}
          >
            <Bookmark size={18} className={bookmarked ? 'fill-current' : ''} />
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 flex-1 justify-center font-semibold text-sm border-2 ${
              liked 
                ? 'text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border-red-300 dark:border-red-700' 
                : 'text-gray-600 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border-gray-300 dark:border-gray-600 hover:border-red-300 dark:hover:border-red-700'
            }`}
          >
            <Heart size={20} className={liked ? 'fill-current' : ''} />
            <span>Like</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 flex-1 justify-center font-semibold text-sm ${
              showComments
                ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
            }`}
          >
            <MessageCircle size={20} className={showComments ? 'fill-current' : ''} />
            <span>Comment</span>
          </button>

        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-gray-100 dark:border-gray-800 p-6" style={{ backgroundColor: '#FAFAFBFF' }}>
          <div className="space-y-3 max-h-96 overflow-y-auto mb-4 scrollbar-thin scrollbar-track-transparent">
            {comments.length > 0 ? (
              comments.map((comment) => {
                const commentProfile = comment.profiles || {};
                const commentProfileUrl = commentProfile.profile_url || ProfileMarry;
                const commentProfileName = commentProfile.full_name || commentProfile.username || 'Unknown';
                
                return (
                  <div key={comment.id} className="flex gap-3 group/comment">
                    <img
                      src={commentProfileUrl}
                      alt={commentProfileName}
                      className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-gray-200 dark:ring-gray-700 transition-all"
                      style={{ ringColor: '#A388E7' }}
                      onError={(e) => {
                        e.target.src = ProfileMarry;
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 group-hover/comment:shadow-md transition-all">
                        <p className="font-bold text-sm text-gray-900 dark:text-white">{commentProfileName}</p>
                        <p className="text-gray-700 dark:text-gray-300 text-sm mt-1 break-words">{comment.content}</p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-3">{formatTime(comment.created_at)}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">No comments yet. Be the first to comment!</p>
              </div>
            )}
          </div>
          
          {/* Add Comment Input */}
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: '#6057C7', color: '#F9F5EB' }}>
              {profileName.charAt(0).toUpperCase()}
            </div>
            <div className="flex gap-2 items-center flex-1">
              <input
                type="text"
                placeholder="Add a comment..."
                className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:border-transparent text-sm shadow-sm"
                style={{ focusRingColor: '#6057C7' }}
                ref={commentInputRef}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !loadingComment) {
                    handleAddComment();
                  }
                }}
                disabled={loadingComment}
              />
              <button
                onClick={handleAddComment}
                disabled={loadingComment}
                className="w-10 h-10 text-white rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-lg flex items-center justify-center"
                style={{
                  backgroundColor: '#6057C7',
                  color: '#F9F5EB'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#2F2867';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#6057C7';
                }}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
};

export default PostCard;

