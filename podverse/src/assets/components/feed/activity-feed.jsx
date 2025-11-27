import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { supabase } from '../../supabaseClient.js';
import { useNavigate } from 'react-router-dom';
import PostCard from '../shared/PostCard';

const API_BASE_URL = 'http://localhost:8000';

// Main Activity Feed Component
const FEED_PAGE_SIZE = 50; // API allows max 50 per page

const ActivityFeed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Fetch feed posts
  const fetchFeed = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please log in to view your feed');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const aggregatedPosts = [];
      const visitedPostIds = new Set();
      let currentPage = 1;
      let totalPages = 1;
      let encounteredError = false;

      while (currentPage <= totalPages) {
        const url = `${API_BASE_URL}/posts/feed?page=${currentPage}&limit=${FEED_PAGE_SIZE}&status=published`;

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          const detail = result?.detail;
          const readableError = Array.isArray(detail)
            ? detail.map(d => d?.msg || d).join(', ')
            : typeof detail === 'string'
              ? detail
              : 'Failed to load feed';
          setError(readableError);
          encounteredError = true;
          break;
        }

        const publishedPosts = (result.posts || []).filter(post => post.status === 'published' || !post.status);

        for (const post of publishedPosts) {
          if (visitedPostIds.has(post.id)) continue;
          visitedPostIds.add(post.id);

          if (!post.tags || !Array.isArray(post.tags) || post.tags.length === 0) {
            try {
              const { data: postTags, error: tagsError } = await supabase
                .from('post_tags')
                .select(`
                  tag_id,
                  tags:tag_id (
                    id,
                    name,
                    usage_count
                  )
                `)
                .eq('post_id', post.id);

              if (!tagsError && postTags) {
                post.tags = postTags.map(pt => ({
                  id: pt.tags?.id || pt.tag_id,
                  name: pt.tags?.name,
                  usage_count: pt.tags?.usage_count,
                  tag_id: pt.tag_id,
                  tag: pt.tags
                }));
              } else {
                post.tags = [];
              }
            } catch (err) {
              console.error(`Error fetching tags for post ${post.id}:`, err);
              post.tags = [];
            }
          }

          aggregatedPosts.push(post);
        }

        const pagination = result.pagination || {};
        totalPages = pagination.total_pages || currentPage;
        if (currentPage >= totalPages) break;
        currentPage += 1;
      }

      if (!encounteredError) {
        const sortedPosts = aggregatedPosts.sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA;
        });

        setPosts(sortedPosts);

        if (sortedPosts.length === 0) {
          setError('No posts found in your feed.');
        }
      }
    } catch (err) {
      console.error('Error fetching feed:', err);
      setError('Failed to load feed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Handle tag click - navigate to search page with tag filter
  const handleTagClick = useCallback((tagName) => {
    navigate(`/search?tag=${encodeURIComponent(tagName)}`);
  }, [navigate]);

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
              if (payload.new?.status && payload.new.status !== 'published') {
                return;
              }
              fetchFeed();
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

  // Handle view tracking (one view per user per post)
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
      
      // Only update if view was actually recorded (not already viewed)
      if (result.success && result.viewed) {
        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              views: result.views || (p.views || 0),
              views_count: result.views || (p.views_count || 0)
            };
          }
          return p;
        }));
      }
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
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
          onClick={fetchFeed}
          className="px-6 py-3 text-white rounded-xl transition-all shadow-lg"
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
          Retry
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#A388E7' }}>
          <Sparkles className="w-10 h-10" style={{ color: '#F9F5EB' }} />
        </div>
        <h3 className="text-2xl font-bold mb-2" style={{ color: '#1C1C1C' }}>Your feed is empty</h3>
        <p className="mb-6" style={{ color: '#6A6A6A' }}>Start following creators to see their amazing content here!</p>
        <button
          onClick={() => window.location.href = '/search'}
          className="px-6 py-3 text-white rounded-xl transition-all shadow-lg"
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
          Discover Creators
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Posts List */}
      {posts.length > 0 ? (
        <>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={handleLike}
              onComment={handleComment}
              onView={handleView}
              onTagClick={handleTagClick}
            />
          ))}

        </>
      ) : null}
    </div>
  );
};

export default ActivityFeed;
