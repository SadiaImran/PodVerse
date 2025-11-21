import React, { useState, useEffect } from 'react';
import { UserPlus, TrendingUp, Sparkles, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient.js';
import { useAuth } from '../../context/AuthContext';
import ProfileMarry from '../../images/icon-profile-marry.png';

const API_BASE_URL = 'http://localhost:8000';

const SuggestionsSidebar = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState({});
  const [trendingTags, setTrendingTags] = useState([]);
  const [loadingTags, setLoadingTags] = useState(true);
  
  // Impact stats
  const [impactStats, setImpactStats] = useState({
    totalPlays: 0,
    followers: 0,
    monthlyGrowth: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Fetch user impact stats
  const fetchImpactStats = async () => {
    if (!currentUser?.id) return;
    
    setLoadingStats(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoadingStats(false);
        return;
      }

      // Fetch user's profile for followers count
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('followers_count')
        .eq('id', currentUser.id)
        .single();

      const followers = profile?.followers_count || 0;

      let totalPlays = 0;
      let currentMonthViews = 0;
      let previousMonthViews = 0;

      // Try to fetch from API first
      try {
        const response = await fetch(`${API_BASE_URL}/posts/user/${currentUser.id}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.posts) {
            // Calculate date ranges for current and previous month
            const now = new Date();
            const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

            result.posts.forEach(post => {
              const views = post.views_count || post.views || 0;
              totalPlays += views;

              // Calculate monthly views based on post creation date
              // Note: This counts ALL views of posts created in that month
              // For more accuracy, you'd need view timestamps in the database
              const postDate = new Date(post.created_at);
              if (postDate >= currentMonthStart) {
                // Post created this month - count all its views
                currentMonthViews += views;
              } else if (postDate >= previousMonthStart && postDate <= previousMonthEnd) {
                // Post created last month - count its views for comparison
                previousMonthViews += views;
              }
            });
          }
        }
      } catch (apiError) {
        console.warn('API fetch failed, using Supabase fallback:', apiError);
      }

      // Fallback to Supabase if API fails or returns no data
      if (totalPlays === 0) {
        const { data: postsData } = await supabase
          .from('posts')
          .select('views, views_count, created_at')
          .eq('user_id', currentUser.id);

        if (postsData && postsData.length > 0) {
          const now = new Date();
          const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

          postsData.forEach(post => {
            const views = post.views_count || post.views || 0;
            totalPlays += views;

            const postDate = new Date(post.created_at);
            if (postDate >= currentMonthStart) {
              currentMonthViews += views;
            } else if (postDate >= previousMonthStart && postDate <= previousMonthEnd) {
              previousMonthViews += views;
            }
          });
        }
      }

      // Calculate monthly growth percentage
      // Formula: ((Current Month Views - Previous Month Views) / Previous Month Views) * 100
      let monthlyGrowth = 0;
      if (previousMonthViews > 0) {
        monthlyGrowth = Math.round(((currentMonthViews - previousMonthViews) / previousMonthViews) * 100);
      } else if (currentMonthViews > 0) {
        monthlyGrowth = 100; // New content this month (infinite growth from 0)
      }

      setImpactStats({
        totalPlays,
        followers,
        monthlyGrowth
      });
    } catch (error) {
      console.error('Error fetching impact stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
    fetchTrendingTags();
    if (currentUser) {
      fetchImpactStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Set up realtime listeners for impact stats updates
  useEffect(() => {
    if (!currentUser?.id) return;

    let profileChannel = null;
    let postsChannel = null;
    let refreshInterval = null;
    let mounted = true;

    const setupRealtime = async () => {
      try {
        // Listen for profile updates (followers count)
        profileChannel = supabase
          .channel(`impact:profile:${currentUser.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'profiles',
              filter: `id=eq.${currentUser.id}`,
            },
            (payload) => {
              if (!mounted) return;
              // Update followers count in real-time
              setImpactStats(prev => ({
                ...prev,
                followers: payload.new.followers_count || prev.followers
              }));
            }
          )
          .subscribe();

        // Listen for posts updates (views count) - only for current user's posts
        postsChannel = supabase
          .channel(`impact:posts:${currentUser.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'posts',
              filter: `user_id=eq.${currentUser.id}`,
            },
            async (payload) => {
              if (!mounted) return;
              
              // When a post's views are updated, recalculate total plays
              const oldViews = payload.old?.views || payload.old?.views_count || 0;
              const newViews = payload.new?.views || payload.new?.views_count || 0;
              const viewsDiff = newViews - oldViews;

              if (viewsDiff !== 0) {
                // Update total plays in real-time
                setImpactStats(prev => ({
                  ...prev,
                  totalPlays: Math.max(0, prev.totalPlays + viewsDiff)
                }));
              }
            }
          )
          .subscribe();

        // Also set up periodic refresh as fallback (every 30 seconds)
        // This ensures stats stay updated even if realtime doesn't catch everything
        refreshInterval = setInterval(() => {
          if (mounted) {
            fetchImpactStats();
          }
        }, 30000); // Refresh every 30 seconds

      } catch (error) {
        console.error('Error setting up impact realtime:', error);
      }
    };

    setupRealtime();

    return () => {
      mounted = false;
      if (profileChannel) supabase.removeChannel(profileChannel);
      if (postsChannel) supabase.removeChannel(postsChannel);
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [currentUser]);

  // Fetch trending tags
  const fetchTrendingTags = async () => {
    try {
      setLoadingTags(true);
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('usage_count', { ascending: false })
        .limit(6);

      if (error) {
        console.error('Error fetching trending tags:', error);
        return;
      }

      if (data) {
        setTrendingTags(data);
      }
    } catch (err) {
      console.error('Error fetching trending tags:', err);
    } finally {
      setLoadingTags(false);
    }
  };

  // Handle tag click - navigate to search with tag filter
  const handleTagClick = (tagName) => {
    navigate(`/search?tag=${encodeURIComponent(tagName)}`);
  };

  // Set up Realtime listeners for follow status and profile updates
  useEffect(() => {
    let connectionsChannel = null;
    let profilesChannel = null;
    let mounted = true;

    const setupRealtime = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !mounted) return;

        // Listen for connection status changes
        connectionsChannel = supabase
          .channel(`suggestions:connections:${user.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'follows',
              filter: `follower_id=eq.${user.id}`,
            },
            (payload) => {
              console.log('🔗 [REALTIME] Suggestion connection changed:', payload);
              if (!mounted) return;
              const targetUserId = payload.new?.following_id || payload.old?.following_id;
              // Update following map and suggestions
              if (payload.eventType === 'INSERT') {
                setFollowingMap(prev => ({ ...prev, [targetUserId]: true }));
                // Remove from suggestions if followed
                if (payload.new.status === 'accepted') {
                  setSuggestedUsers(prev => prev.filter(u => u.id !== targetUserId));
                }
              } else if (payload.eventType === 'DELETE') {
                setFollowingMap(prev => {
                  const newMap = { ...prev };
                  delete newMap[targetUserId];
                  return newMap;
                });
              }
            }
          )
          .subscribe();

        // Listen for profile updates (followers_count)
        profilesChannel = supabase
          .channel(`suggestions:profiles:${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'profiles',
            },
            (payload) => {
              console.log('👤 [REALTIME] Suggestion profile updated:', payload);
              if (!mounted) return;
              const updatedUserId = payload.new.id;
              // Update profile if it exists in suggestions
              setSuggestedUsers(prev => {
                const userExists = prev.some(u => u.id === updatedUserId);
                if (!userExists) return prev;
                return prev.map(user => {
                  if (user.id === updatedUserId) {
                    return {
                      ...user,
                      followers_count: payload.new.followers_count ?? user.followers_count,
                      full_name: payload.new.full_name ?? user.full_name,
                      profile_url: payload.new.profile_url ?? user.profile_url,
                      bio: payload.new.bio ?? user.bio,
                    };
                  }
                  return user;
                });
              });
            }
          )
          .subscribe();
      } catch (error) {
        console.error('❌ [REALTIME] Error setting up suggestions realtime:', error);
      }
    };

    setupRealtime();

    return () => {
      mounted = false;
      if (connectionsChannel) supabase.removeChannel(connectionsChannel);
      if (profilesChannel) supabase.removeChannel(profilesChannel);
    };
  }, []);

  const fetchSuggestions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      // Get current user's following list
      const followsResponse = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', session.user.id)
        .eq('status', 'accepted');

      const followingIds = followsResponse.data?.map(f => f.following_id) || [];
      followingIds.push(session.user.id); // Exclude self

      // Get users not in following list
      let query = supabase
        .from('profiles')
        .select('id, full_name, username, profile_url, bio, followers_count')
        .limit(10);

      const { data: allUsers, error } = await query;

      if (error) throw error;

      // Filter out users that are already being followed or self
      const users = (allUsers || []).filter(user => !followingIds.includes(user.id));

      // Create following map for quick lookup
      const followMap = {};
      if (followsResponse.data) {
        followsResponse.data.forEach(f => {
          followMap[f.following_id] = true;
        });
      }
      setFollowingMap(followMap);

      setSuggestedUsers(users || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (userId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_BASE_URL}/social-media/connections/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          target_user_id: userId,
          connection_type: 'follow'
        }),
      });

      const result = await response.json();
      if (response.ok) {
        // Update local state
        setFollowingMap(prev => ({ ...prev, [userId]: true }));
        // Refresh suggestions
        fetchSuggestions();
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  // Color gradients for tags
  const tagColors = [
    'from-purple-500 to-pink-500',
    'from-blue-500 to-cyan-500',
    'from-green-500 to-emerald-500',
    'from-orange-500 to-red-500',
    'from-indigo-500 to-purple-500',
    'from-pink-500 to-rose-500',
  ];

  return (
    <div className="space-y-6 ">
      {/* Suggestions */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-bold text-gray-900">
            Suggested for you
          </h3>
        </div>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-gray-200"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
            ))}
          </div>
        ) : suggestedUsers.length > 0 ? (
          <div className="space-y-3">
            {suggestedUsers.map((user) => {
              const isFollowing = followingMap[user.id];
              const profileUrl = user.profile_url || ProfileMarry;
              const displayName = user.full_name || user.username || 'Unknown';
              const followersCount = user.followers_count || 0;
              
              return (
                <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-purple-50/50 transition-all group">
                  <img
                    src={profileUrl}
                    alt={displayName}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-purple-100 group-hover:ring-purple-300 transition-all cursor-pointer flex-shrink-0"
                    onClick={() => navigate(`/profile/${user.id}`)}
                    onError={(e) => {
                      e.target.src = ProfileMarry;
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p 
                      className="font-semibold text-gray-900 text-sm truncate group-hover:text-purple-600 transition-colors cursor-pointer"
                      onClick={() => navigate(`/profile/${user.id}`)}
                    >
                      {displayName}
                    </p>
                    {user.bio && (
                      <p className="text-gray-500 text-xs truncate">{user.bio}</p>
                    )}
                    <p className="text-gray-400 text-xs mt-0.5">
                      {followersCount > 0 ? `${(followersCount / 1000).toFixed(1)}K` : '0'} followers
                    </p>
                  </div>
                  {!isFollowing ? (
                    <button 
                      onClick={() => handleFollow(user.id)}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1.5 rounded-full text-xs font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-md shadow-purple-500/30 whitespace-nowrap"
                    >
                      <UserPlus size={14} className="inline mr-1" />
                      Follow
                    </button>
                  ) : (
                    <button 
                      className="bg-gray-100 text-gray-600 px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap"
                      disabled
                    >
                      Following
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center py-4">No suggestions available</p>
        )}
        <button 
          onClick={() => navigate('/search')}
          className="text-purple-600 hover:text-purple-700 text-sm font-semibold mt-4 w-full text-center py-2 hover:bg-purple-50 rounded-lg transition-all"
        >
          View all recommendations →
        </button>
      </div>

      {/* Trending */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-bold text-gray-900">
            Trending Now
          </h3>
        </div>
        {loadingTags ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="p-3 rounded-xl animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        ) : trendingTags.length > 0 ? (
          <div className="space-y-3">
            {trendingTags.map((tag, idx) => (
              <div 
                key={tag.id} 
                onClick={() => handleTagClick(tag.name)}
                className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 p-3 rounded-xl cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Tag size={14} className="text-gray-400 group-hover:text-purple-600 transition-colors" />
                    <p className="font-bold text-gray-900 text-sm group-hover:text-purple-600 transition-colors">
                      #{tag.name}
                    </p>
                  </div>
                  <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${tagColors[idx % tagColors.length]}`}></div>
                </div>
                <p className="text-gray-500 text-xs">
                  {tag.usage_count || 0} {tag.usage_count === 1 ? 'post' : 'posts'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center py-4">No trending topics yet</p>
        )}
      </div>

      {/* Quick Stats - Your Impact */}
      {currentUser && (
        <div className="bg-gradient-to-br from-purple-600 via-pink-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5" />
            <h3 className="font-bold text-lg">Your Impact</h3>
          </div>
          {loadingStats ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-3 bg-white/10 backdrop-blur-sm rounded-xl animate-pulse">
                  <div className="h-4 bg-white/20 rounded w-24 mb-2"></div>
                  <div className="h-6 bg-white/20 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                <span className="text-purple-100 text-sm">Total Plays</span>
                <span className="font-bold text-lg">
                  {impactStats.totalPlays >= 1000 
                    ? `${(impactStats.totalPlays / 1000).toFixed(1)}K`
                    : impactStats.totalPlays.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                <span className="text-purple-100 text-sm">Followers</span>
                <span className="font-bold text-lg">
                  {impactStats.followers >= 1000
                    ? `${(impactStats.followers / 1000).toFixed(1)}K`
                    : impactStats.followers.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                <span className="text-purple-100 text-sm">This Month</span>
                <span className={`font-bold text-lg ${
                  impactStats.monthlyGrowth > 0 
                    ? 'text-green-300' 
                    : impactStats.monthlyGrowth < 0 
                    ? 'text-red-300' 
                    : 'text-white'
                }`}>
                  {impactStats.monthlyGrowth > 0 ? '+' : ''}{impactStats.monthlyGrowth}%
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SuggestionsSidebar;
