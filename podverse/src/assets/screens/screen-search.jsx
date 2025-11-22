import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, UserPlus, UserMinus, Clock, X, Tag, Users, Video, Sparkles } from 'lucide-react';
import { supabase } from '../supabaseClient.js';
import { useAuth } from '../context/AuthContext';
import BaseLayout from '../components/layouts/BaseLayout';
import PostCard from '../components/shared/PostCard';
import ProfileMarry from '../images/icon-profile-marry.png';

const API_BASE_URL = 'http://localhost:8000';

const SearchPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [postResults, setPostResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState(null);
  const [tagFilter, setTagFilter] = useState(null);
  const [tagPosts, setTagPosts] = useState([]);
  const [loadingTagPosts, setLoadingTagPosts] = useState(false);
  const [searchType, setSearchType] = useState('users'); // 'users' or 'posts'

  // Check for tag parameter in URL
  useEffect(() => {
    const tag = searchParams.get('tag');
    if (tag) {
      setTagFilter(tag);
      setSearchQuery(`#${tag}`); // Populate search bar with tag
      setSearchType('posts'); // Switch to posts view
      fetchPostsByTag(tag);
    } else {
      setTagFilter(null);
      setTagPosts([]);
    }
  }, [searchParams]);

  // Fetch posts by tag
  const fetchPostsByTag = async (tagName) => {
    setLoadingTagPosts(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // First get tag ID
      const { data: tagData, error: tagError } = await supabase
        .from('tags')
        .select('id')
        .eq('name', tagName)
        .single();

      if (tagError || !tagData) {
        console.error('Tag not found:', tagError);
        setTagPosts([]);
        return;
      }

      // Get post IDs with this tag
      const { data: postTags, error: postTagsError } = await supabase
        .from('post_tags')
        .select('post_id')
        .eq('tag_id', tagData.id);

      if (postTagsError || !postTags || postTags.length === 0) {
        setTagPosts([]);
        return;
      }

      const postIds = postTags.map(pt => pt.post_id);

      // Fetch posts
      const response = await fetch(
        `${API_BASE_URL}/posts/feed?limit=50`,
        {
          headers: session ? {
            'Authorization': `Bearer ${session.access_token}`,
          } : {},
        }
      );

      const result = await response.json();
      if (result.success) {
        // Filter posts that have this tag
        const filteredPosts = result.posts.filter(post => postIds.includes(post.id));
        
        // Fetch tags for each post
        const postsWithTags = await Promise.all(
          filteredPosts.map(async (post) => {
            const { data: postTagsData } = await supabase
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

            return {
              ...post,
              tags: postTagsData?.map(pt => ({
                id: pt.tags?.id || pt.tag_id,
                name: pt.tags?.name,
                tag_id: pt.tag_id,
                tag: pt.tags
              })) || []
            };
          })
        );
        
        setTagPosts(postsWithTags);
      }
    } catch (error) {
      console.error('Error fetching posts by tag:', error);
      setTagPosts([]);
    } finally {
      setLoadingTagPosts(false);
    }
  };

  // Debounced search
  const performSearch = useCallback(async (query) => {
    if (!query.trim() || query.length < 1) {
      setSearchResults([]);
      setPostResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (searchType === 'users') {
        // Search users
        const response = await fetch(
          `${API_BASE_URL}/social-media/search?query=${encodeURIComponent(query)}&limit=20`,
          {
            headers: session ? {
              'Authorization': `Bearer ${session.access_token}`,
            } : {},
          }
        );

        const result = await response.json();
        if (result.success) {
          setSearchResults(result.users || []);
          setPostResults([]);
        }
      } else {
        // Search posts
        const response = await fetch(
          `${API_BASE_URL}/posts/search?query=${encodeURIComponent(query)}&limit=20`,
          {
            headers: session ? {
              'Authorization': `Bearer ${session.access_token}`,
            } : {},
          }
        );

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            // Fetch tags for each post
            const postsWithTags = await Promise.all(
              (result.posts || []).map(async (post) => {
                if (post.tags && Array.isArray(post.tags) && post.tags.length > 0) {
                  return post;
                }
                
                try {
                  const { data: postTags } = await supabase
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

                  return {
                    ...post,
                    tags: postTags?.map(pt => ({
                      id: pt.tags?.id || pt.tag_id,
                      name: pt.tags?.name,
                      tag_id: pt.tag_id,
                      tag: pt.tags
                    })) || []
                  };
                } catch (err) {
                  return { ...post, tags: [] };
                }
              })
            );
            setPostResults(postsWithTags);
            setSearchResults([]);
          }
        } else {
          // Fallback: search by tag if query starts with #
          if (query.startsWith('#')) {
            const tagName = query.substring(1).trim();
            if (tagName) {
              fetchPostsByTag(tagName);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error searching:', error);
      // Fallback: search by tag if query starts with #
      if (query.startsWith('#')) {
        const tagName = query.substring(1).trim();
        if (tagName) {
          fetchPostsByTag(tagName);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [searchType]);

  // Handle search input with debounce
  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Don't search if query is empty or if we have a tag filter (tag search is handled separately)
    if (!searchQuery.trim() && !tagFilter) {
      setSearchResults([]);
      setPostResults([]);
      return;
    }

    const timer = setTimeout(() => {
      if (tagFilter && searchQuery.startsWith('#')) {
        // Tag search is already handled by fetchPostsByTag
        return;
      }
      performSearch(searchQuery);
    }, 300); // 300ms debounce

    setDebounceTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [searchQuery, searchType, performSearch, tagFilter]);

  // Re-search when search type changes
  useEffect(() => {
    if (searchQuery.trim() && !tagFilter) {
      performSearch(searchQuery);
    }
  }, [searchType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Set up Realtime listeners for connection status and profile updates
  useEffect(() => {
    if (!currentUser || searchResults.length === 0) return;

    let connectionsChannel = null;
    let profilesChannel = null;
    let mounted = true;

    const setupRealtime = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !mounted) return;

        const userIds = searchResults.map(u => u.id);

        // Listen for connection status changes
        connectionsChannel = supabase
          .channel(`search:connections:${user.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'follows',
              filter: `follower_id=eq.${user.id}`,
            },
            (payload) => {
              console.log('🔗 [REALTIME] Connection status changed:', payload);
              if (!mounted) return;
              const targetUserId = payload.new?.following_id || payload.old?.following_id;
              if (userIds.includes(targetUserId)) {
                setSearchResults(prev => prev.map(user => {
                  if (user.id === targetUserId) {
                    if (payload.eventType === 'INSERT') {
                      return {
                        ...user,
                        connection_status: payload.new.status === 'accepted' ? 'following' : 'pending'
                      };
                    } else if (payload.eventType === 'DELETE') {
                      return {
                        ...user,
                        connection_status: 'none'
                      };
                    } else if (payload.eventType === 'UPDATE') {
                      return {
                        ...user,
                        connection_status: payload.new.status === 'accepted' ? 'following' : 
                                         payload.new.status === 'pending' ? 'pending' : 'none'
                      };
                    }
                  }
                  return user;
                }));
              }
            }
          )
          .subscribe();

        // Listen for profile updates (followers_count, following_count)
        profilesChannel = supabase
          .channel(`search:profiles:${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'profiles',
            },
            (payload) => {
              console.log('👤 [REALTIME] Profile updated:', payload);
              if (!mounted) return;
              const updatedUserId = payload.new.id;
              if (userIds.includes(updatedUserId)) {
                setSearchResults(prev => prev.map(user => {
                  if (user.id === updatedUserId) {
                    return {
                      ...user,
                      followers_count: payload.new.followers_count ?? user.followers_count,
                      following_count: payload.new.following_count ?? user.following_count,
                      full_name: payload.new.full_name ?? user.full_name,
                      profile_url: payload.new.profile_url ?? user.profile_url,
                      bio: payload.new.bio ?? user.bio,
                    };
                  }
                  return user;
                }));
              }
            }
          )
          .subscribe();
      } catch (error) {
        console.error('❌ [REALTIME] Error setting up search realtime:', error);
      }
    };

    setupRealtime();

    return () => {
      mounted = false;
      if (connectionsChannel) supabase.removeChannel(connectionsChannel);
      if (profilesChannel) supabase.removeChannel(profilesChannel);
    };
  }, [currentUser, searchResults.length]);

  // Handle follow/unfollow
  const handleFollow = async (targetUserId, currentStatus) => {
    if (!currentUser) {
      navigate('/signin-email');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/signin-email');
        return;
      }

      if (currentStatus === 'following') {
        // Unfollow
        const response = await fetch(`${API_BASE_URL}/social-media/connections/${targetUserId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          // Update local state
          setSearchResults(prev =>
            prev.map(user =>
              user.id === targetUserId
                ? { ...user, connection_status: 'none' }
                : user
            )
          );
        }
      } else if (currentStatus === 'pending') {
        // Cancel pending request
        const response = await fetch(`${API_BASE_URL}/social-media/connections/${targetUserId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          // Update local state
          setSearchResults(prev =>
            prev.map(user =>
              user.id === targetUserId
                ? { ...user, connection_status: 'none' }
                : user
            )
          );
        }
      } else if (currentStatus === 'none') {
        // Send follow request
        const response = await fetch(`${API_BASE_URL}/social-media/connections/request`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            target_user_id: targetUserId,
            connection_type: 'follow'
          }),
        });

        const result = await response.json();

        if (response.ok) {
          // Update local state
          const newStatus = result.status === 'pending' ? 'pending' : 'following';
          setSearchResults(prev =>
            prev.map(user =>
              user.id === targetUserId
                ? { ...user, connection_status: newStatus }
                : user
            )
          );
        } else {
          alert(result.detail || 'Failed to follow user');
        }
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      alert('An error occurred. Please try again.');
    }
  };

  // Handle tag click in posts
  const handleTagClick = (tagName) => {
    setSearchQuery(`#${tagName}`);
    setSearchType('posts');
    navigate(`/search?tag=${encodeURIComponent(tagName)}`);
  };


  return (
    <BaseLayout>
      <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Search</h1>
            <p className="text-gray-600">Find users, posts, and content on PodVerse</p>
          </div>

          {/* Search Type Tabs */}
          <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => {
                setSearchType('users');
                setPostResults([]);
                if (tagFilter) {
                  setTagFilter(null);
                  setSearchQuery('');
                }
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                searchType === 'users'
                  ? 'bg-white text-light-purple shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users size={18} />
              Users
            </button>
            <button
              onClick={() => {
                setSearchType('posts');
                setSearchResults([]);
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                searchType === 'posts'
                  ? 'bg-white text-light-purple shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Video size={18} />
              Posts
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchType === 'users' ? 'Search by username or name...' : 'Search posts, tags (e.g., #tech)...'}
                className="w-full pl-12 pr-12 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-light-purple focus:border-transparent text-lg"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setTagFilter(null);
                    setSearchResults([]);
                    setPostResults([]);
                    setTagPosts([]);
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              )}
            </div>
            {tagFilter && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-gray-600">Filtered by:</span>
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                  <Tag size={14} />
                  #{tagFilter}
                </span>
                <button
                  onClick={() => {
                    navigate('/search');
                    setTagFilter(null);
                    setSearchQuery('');
                    setTagPosts([]);
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Loading State */}
          {(loading || loadingTagPosts) && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-light-purple"></div>
              <span className="ml-3 text-gray-600">Searching...</span>
            </div>
          )}

          {/* User Search Results */}
          {!loading && searchType === 'users' && searchQuery && searchResults.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  Found {searchResults.length} {searchResults.length === 1 ? 'user' : 'users'}
                </p>
              </div>

              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Profile Picture */}
                      <div
                        onClick={() => navigate(`/profile/${user.id}`)}
                        className="cursor-pointer"
                      >
                        <img
                          src={user.profile_url || ProfileMarry}
                          alt={user.full_name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 hover:border-light-purple transition-all"
                          onError={(e) => {
                            e.target.src = ProfileMarry;
                          }}
                        />
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div
                          onClick={() => navigate(`/profile/${user.id}`)}
                          className="cursor-pointer"
                        >
                          <h3 className="text-lg font-bold text-gray-900 hover:text-light-purple transition-colors">
                            {user.full_name || 'User'}
                          </h3>
                          <p className="text-gray-500">@{user.username}</p>
                          {user.bio && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{user.bio}</p>
                          )}
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span>{user.followers_count || 0} followers</span>
                          <span>•</span>
                          <span>{user.following_count || 0} following</span>
                          {user.is_private && (
                            <>
                              <span>•</span>
                              <span className="text-light-purple font-medium">Private</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    {user.connection_status !== 'self' && (
                      <button
                        onClick={() => handleFollow(user.id, user.connection_status)}
                        className={`px-6 py-2.5 rounded-full transition-all flex items-center gap-2 whitespace-nowrap ${
                          user.connection_status === 'following'
                            ? 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            : user.connection_status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                            : 'bg-light-purple text-white hover:bg-purple-700'
                        }`}
                      >
                        {user.connection_status === 'following' ? (
                          <>
                            <UserMinus size={18} />
                            Unfollow
                          </>
                        ) : user.connection_status === 'pending' ? (
                          <>
                            <Clock size={18} />
                            Requested
                          </>
                        ) : (
                          <>
                            <UserPlus size={18} />
                            Follow
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Post Search Results */}
          {!loading && searchType === 'posts' && searchQuery && (postResults.length > 0 || tagPosts.length > 0) && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  Found {(postResults.length || tagPosts.length)} {(postResults.length || tagPosts.length) === 1 ? 'post' : 'posts'}
                </p>
              </div>
              {(postResults.length > 0 ? postResults : tagPosts).map((post) => {
                const formattedPost = {
                  ...post,
                  likes: post.likes_count || post.likes || 0,
                  comments: post.comments || [],
                  comments_count: post.comments_count || 0,
                  views: post.views_count || post.views || 0
                };
                
                return (
                  <PostCard
                    key={post.id}
                    post={formattedPost}
                    onTagClick={handleTagClick}
                    onLike={async (postId, liked) => {
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) return;
                        
                        const response = await fetch(`${API_BASE_URL}/posts/${postId}/like`, {
                          method: liked ? 'POST' : 'DELETE',
                          headers: {
                            'Authorization': `Bearer ${session.access_token}`,
                          },
                        });
                        
                        if (response.ok) {
                          const result = await response.json();
                          setPostResults(prev => prev.map(p => {
                            if (p.id === postId) {
                              return {
                                ...p,
                                likes_count: result.likes_count || (liked ? (p.likes_count || 0) + 1 : Math.max(0, (p.likes_count || 0) - 1))
                              };
                            }
                            return p;
                          }));
                          setTagPosts(prev => prev.map(p => {
                            if (p.id === postId) {
                              return {
                                ...p,
                                likes_count: result.likes_count || (liked ? (p.likes_count || 0) + 1 : Math.max(0, (p.likes_count || 0) - 1))
                              };
                            }
                            return p;
                          }));
                        }
                      } catch (error) {
                        console.error('Error toggling like:', error);
                      }
                    }}
                    onComment={async (postId, content) => {
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) return null;
                        
                        const response = await fetch(`${API_BASE_URL}/posts/${postId}/comment`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`,
                          },
                          body: JSON.stringify({ content }),
                        });
                        
                        if (response.ok) {
                          const result = await response.json();
                          setPostResults(prev => prev.map(p => {
                            if (p.id === postId) {
                              return {
                                ...p,
                                comments_count: (p.comments_count || 0) + 1
                              };
                            }
                            return p;
                          }));
                          setTagPosts(prev => prev.map(p => {
                            if (p.id === postId) {
                              return {
                                ...p,
                                comments_count: (p.comments_count || 0) + 1
                              };
                            }
                            return p;
                          }));
                          return result.comment;
                        }
                      } catch (error) {
                        console.error('Error adding comment:', error);
                      }
                      return null;
                    }}
                    onView={async (postId) => {
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
                          setPostResults(prev => prev.map(p => {
                            if (p.id === postId) {
                              return {
                                ...p,
                                views_count: result.views || (p.views_count || 0)
                              };
                            }
                            return p;
                          }));
                          setTagPosts(prev => prev.map(p => {
                            if (p.id === postId) {
                              return {
                                ...p,
                                views_count: result.views || (p.views_count || 0)
                              };
                            }
                            return p;
                          }));
                        }
                      } catch (error) {
                        console.error('Error tracking view:', error);
                      }
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* No Results */}
          {!loading && !loadingTagPosts && searchQuery && 
           ((searchType === 'users' && searchResults.length === 0) || 
            (searchType === 'posts' && postResults.length === 0 && tagPosts.length === 0)) && (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
              <Search size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg">No {searchType} found</p>
              <p className="text-gray-500 text-sm mt-2">Try a different search term</p>
            </div>
          )}

          {/* Empty State - No Search */}
          {!loading && !loadingTagPosts && !searchQuery && !tagFilter && (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
              <Search size={64} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600 text-lg font-medium mb-2">Start searching</p>
              <p className="text-gray-500 text-sm">
                {searchType === 'users' 
                  ? 'Enter a username or name to find users'
                  : 'Search for posts, videos, or tags (e.g., #tech)'}
              </p>
            </div>
          )}
        </div>
      </div>
    </BaseLayout>
  );
};

export default SearchPage;

