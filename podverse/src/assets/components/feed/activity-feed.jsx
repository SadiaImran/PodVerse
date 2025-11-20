import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, MessageCircle, Share2, Play, Pause, Volume2, VolumeX, Eye, Sparkles } from 'lucide-react';
import { FiSend } from "react-icons/fi";
import { supabase } from '../../supabaseClient.js';
import { useNavigate } from 'react-router-dom';
import ProfileMarry from '../../images/icon-profile-marry.png';

const API_BASE_URL = 'http://localhost:8000';

// Post Card Component - Redesigned
const PostCard = ({ post, onLike, onComment, onView }) => {
  const [liked, setLiked] = useState(post.user_liked || false);
  const [likesCount, setLikesCount] = useState(post.likes || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(post.comments || []);
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoRef, setVideoRef] = useState(null);
  const [loadingComment, setLoadingComment] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const commentRef = useRef(null);
  const viewTracked = useRef(false);
  const navigate = useNavigate();

  // Track view when video starts playing
  useEffect(() => {
    if (videoRef && isPlaying && !viewTracked.current) {
      viewTracked.current = true;
      onView(post.id);
    }
  }, [isPlaying, videoRef, post.id, onView]);

  // Update state when post prop changes
  useEffect(() => {
    setLiked(post.user_liked || false);
    setLikesCount(post.likes || 0);
    setComments(post.comments || []);
    setCommentsCount(post.comments_count || 0);
  }, [post]);

  const handleVideoPlay = () => {
    if (videoRef) {
      if (isPlaying) {
        videoRef.pause();
      } else {
        videoRef.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMute = (e) => {
    e.stopPropagation();
    if (videoRef) {
      videoRef.muted = !isMuted;
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

  const handleAddComment = async () => {
    const content = commentRef.current?.value?.trim();
    if (!content) return;

    setLoadingComment(true);
    try {
      if (onComment) {
        const newComment = await onComment(post.id, content);
        if (newComment) {
          setComments(prev => [newComment, ...prev]);
          setCommentsCount(prev => prev + 1);
          commentRef.current.value = '';
        }
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment');
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

  const profile = post.profiles || {};
  const profileUrl = profile.profile_url || ProfileMarry;
  const profileName = profile.full_name || profile.username || 'Unknown';

  return (
    <div 
      className="bg-gradient-to-br from-white via-purple-50/30 to-pink-50/20 rounded-2xl shadow-lg border border-purple-100 mb-6 hover:shadow-xl transition-all duration-300 overflow-hidden group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-center p-4 pb-3 border-b border-gray-50">
        <div 
          className="flex items-center space-x-3 cursor-pointer group/profile flex-1"
          onClick={() => navigate(`/profile/${profile.id || post.user_id}`)}
        >
          <div className="relative">
            <img
              src={profileUrl}
              alt={profileName}
              className="w-12 h-12 rounded-full object-cover border-2 border-transparent group-hover/profile:border-purple-300 transition-all ring-2 ring-purple-100"
              onError={(e) => {
                e.target.src = ProfileMarry;
              }}
            />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm group-hover/profile:text-purple-600 transition-colors">
              {profileName}
            </h3>
            <div className="flex items-center gap-2">
              <p className="text-gray-500 text-xs">{formatTime(post.created_at)}</p>
              <span className="text-gray-300">•</span>
              <div className="flex items-center gap-1 text-xs text-purple-600">
                <Sparkles size={12} />
                <span>Podcast</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {(post.title || post.description) && (
        <div className="px-4 pt-4 pb-2">
          {post.title && (
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              {post.title}
            </h2>
          )}
          {post.description && (
            <p className="text-gray-700 text-sm leading-relaxed line-clamp-3">{post.description}</p>
          )}
        </div>
      )}

      {/* Video Section */}
      <div 
        className="relative bg-black group/video cursor-pointer"
        onClick={handleVideoPlay}
      >
        <video
          ref={setVideoRef}
          className="w-full aspect-video object-cover"
          poster={post.thumbnail_url}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onLoadedMetadata={() => {
            if (videoRef) {
              setIsMuted(videoRef.muted);
            }
          }}
          muted={isMuted}
          loop
        >
          <source src={post.video_url} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        
        {/* Video Controls Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/video:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleVideoPlay();
            }}
            className="w-20 h-20 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-purple-600 hover:bg-white hover:scale-110 transition-all shadow-xl"
          >
            {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} className="ml-1" fill="currentColor" />}
          </button>
        </div>


        {/* Volume Control */}
        <button
          onClick={handleMute}
          className="absolute bottom-4 right-4 w-10 h-10 bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/90 transition-all"
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      {/* Stats Bar */}
      <div className="px-4 py-3 border-t border-gray-50 bg-gradient-to-r from-gray-50 to-purple-50/30">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2 text-gray-700">
              <Heart size={16} className={liked ? 'fill-red-500 text-red-500' : 'text-gray-500'} />
              <span className="font-semibold">{likesCount.toLocaleString()}</span>
              <span className="text-gray-400">likes</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <MessageCircle size={16} className="text-gray-500" />
              <span className="font-semibold">{commentsCount}</span>
              <span className="text-gray-400">comments</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Eye size={16} className="text-gray-500" />
              <span className="font-semibold">{(post.views || 0).toLocaleString()}</span>
              <span className="text-gray-400">views</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 flex-1 justify-center ${
              liked 
                ? 'text-red-500 bg-red-50 hover:bg-red-100' 
                : 'text-gray-600 hover:text-red-500 hover:bg-red-50'
            }`}
          >
            <Heart size={20} className={liked ? 'fill-current' : ''} />
            <span className="text-sm font-semibold">Like</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 flex-1 justify-center ${
              showComments
                ? 'text-blue-500 bg-blue-50'
                : 'text-gray-600 hover:text-blue-500 hover:bg-blue-50'
            }`}
          >
            <MessageCircle size={20} />
            <span className="text-sm font-semibold">Comment</span>
          </button>

          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-gray-600 hover:text-green-500 hover:bg-green-50 transition-all duration-200 flex-1 justify-center">
            <Share2 size={20} />
            <span className="text-sm font-semibold">Share</span>
          </button>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-gray-100 p-4 bg-gradient-to-br from-gray-50 to-purple-50/30">
          <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
            {comments.length > 0 ? (
              comments.map((comment) => {
                const commentProfile = comment.profiles || {};
                const commentProfileUrl = commentProfile.profile_url || ProfileMarry;
                const commentProfileName = commentProfile.full_name || commentProfile.username || 'Unknown';
                
                return (
                  <div key={comment.id} className="flex space-x-3 group/comment">
                    <img
                      src={commentProfileUrl}
                      alt={commentProfileName}
                      className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-purple-100 group-hover/comment:ring-purple-300 transition-all"
                      onError={(e) => {
                        e.target.src = ProfileMarry;
                      }}
                    />
                    <div className="flex-1">
                      <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 group-hover/comment:shadow-md transition-all">
                        <p className="font-semibold text-sm text-gray-900">{commentProfileName}</p>
                        <p className="text-gray-700 text-sm mt-1">{comment.content}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 ml-3">{formatTime(comment.created_at)}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No comments yet. Be the first to comment!</p>
              </div>
            )}
          </div>
          
          {/* Add Comment */}
          <div className="flex space-x-3">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              U
            </div>
            <div className="flex justify-between gap-3 items-center flex-1">
              <input
                type="text"
                placeholder="Add a comment..."
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm shadow-sm"
                ref={commentRef}
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
                className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-lg shadow-purple-500/30 flex items-center justify-center"
              >
                <FiSend size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Activity Feed Component
const ActivityFeed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Fetch feed posts
  const fetchFeed = useCallback(async (pageNum = 1, append = false) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please log in to view your feed');
        setLoading(false);
        return;
      }

      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await fetch(`${API_BASE_URL}/posts/feed?page=${pageNum}&limit=20`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        if (append) {
          setPosts(prev => [...prev, ...result.posts]);
        } else {
          setPosts(result.posts);
        }
        setHasMore(result.pagination.page < result.pagination.total_pages);
      } else {
        setError(result.detail || 'Failed to load feed');
      }
    } catch (err) {
      console.error('Error fetching feed:', err);
      setError('Failed to load feed. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchFeed(1, false);
  }, [fetchFeed]);

  // Set up Realtime listeners
  useEffect(() => {
    let postsChannel = null;
    let likesChannel = null;
    let commentsChannel = null;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      try {
        // Listen for new posts from followed users
        postsChannel = supabase
          .channel('feed:posts')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'posts',
            },
            (payload) => {
              console.log('📹 [REALTIME] New post:', payload);
              fetchFeed(1, false);
            }
          )
          .subscribe();

        // Listen for likes
        likesChannel = supabase
          .channel('feed:likes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'post_likes',
            },
            (payload) => {
              console.log('❤️ [REALTIME] Like update:', payload);
              const postId = payload.new?.post_id || payload.old?.post_id;
              if (postId) {
                setPosts(prev => prev.map(p => {
                  if (p.id === postId) {
                    if (payload.eventType === 'INSERT') {
                      return {
                        ...p,
                        likes: (p.likes || 0) + 1,
                        user_liked: payload.new.user_id === user.id ? true : p.user_liked
                      };
                    } else if (payload.eventType === 'DELETE') {
                      return {
                        ...p,
                        likes: Math.max(0, (p.likes || 0) - 1),
                        user_liked: payload.old.user_id === user.id ? false : p.user_liked
                      };
                    }
                  }
                  return p;
                }));
              }
            }
          )
          .subscribe();

        // Listen for comments
        commentsChannel = supabase
          .channel('feed:comments')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'comments',
            },
            (payload) => {
              console.log('💬 [REALTIME] New comment:', payload);
              const postId = payload.new.post_id;
              if (postId) {
                setPosts(prev => prev.map(p => {
                  if (p.id === postId) {
                    return {
                      ...p,
                      comments_count: (p.comments_count || 0) + 1
                    };
                  }
                  return p;
                }));
              }
            }
          )
          .subscribe();

      } catch (error) {
        console.error('Error setting up realtime:', error);
      }
    };

    setupRealtime();

    return () => {
      if (postsChannel) supabase.removeChannel(postsChannel);
      if (likesChannel) supabase.removeChannel(likesChannel);
      if (commentsChannel) supabase.removeChannel(commentsChannel);
    };
  }, [fetchFeed]);

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
        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              likes: result.likes_count,
              user_liked: result.liked
            };
          }
          return p;
        }));
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
      
      await fetch(`${API_BASE_URL}/posts/${postId}/view`, {
        method: 'POST',
        headers: session ? {
          'Authorization': `Bearer ${session.access_token}`,
        } : {},
      });

      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            views: (p.views || 0) + 1
          };
        }
        return p;
      }));
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  // Load more
  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchFeed(nextPage, true);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-500 text-lg">Loading your feed...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-red-600 text-2xl">⚠️</span>
        </div>
        <p className="text-red-500 mb-4 text-lg">{error}</p>
        <button
          onClick={() => fetchFeed(1, false)}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-10 h-10 text-purple-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Your feed is empty</h3>
        <p className="text-gray-500 mb-6">Start following creators to see their amazing content here!</p>
        <button
          onClick={() => window.location.href = '/search'}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
        >
          Discover Creators
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onLike={handleLike}
          onComment={handleComment}
          onView={handleView}
        />
      ))}

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center pt-4">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all font-semibold shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? 'Loading...' : 'Load More Posts'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
