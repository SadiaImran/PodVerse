import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient.js';
import { useAuth } from '../context/AuthContext';
import BaseLayout from '../components/layouts/BaseLayout';
import PostCard from '../components/shared/PostCard';
import PostModal from '../components/shared/PostModal';
import { 
  UserPlus, 
  UserMinus, 
  Edit3, 
  Calendar,
  MapPin,
  Link as LinkIcon,
  Mail,
  Mic,
  Heart,
  MessageCircle,
  Eye,
  Lock,
  Globe,
  Camera,
  Tag,
  Play,
  Video,
  Heart as HeartSolid,
  Users as UsersIcon,
  UserCheck,
  Sparkles
} from 'lucide-react';
import ProfileMarry from '../images/icon-profile-marry.png';

const API_BASE_URL = 'http://localhost:8000';

const ProfilePage = () => {
  const { userId } = useParams(); // URL se userId le rahe hain (e.g., /profile/:userId)
  const { user: currentUser } = useAuth(); // Current logged-in user
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts', 'about', 'activity'
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  
  // Form states for editing
  const [infoForm, setInfoForm] = useState({
    full_name: '',
    username: '',
    bio: '',
    is_private: false
  });
  const [avatarForm, setAvatarForm] = useState({
    profile_url: ''
  });
  const [coverForm, setCoverForm] = useState({
    cover_image_url: ''
  });

  const syncProfileState = (profileData) => {
    if (!profileData) return;
    setProfile(profileData);
    setInfoForm({
      full_name: profileData.full_name || '',
      username: profileData.username || '',
      bio: profileData.bio || '',
      is_private: profileData.is_private || false
    });
    setAvatarForm({
      profile_url: profileData.profile_url || ''
    });
    setCoverForm({
      cover_image_url: profileData.cover_image_url || ''
    });
  };

  // File upload states
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Check if this is current user's own profile
  const isOwnProfile = currentUser && userId === currentUser.id;
  const isFollowingApproved = isFollowing === true;
  const isFollowPending = isFollowing === 'pending';
  const isProfilePrivate = profile?.is_private ?? false;
  const shouldShowPrivateLock = isProfilePrivate && !isOwnProfile && !isFollowingApproved;
  const canViewPrivateContent = !isProfilePrivate || isOwnProfile || isFollowingApproved;

  // Track if profile is being fetched to prevent duplicate calls
  const fetchingProfileRef = useRef(false);
  const lastFetchedUserIdRef = useRef(null);

  // Profile data fetch karna - Using Backend API
  useEffect(() => {
    const fetchProfile = async () => {
      // Prevent duplicate fetches
      if (fetchingProfileRef.current) return;
      if (lastFetchedUserIdRef.current === userId && profile) return;
      
      if (!userId) {
        // Agar userId nahi hai, current user ka profile dikhao
        if (currentUser?.id) {
          navigate(`/profile/${currentUser.id}`, { replace: true });
        }
        return;
      }

      fetchingProfileRef.current = true;
      setLoading(true);
      try {
        // Get auth token
        const { data: { session } } = await supabase.auth.getSession();
        
        // Use backend API to fetch profile
        const response = await fetch(`${API_BASE_URL}/social-media/profile/${userId}`, {
          method: 'GET',
          headers: session ? {
            'Authorization': `Bearer ${session.access_token}`,
          } : {},
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Profile not found');
          }
          throw new Error('Failed to fetch profile');
        }

        const result = await response.json();
        const profileData = result.profile;
        
        // Use profile_url or avatar_url (whichever is available)
        const profileImageUrl = profileData.profile_url || profileData.avatar_url || '';
        const coverImageUrl = profileData.cover_image_url || '';

        // Normalize profile data to use consistent field names
        const normalizedProfile = {
          ...profileData,
          profile_url: profileImageUrl,
          cover_image_url: coverImageUrl
        };

        syncProfileState(normalizedProfile);

        // Set connection status from API response
        if (profileData.connection_status) {
          if (profileData.connection_status === 'following') {
            setIsFollowing(true);
          } else if (profileData.connection_status === 'pending') {
            setIsFollowing('pending');
          } else {
            setIsFollowing(false);
          }
        } else if (profileData.is_following !== undefined) {
          // Fallback to old format
          setIsFollowing(profileData.is_following);
        }

        // User ke posts fetch karo with proper likes/comments counts from backend API
        const postsResponse = await fetch(`${API_BASE_URL}/posts/user/${userId}?limit=50&status=published`, {
          method: 'GET',
          headers: session ? {
            'Authorization': `Bearer ${session.access_token}`,
          } : {},
        });

        if (postsResponse.ok) {
          const postsResult = await postsResponse.json();
          if (postsResult.success) {
            // Filter to only published posts (extra safety check)
            const publishedPosts = (postsResult.posts || []).filter(post => post.status === 'published' || !post.status);
            
            // Fetch tags for each post
            const postsWithTags = await Promise.all(
              publishedPosts.map(async (post) => {
                if (post.tags && Array.isArray(post.tags) && post.tags.length > 0) {
                  return post;
                }
                
                // Fetch tags for this post
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
                    return {
                      ...post,
                      tags: postTags.map(pt => ({
                        id: pt.tags?.id || pt.tag_id,
                        name: pt.tags?.name,
                        tag_id: pt.tag_id,
                        tag: pt.tags
                      }))
                    };
                  }
                } catch (err) {
                  console.error(`Error fetching tags for post ${post.id}:`, err);
                }
                
                return { ...post, tags: [] };
              })
            );
            setPosts(postsWithTags);
          }
        } else {
          // Fallback to Supabase if API fails
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select(`
              *,
              profiles:user_id (
                id,
                full_name,
                username,
                profile_url
              )
            `)
          .eq('user_id', userId)
          .eq('status', 'published')
            .order('created_at', { ascending: false });

          if (!postsError && postsData) {
            // Fetch likes and comments counts separately
            const postIds = postsData.map(p => p.id);
            if (postIds.length > 0) {
              // Get likes counts
              const { data: likesData } = await supabase
                .from('post_likes')
                .select('post_id')
                .in('post_id', postIds);

              // Get comments counts
              const { data: commentsData } = await supabase
                .from('comments')
                .select('post_id')
                .in('post_id', postIds);

              // Count likes and comments per post
              const likesCount = {};
              const commentsCount = {};
              
              likesData?.forEach(like => {
                likesCount[like.post_id] = (likesCount[like.post_id] || 0) + 1;
              });
              
              commentsData?.forEach(comment => {
                commentsCount[comment.post_id] = (commentsCount[comment.post_id] || 0) + 1;
              });

              // Add counts to posts
              const postsWithCounts = postsData.map(post => ({
                ...post,
                likes_count: likesCount[post.id] || 0,
                comments_count: commentsCount[post.id] || 0,
                views_count: post.views || 0
              }));

              // Fetch tags for each post
              const postsWithTags = await Promise.all(
                postsWithCounts.map(async (post) => {
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
                      return {
                        ...post,
                        tags: postTags.map(pt => ({
                          id: pt.tags?.id || pt.tag_id,
                          name: pt.tags?.name,
                          tag_id: pt.tag_id,
                          tag: pt.tags
                        }))
                      };
                    }
                  } catch (err) {
                    console.error(`Error fetching tags for post ${post.id}:`, err);
                  }
                  
                  return { ...post, tags: [] };
                })
              );

              setPosts(postsWithTags);
            } else {
              setPosts(postsData);
            }
          }
        }

      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
        fetchingProfileRef.current = false;
        lastFetchedUserIdRef.current = userId;
      }
    };

    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]); // Only depend on userId, navigate is stable

  // Track if realtime is available per profile (persist across re-renders)
  const realtimeAvailableRef = useRef({});

  // Set up Realtime listeners for followers/following counts
  useEffect(() => {
    if (!userId || !profile) return;
    
    // Initialize for this userId if not already set
    if (realtimeAvailableRef.current[userId] === undefined) {
      realtimeAvailableRef.current[userId] = true;
    }
    
    // Skip if we already determined realtime is not available for this profile
    if (!realtimeAvailableRef.current[userId]) {
      // Realtime not available - skip setup completely
      return;
    }

    let followsChannel = null;
    let currentUserChannel = null;
    let mounted = true;

    const setupRealtime = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        // If auth error or no user, skip realtime setup
        if (userError || !user || !mounted) {
          if (userError) {
            // Auth error - mark realtime as unavailable for this profile
            realtimeAvailableRef.current[userId] = false;
          }
          return;
        }

        const currentUserId = user.id;

        // Channel for follows table changes
        const channelName = `follows:${userId}`;
        followsChannel = supabase.channel(channelName, {
          config: {
            broadcast: { self: false }
          }
        });

        // Listen for INSERT events (new follow)
        followsChannel.on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'follows',
            filter: `following_id=eq.${userId}`,
          },
          (payload) => {
            console.log('👥 [REALTIME] New follower added:', payload);
            if (!mounted) return;
            
            // Only update if status is 'accepted'
            if (payload.new.status === 'accepted') {
              setProfile(prev => ({
                ...prev,
                followers_count: (prev.followers_count || 0) + 1
              }));
              
              // Refresh followers list if modal is open
              if (showFollowersModal) {
                fetchFollowers();
              }
            }
          }
        );

        // Listen for DELETE events (unfollow)
        followsChannel.on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'follows',
            filter: `following_id=eq.${userId}`,
          },
          (payload) => {
            console.log('👥 [REALTIME] Follower removed:', payload);
            if (!mounted) return;
            
            setProfile(prev => ({
              ...prev,
              followers_count: Math.max(0, (prev.followers_count || 0) - 1)
            }));
            
            // Refresh followers list if modal is open
            if (showFollowersModal) {
              fetchFollowers();
            }
          }
        );

        // Listen for UPDATE events (status changes, e.g., pending -> accepted)
        followsChannel.on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'follows',
            filter: `following_id=eq.${userId}`,
          },
          (payload) => {
            console.log('👥 [REALTIME] Follow status updated:', payload);
            if (!mounted) return;
            
            const oldStatus = payload.old.status;
            const newStatus = payload.new.status;
            
            // If status changed from non-accepted to accepted, increment
            if (oldStatus !== 'accepted' && newStatus === 'accepted') {
              setProfile(prev => ({
                ...prev,
                followers_count: (prev.followers_count || 0) + 1
              }));
            }
            // If status changed from accepted to non-accepted, decrement
            else if (oldStatus === 'accepted' && newStatus !== 'accepted') {
              setProfile(prev => ({
                ...prev,
                followers_count: Math.max(0, (prev.followers_count || 0) - 1)
              }));
            }
            
            // Refresh followers list if modal is open
            if (showFollowersModal) {
              fetchFollowers();
            }
          }
        );

        // Also listen for following_id changes (when this user follows someone)
        followsChannel.on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'follows',
            filter: `follower_id=eq.${userId}`,
          },
          (payload) => {
            console.log('👥 [REALTIME] New following added:', payload);
            if (!mounted) return;
            
            if (payload.new.status === 'accepted') {
              setProfile(prev => ({
                ...prev,
                following_count: (prev.following_count || 0) + 1
              }));
              
              if (showFollowingModal) {
                fetchFollowing();
              }
            }
          }
        );

        // Listen for UPDATE events on following (when status changes from pending to accepted)
        followsChannel.on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'follows',
            filter: `follower_id=eq.${userId}`,
          },
          (payload) => {
            console.log('👥 [REALTIME] Following status updated:', payload);
            if (!mounted) return;
            
            const oldStatus = payload.old.status;
            const newStatus = payload.new.status;
            
            // If status changed from non-accepted to accepted, increment following count
            if (oldStatus !== 'accepted' && newStatus === 'accepted') {
              setProfile(prev => ({
                ...prev,
                following_count: (prev.following_count || 0) + 1
              }));
              
              if (showFollowingModal) {
                fetchFollowing();
              }
            }
            // If status changed from accepted to non-accepted, decrement following count
            else if (oldStatus === 'accepted' && newStatus !== 'accepted') {
              setProfile(prev => ({
                ...prev,
                following_count: Math.max(0, (prev.following_count || 0) - 1)
              }));
              
              if (showFollowingModal) {
                fetchFollowing();
              }
            }
          }
        );

        followsChannel.on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'follows',
            filter: `follower_id=eq.${userId}`,
          },
          (payload) => {
            console.log('👥 [REALTIME] Following removed:', payload);
            if (!mounted) return;
            
            setProfile(prev => ({
              ...prev,
              following_count: Math.max(0, (prev.following_count || 0) - 1)
            }));
            
            if (showFollowingModal) {
              fetchFollowing();
            }
          }
        );

        followsChannel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // Successfully subscribed - realtime is working
            console.log('✅ [REALTIME] Successfully subscribed to follows channel for profile:', userId);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            // Realtime not enabled for follows table - fail silently
            // Don't log anything, just clean up and mark as unavailable for this profile
            realtimeAvailableRef.current[userId] = false;
            if (followsChannel) {
              supabase.removeChannel(followsChannel);
              followsChannel = null;
            }
            // Also clean up currentUserChannel if it exists
            if (currentUserChannel) {
              supabase.removeChannel(currentUserChannel);
              currentUserChannel = null;
            }
          }
          // Don't log CLOSED status - it's normal on cleanup
        });

        // Also set up listener for current user's following count
        // This is needed to update following_count when current user follows/unfollows someone
        // Whether viewing own profile or someone else's profile
        if (currentUserId === userId && realtimeAvailableRef.current[userId]) {
          // Add UPDATE listener for own profile to handle status changes
          followsChannel.on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'follows',
              filter: `follower_id=eq.${currentUserId}`,
            },
            (payload) => {
              console.log('👥 [REALTIME] Own follow status updated:', payload);
              if (!mounted) return;
              
              const oldStatus = payload.old.status;
              const newStatus = payload.new.status;
              
              // If status changed from non-accepted to accepted, increment following count
              if (oldStatus !== 'accepted' && newStatus === 'accepted') {
                setProfile(prev => ({
                  ...prev,
                  following_count: (prev.following_count || 0) + 1
                }));
              }
              // If status changed from accepted to non-accepted, decrement following count
              else if (oldStatus === 'accepted' && newStatus !== 'accepted') {
                setProfile(prev => ({
                  ...prev,
                  following_count: Math.max(0, (prev.following_count || 0) - 1)
                }));
              }
              
              if (showFollowingModal) {
                fetchFollowing();
              }
            }
          );
        } else if (realtimeAvailableRef.current[userId]) {
          // Set up separate listener for current user's following count
          // This updates when current user follows/unfollows someone while viewing another profile
          currentUserChannel = supabase.channel(`follows:current:${currentUserId}`, {
            config: {
              broadcast: { self: false }
            }
          });

          currentUserChannel.on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'follows',
              filter: `follower_id=eq.${currentUserId}`,
            },
            (payload) => {
              console.log('👥 [REALTIME] Current user started following someone:', payload);
              if (!mounted) return;
              
              // If viewing own profile, update following count
              if (currentUserId === userId && payload.new.status === 'accepted') {
                setProfile(prev => ({
                  ...prev,
                  following_count: (prev.following_count || 0) + 1
                }));
                
                if (showFollowingModal) {
                  fetchFollowing();
                }
              }
            }
          );

          // Listen for UPDATE events - when follow request status changes (pending -> accepted)
          currentUserChannel.on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'follows',
              filter: `follower_id=eq.${currentUserId}`,
            },
            (payload) => {
              console.log('👥 [REALTIME] Current user follow status updated:', payload);
              if (!mounted) return;
              
              const oldStatus = payload.old.status;
              const newStatus = payload.new.status;
              const targetUserId = payload.new.following_id;
              
              // If viewing the profile of the user whose request was accepted
              if (targetUserId === userId) {
                // If status changed from pending to accepted, update the follow status
                if (oldStatus === 'pending' && newStatus === 'accepted') {
                  console.log('✅ [REALTIME] Follow request accepted! Updating status from pending to following');
                  setIsFollowing(true);
                }
                // If status changed from accepted to something else, update accordingly
                else if (oldStatus === 'accepted' && newStatus !== 'accepted') {
                  setIsFollowing(false);
                }
              }
              
              // If viewing own profile, update following count
              if (currentUserId === userId) {
                if (oldStatus !== 'accepted' && newStatus === 'accepted') {
                  setProfile(prev => ({
                    ...prev,
                    following_count: (prev.following_count || 0) + 1
                  }));
                } else if (oldStatus === 'accepted' && newStatus !== 'accepted') {
                  setProfile(prev => ({
                    ...prev,
                    following_count: Math.max(0, (prev.following_count || 0) - 1)
                  }));
                }
                
                if (showFollowingModal) {
                  fetchFollowing();
                }
              }
            }
          );

          currentUserChannel.on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'follows',
              filter: `follower_id=eq.${currentUserId}`,
            },
            (payload) => {
              console.log('👥 [REALTIME] Current user unfollowed someone:', payload);
              if (!mounted) return;
              
              const targetUserId = payload.old.following_id;
              
              // If viewing the profile of the user who was unfollowed, update status
              if (targetUserId === userId) {
                setIsFollowing(false);
              }
              
              // If viewing own profile, update following count
              if (currentUserId === userId) {
                setProfile(prev => ({
                  ...prev,
                  following_count: Math.max(0, (prev.following_count || 0) - 1)
                }));
                
                if (showFollowingModal) {
                  fetchFollowing();
                }
              }
            }
          );

          currentUserChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ [REALTIME] Successfully subscribed to current user follows channel');
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              // Realtime not available - fail silently
              realtimeAvailableRef.current[userId] = false;
              if (currentUserChannel) {
                supabase.removeChannel(currentUserChannel);
                currentUserChannel = null;
              }
            }
          });
        }
      } catch (error) {
        // Silently handle errors - realtime may not be enabled
        realtimeAvailableRef.current[userId] = false;
        if (followsChannel) {
          supabase.removeChannel(followsChannel);
          followsChannel = null;
        }
        if (currentUserChannel) {
          supabase.removeChannel(currentUserChannel);
          currentUserChannel = null;
        }
      }
    };

    setupRealtime();

    return () => {
      mounted = false;
      if (followsChannel) {
        supabase.removeChannel(followsChannel);
      }
      if (currentUserChannel) {
        supabase.removeChannel(currentUserChannel);
      }
    };
  }, [userId, profile, showFollowersModal, showFollowingModal, currentUser]);

  // Set up Realtime listeners for profile posts (likes, comments, new posts)
  useEffect(() => {
    if (!userId) return;

    let postsChannel = null;
    let likesChannel = null;
    let commentsChannel = null;
    let mounted = true;

    const setupPostsRealtime = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        // If auth error or no user, skip realtime setup
        if (userError || !user || !mounted) {
          return;
        }

        // Listen for new posts by this user
        postsChannel = supabase
          .channel(`profile:posts:${userId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'posts',
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              console.log('📹 [REALTIME] New post added to profile:', payload);
              if (!mounted) return;
              // Add new post to the beginning of the list
              setPosts(prev => [payload.new, ...prev]);
            }
          )
          .subscribe();

        // Listen for likes on profile posts (all posts by this user)
        likesChannel = supabase
          .channel(`profile:likes:${userId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'post_likes',
            },
            (payload) => {
              console.log('❤️ [REALTIME] Like update on profile post:', payload);
              if (!mounted) return;
              const postId = payload.new?.post_id || payload.old?.post_id;
              // Update if this post belongs to the profile being viewed
              setPosts(prev => {
                const postExists = prev.some(p => p.id === postId);
                if (!postExists) return prev;
                return prev.map(p => {
                  if (p.id === postId) {
                    if (payload.eventType === 'INSERT') {
                      return {
                        ...p,
                        likes_count: (p.likes_count || 0) + 1
                      };
                    } else if (payload.eventType === 'DELETE') {
                      return {
                        ...p,
                        likes_count: Math.max(0, (p.likes_count || 0) - 1)
                      };
                    }
                  }
                  return p;
                });
              });
            }
          )
          .subscribe();

        // Listen for comments on profile posts
        commentsChannel = supabase
          .channel(`profile:comments:${userId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'comments',
            },
            (payload) => {
              console.log('💬 [REALTIME] New comment on profile post:', payload);
              if (!mounted) return;
              const postId = payload.new.post_id;
              // Update if this post belongs to the profile being viewed
              setPosts(prev => {
                const postExists = prev.some(p => p.id === postId);
                if (!postExists) return prev;
                return prev.map(p => {
                  if (p.id === postId) {
                    return {
                      ...p,
                      comments_count: (p.comments_count || 0) + 1
                    };
                  }
                  return p;
                });
              });
            }
          )
          .subscribe();
      } catch (error) {
        console.error('❌ [REALTIME] Error setting up posts realtime:', error);
      }
    };

    setupPostsRealtime();

    return () => {
      mounted = false;
      if (postsChannel) supabase.removeChannel(postsChannel);
      if (likesChannel) supabase.removeChannel(likesChannel);
      if (commentsChannel) supabase.removeChannel(commentsChannel);
    };
  }, [userId]);

  // Follow/Unfollow handler using new connection API
  const handleFollow = async () => {
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

      if (isFollowing === true) {
        // Unfollow/Remove connection (only if actually following, not pending)
        const response = await fetch(`${API_BASE_URL}/social-media/connections/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          setIsFollowing(false);
          // Update counts immediately (realtime will also update, but this gives instant feedback)
          setProfile(prev => ({
            ...prev,
            followers_count: Math.max(0, (prev.followers_count || 0) - 1)
          }));
          // Also update following count for current user's profile
          if (isOwnProfile) {
            setProfile(prev => ({
              ...prev,
              following_count: Math.max(0, (prev.following_count || 0) - 1)
            }));
          }
        } else {
          const error = await response.json();
          alert(error.detail || 'Failed to unfollow user');
        }
      } else if (isFollowing === 'pending') {
        // Cancel pending request
        const response = await fetch(`${API_BASE_URL}/social-media/connections/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          setIsFollowing(false);
        } else {
          const error = await response.json();
          alert(error.detail || 'Failed to cancel request');
        }
      } else {
        // Send follow request
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
          if (result.status === 'accepted') {
            // Public account - immediately following
            setIsFollowing(true);
            // Update counts immediately (realtime will also update)
            setProfile(prev => ({
              ...prev,
              followers_count: (prev.followers_count || 0) + 1
            }));
            // Also update following count for current user's profile
            if (isOwnProfile) {
              setProfile(prev => ({
                ...prev,
                following_count: (prev.following_count || 0) + 1
              }));
            }
          } else if (result.status === 'pending') {
            // Private account - request sent
            setIsFollowing('pending');
          }
        } else {
          alert(result.detail || 'Failed to follow user');
        }
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      alert('An error occurred. Please try again.');
    }
  };

  // Handle avatar file selection
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    setAvatarFile(file);
    setAvatarForm((prev) => ({ ...prev, profile_url: '' }));
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Handle cover image file selection
  const handleCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    setCoverFile(file);
    setCoverForm((prev) => ({ ...prev, cover_image_url: '' }));
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const updateProfile = async ({ fields = {}, files = {} } = {}) => {
    if (!currentUser) {
      alert('You must be logged in to update your profile');
      return false;
    }

    const formDataToSend = new FormData();
    let hasPayload = false;

    Object.entries(fields).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      formDataToSend.append(
        key,
        typeof value === 'boolean' ? value.toString() : value
      );
      hasPayload = true;
    });

    Object.entries(files).forEach(([key, file]) => {
      if (!file) return;
      formDataToSend.append(key, file);
      hasPayload = true;
    });

    if (!hasPayload) {
      alert('Please provide something to update.');
      return false;
    }

    setIsUpdating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${API_BASE_URL}/social-media/update-profile`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formDataToSend
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.detail && result.detail.includes('Username already taken')) {
          alert('Username already taken. Please choose a different username.');
        } else {
          throw new Error(result.detail || 'Failed to update profile');
        }
        return false;
      }

      if (result.profile) {
        syncProfileState(result.profile);
        setAvatarFile(null);
        setAvatarPreview(null);
        setCoverFile(null);
        setCoverPreview(null);
      }

      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(error.message || 'Failed to update profile. Please try again.');
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateInfo = async () => {
    if (!infoForm.full_name.trim() || !infoForm.username.trim()) {
      alert('Full name and username are required.');
      return;
    }

    const success = await updateProfile({
      fields: {
        full_name: infoForm.full_name.trim(),
        username: infoForm.username.trim(),
        bio: infoForm.bio ?? '',
        is_private: infoForm.is_private
      }
    });

    if (success) {
      setShowInfoModal(false);
    }
  };

  const handleUpdateAvatar = async () => {
    const payload = {};
    const files = {};
    const rawUrl = avatarForm.profile_url ?? '';
    const cleanedUrl = rawUrl.trim();

    if (avatarFile) {
      files.profile_image = avatarFile;
    } else if (avatarForm.profile_url === '') {
      payload.profile_url = '';
    } else if (cleanedUrl) {
      payload.profile_url = cleanedUrl;
    }

    if (!files.profile_image && payload.profile_url === undefined) {
      alert('Upload a photo or paste an image URL.');
      return;
    }

    const success = await updateProfile({ fields: payload, files });

    if (success) {
      setShowAvatarModal(false);
      setAvatarFile(null);
      setAvatarPreview(null);
    }
  };

  const handleUpdateCover = async () => {
    const payload = {};
    const files = {};
    const rawUrl = coverForm.cover_image_url ?? '';
    const cleanedUrl = rawUrl.trim();

    if (coverFile) {
      files.cover_image = coverFile;
    } else if (coverForm.cover_image_url === '') {
      payload.cover_image_url = '';
    } else if (cleanedUrl) {
      payload.cover_image_url = cleanedUrl;
    }

    if (!files.cover_image && payload.cover_image_url === undefined) {
      alert('Upload a cover image or paste an image URL.');
      return;
    }

    const success = await updateProfile({ fields: payload, files });

    if (success) {
      setShowCoverModal(false);
      setCoverFile(null);
      setCoverPreview(null);
    }
  };

  const handleCloseInfoModal = () => {
    if (profile) {
      setInfoForm({
        full_name: profile.full_name || '',
        username: profile.username || '',
        bio: profile.bio || '',
        is_private: profile.is_private || false
      });
    }
    setShowInfoModal(false);
  };

  const handleCloseAvatarModal = () => {
    if (profile) {
      setAvatarForm({
        profile_url: profile.profile_url || ''
      });
    }
    setAvatarFile(null);
    setAvatarPreview(null);
    setShowAvatarModal(false);
  };

  const handleCloseCoverModal = () => {
    if (profile) {
      setCoverForm({
        cover_image_url: profile.cover_image_url || ''
      });
    }
    setCoverFile(null);
    setCoverPreview(null);
    setShowCoverModal(false);
  };

  const [connectionError, setConnectionError] = useState(null);

  // Fetch followers list
  const fetchFollowers = async () => {
    if (!userId) return;
    setLoadingConnections(true);
    setConnectionError(null);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // Check if session is valid
      if (sessionError || !session) {
        setConnectionError('Please log in to view followers');
        setFollowers([]);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/social-media/connections/followers?user_id=${userId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        // Try to parse error message
        let errorMessage = 'Unable to load followers';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || errorMessage;
        }
        setConnectionError(errorMessage);
        setFollowers([]);
        return;
      }

      const result = await response.json();
      if (result.success) {
        setFollowers(result.followers || []);
      } else {
        setConnectionError(result.detail || 'Unable to load followers');
        setFollowers([]);
      }
    } catch (error) {
      // Handle network errors, CORS errors, etc.
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setConnectionError('Network error. Please check your connection or try again later.');
      } else {
        console.error('Error fetching followers:', error);
        setConnectionError('Failed to load followers. Please try again.');
      }
      setFollowers([]);
    } finally {
      setLoadingConnections(false);
    }
  };

  // Fetch following list
  const fetchFollowing = async () => {
    if (!userId) return;
    setLoadingConnections(true);
    setConnectionError(null);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // Check if session is valid
      if (sessionError || !session) {
        setConnectionError('Please log in to view following');
        setFollowing([]);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/social-media/connections/following?user_id=${userId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        // Try to parse error message
        let errorMessage = 'Unable to load following';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || errorMessage;
        }
        setConnectionError(errorMessage);
        setFollowing([]);
        return;
      }

      const result = await response.json();
      if (result.success) {
        setFollowing(result.following || []);
      } else {
        setConnectionError(result.detail || 'Unable to load following');
        setFollowing([]);
      }
    } catch (error) {
      // Handle network errors, CORS errors, etc.
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setConnectionError('Network error. Please check your connection or try again later.');
      } else {
        console.error('Error fetching following:', error);
        setConnectionError('Failed to load following. Please try again.');
      }
      setFollowing([]);
    } finally {
      setLoadingConnections(false);
    }
  };

  // Open followers modal
  const handleShowFollowers = () => {
    setShowFollowersModal(true);
    fetchFollowers();
  };

  // Open following modal
  const handleShowFollowing = () => {
    setShowFollowingModal(true);
    fetchFollowing();
  };

  const websiteUrl = profile?.website_url || profile?.website || '';
  const locationLabel = profile?.location || profile?.city || '';
  const joinedDateLabel = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long'
      })
    : '';

  const totalViews = posts.reduce(
    (sum, post) => sum + (post.views_count || post.views || 0),
    0
  );
  const totalLikes = posts.reduce(
    (sum, post) => sum + (post.likes_count || post.likes || 0),
    0
  );
  const totalComments = posts.reduce(
    (sum, post) => sum + (post.comments_count || 0),
    0
  );

  if (loading) {
    return (
      <BaseLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-purple mx-auto mb-4"></div>
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      </BaseLayout>
    );
  }

  if (!profile) {
    return (
      <BaseLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-gray-600 text-lg">Profile not found</p>
            <button
              onClick={() => navigate('/home')}
              className="mt-4 px-4 py-2 bg-light-purple text-white rounded-lg hover:bg-purple-700"
            >
              Go to Home
            </button>
          </div>
        </div>
      </BaseLayout>
    );
  }

  const statsCards = [
    {
      label: 'Posts',
      value: posts.length,
      sub: 'Published drops',
      icon: Video,
      accent: '#7B5DFF',
      bg: '#ede7ff'
    },
    {
      label: 'Followers',
      value: profile.followers_count || 0,
      sub: 'Creative circle',
      icon: UsersIcon,
      accent: '#FF7AB3',
      bg: '#ffe7f1'
    },
    {
      label: 'Following',
      value: profile.following_count || 0,
      sub: 'Inspiration feed',
      icon: UserCheck,
      accent: '#57A3FF',
      bg: '#e6f1ff'
    },
    {
      label: 'Love',
      value: totalLikes + totalComments,
      sub: 'Likes + comments',
      icon: HeartSolid,
      accent: '#FF9B7B',
      bg: '#ffece8'
    }
  ];

  return (
    <BaseLayout>
      <div
        className="min-h-screen relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #f0ecff 0%, #f6f3ff 55%, #f2eefb 100%)'
        }}
      >
        <div
          className="absolute -top-28 -left-10 w-72 h-72 rounded-full blur-[120px] opacity-60 pointer-events-none"
          style={{ background: '#b9a5ff' }}
        />
        <div
          className="absolute top-40 -right-10 w-96 h-96 rounded-full blur-[140px] opacity-40 pointer-events-none"
          style={{ background: '#ffd5f6' }}
        />

        <div className="relative">
          <div className="relative h-64 md:h-80 overflow-hidden">
            {profile.cover_image_url ? (
              <>
                <img
                  src={profile.cover_image_url}
                  alt="Cover"
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Cover image failed to load:', profile.cover_image_url);
                    e.target.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/15 to-black/35" />
              </>
            ) : (
              <div className="absolute inset-0" style={{ background: 'linear-gradient(120deg, #5f4bd6 0%, #8f7bff 50%, #f6a9ff 100%)' }} />
            )}
            {isOwnProfile && (
              <button
                onClick={() => setShowCoverModal(true)}
                className="absolute top-5 right-5 bg-white/90 backdrop-blur px-4 py-2.5 rounded-full flex items-center gap-2 text-sm font-semibold text-[#2F2867] shadow-lg hover:shadow-xl transition-all"
              >
                <Camera size={18} />
                Edit cover
              </button>
            )}
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 md:-mt-20 pb-16 relative z-10">
          <div
            className="rounded-[32px] border border-white/60 bg-white/80 backdrop-blur-2xl shadow-[0_25px_80px_rgba(96,87,199,0.18)] p-6 md:p-10"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full blur-2xl bg-gradient-to-br from-[#7d6ce3] to-[#c8b8ff] opacity-70"></div>
                  <img
                    src={profile.profile_url || ProfileMarry}
                    alt={profile.full_name || 'User'}
                    className="relative w-32 h-32 md:w-36 md:h-36 rounded-full border-4 border-white shadow-[0_20px_45px_rgba(96,87,199,0.25)] object-cover bg-gray-100"
                    onError={(e) => {
                      console.error('Profile image failed to load:', profile.profile_url);
                      if (e.target.src !== ProfileMarry) {
                        e.target.src = ProfileMarry;
                      }
                    }}
                  />
                  {isOwnProfile && (
                    <button
                      onClick={() => setShowAvatarModal(true)}
                      className="absolute -bottom-1 -right-1 text-white p-2.5 rounded-full transition-all shadow-lg hover:scale-110"
                      style={{ backgroundColor: '#6057C7' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2F2867'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6057C7'}
                    >
                      <Camera size={16} />
                    </button>
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-bold" style={{ color: '#1C1C1C' }}>
                      {profile.full_name || 'User'}
                    </h1>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-white/60 bg-white/80 text-[#6057C7] shadow-sm">
                      {profile.is_private ? <Lock size={12} /> : <Globe size={12} />}
                      {profile.is_private ? 'Private account' : 'Public profile'}
                    </span>
                  </div>
                  <p className="text-base mt-1 font-medium" style={{ color: '#6A6A6A' }}>@{profile.username || 'username'}</p>
                  {profile.bio && (
                    <p className="mt-3 max-w-2xl leading-relaxed text-sm md:text-base" style={{ color: '#3E3F5B' }}>{profile.bio}</p>
                  )}

                  <div className="flex flex-wrap gap-4 mt-5 text-sm" style={{ color: '#6A6A6A' }}>
                    {locationLabel && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin size={14} />
                        {locationLabel}
                      </span>
                    )}
                    {websiteUrl && (
                      <a
                        href={websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 font-semibold"
                        style={{ color: '#6057C7' }}
                      >
                        <LinkIcon size={14} />
                        Website
                      </a>
                    )}
                    {profile.email && (
                      <span className="inline-flex items-center gap-1.5">
                        <Mail size={14} />
                        {profile.email}
                      </span>
                    )}
                    {joinedDateLabel && (
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar size={14} />
                        Joined {joinedDateLabel}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {isOwnProfile ? (
                  <button
                    onClick={() => setShowInfoModal(true)}
                    className="px-6 py-2.5 rounded-full transition-all flex items-center gap-2 font-semibold shadow-md"
                    style={{ backgroundColor: '#6057C7', color: '#F9F5EB' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2F2867'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6057C7'}
                  >
                    <Edit3 size={18} />
                    Edit profile
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleFollow}
                      className={`px-6 py-2.5 rounded-full transition-all flex items-center gap-2 font-semibold shadow-md ${
                        isFollowPending ? 'cursor-not-allowed' : ''
                      }`}
                      style={
                        isFollowingApproved
                          ? { backgroundColor: '#f3f4f6', color: '#1C1C1C' }
                          : isFollowPending
                            ? { backgroundColor: '#f3f4f6', color: '#6A6A6A' }
                            : { backgroundColor: '#6057C7', color: '#F9F5EB' }
                      }
                      disabled={isFollowPending}
                    >
                      {isFollowPending ? (
                        <>
                          <UserPlus size={18} />
                          Requested
                        </>
                      ) : isFollowingApproved ? (
                        <>
                          <UserMinus size={18} />
                          Unfollow
                        </>
                      ) : (
                        <>
                          <UserPlus size={18} />
                          Follow
                        </>
                      )}
                    </button>
                    <button 
                      className="px-6 py-2.5 rounded-full border transition-all font-semibold"
                      style={{ backgroundColor: '#ffffff', color: '#1C1C1C', borderColor: '#e5e7eb' }}
                    >
                      Message
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
              {statsCards.map((card) => {
                const Icon = card.icon;
                const isFollowers = card.label === 'Followers';
                const isFollowing = card.label === 'Following';
                const clickHandler = isFollowers
                  ? handleShowFollowers
                  : isFollowing
                    ? handleShowFollowing
                    : undefined;
                return (
                  <div
                    key={card.label}
                    onClick={clickHandler}
                    className={`rounded-2xl border border-white/70 p-5 shadow-inner transition-transform ${clickHandler ? 'cursor-pointer hover:-translate-y-0.5' : ''}`}
                    style={{ background: card.bg }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: '#6A6A6A' }}>
                          {card.label}
                        </p>
                        <p className="text-3xl font-bold mt-2" style={{ color: '#1C1C1C' }}>
                          {card.value.toLocaleString()}
                        </p>
                        <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                          {card.sub}
                        </p>
                      </div>
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center shadow-md bg-white"
                        style={{ border: `2px solid ${card.accent}` }}
                      >
                        <Icon size={24} style={{ color: card.accent }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            className="mt-10 rounded-[28px] border border-white/60 bg-white/85 backdrop-blur-xl shadow-[0_20px_60px_rgba(96,87,199,0.1)]"
          >
            <div className="p-6 md:p-10">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em]" style={{ color: '#A388E7' }}>Showcase</p>
                  <h2 className="text-2xl font-bold" style={{ color: '#1C1C1C' }}>Latest drops from {profile.full_name?.split(' ')[0] || 'creator'}</h2>
                  <p className="text-sm mt-1" style={{ color: '#6A6A6A' }}>{posts.length} piece{posts.length === 1 ? '' : 's'} crafted with love • {totalViews.toLocaleString()} total views</p>
                </div>
                <div className="flex items-center gap-2 bg-[#f5f3ff] rounded-full p-1 text-sm font-semibold">
                  <button className="px-4 py-1.5 rounded-full text-white" style={{ backgroundColor: '#6057C7' }}>All</button>
                  <button className="px-4 py-1.5 rounded-full" style={{ color: '#6057C7' }}>Video</button>
                  <button className="px-4 py-1.5 rounded-full" style={{ color: '#6057C7' }}>Audio</button>
                </div>
              </div>

              {shouldShowPrivateLock && (
                    <div className="text-center py-16 bg-gray-50 rounded-3xl border border-dashed border-gray-300">
                      <Lock size={56} className="mx-auto text-gray-400 mb-5" />
                      <p className="text-gray-800 text-2xl font-bold mb-3">This account is private</p>
                      <p className="text-gray-600 text-base max-w-md mx-auto">
                        Follow {profile.full_name || 'this account'} to see their videos and posts.
                      </p>
                    </div>
                  )}

                  {canViewPrivateContent ? (
                    posts.length === 0 ? (
                      <div className="text-center py-14 bg-gray-50 rounded-3xl">
                        <Mic size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-700 text-lg">No posts yet</p>
                        {isOwnProfile && (
                          <button
                            onClick={() => navigate('/create-podcast')}
                            className="mt-4 px-6 py-2.5 bg-light-purple text-white rounded-full hover:bg-purple-700 transition-all"
                          >
                            Create your first post
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {posts.map((post) => {
                          const videoUrl = post.video_url || post.media_url;
                          const thumbnailUrl = post.thumbnail_url || videoUrl;
                          const title = post.podcastTitle || post.title || 'Untitled';
                          const views = post.views_count || 0;
                          const likes = post.likes_count || 0;
                          const comments = post.comments_count || 0;
                          
                          const formatViews = (count) => {
                            if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
                            if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
                            return count.toString();
                          };

                          const formatTime = (timestamp) => {
                            if (!timestamp) return '';
                            const now = new Date();
                            const postTime = new Date(timestamp);
                            const diffInDays = Math.floor((now - postTime) / (1000 * 60 * 60 * 24));
                            if (diffInDays < 1) return 'Today';
                            if (diffInDays < 7) return `${diffInDays}d ago`;
                            if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;
                            if (diffInDays < 365) return `${Math.floor(diffInDays / 30)}mo ago`;
                            return `${Math.floor(diffInDays / 365)}y ago`;
                          };

                          return (
                            <div
                              key={post.id}
                              className="group cursor-pointer"
                              onClick={() => {
                                // Format post for modal
                                const formattedPost = {
                                  ...post,
                                  title: post.podcastTitle || post.title,
                                  likes: post.likes_count || 0,
                                  comments: post.comments || [],
                                  comments_count: post.comments_count || 0,
                                  views: post.views_count || 0,
                                  profiles: {
                                    id: profile.id,
                                    full_name: profile.full_name,
                                    username: profile.username,
                                    profile_url: profile.profile_url
                                  }
                                };
                                setSelectedPost(formattedPost);
                                setShowPostModal(true);
                              }}
                            >
                              {/* Thumbnail - Bigger for profile grid */}
                              <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 mb-3 transition-all group-hover:rounded-2xl shadow-md"
                                style={{ backgroundColor: '#f3f4f6' }}
                              >
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
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Play size={32} style={{ color: '#9ca3af' }} />
                                  </div>
                                )}
                                
                                {/* Play overlay on hover */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <div className="w-14 h-14 rounded-full flex items-center justify-center"
                                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
                                    >
                                      <Play size={24} fill="#6057C7" style={{ color: '#6057C7', marginLeft: '2px' }} />
                                    </div>
                                  </div>
                                </div>

                                {/* Duration badge (if available) */}
                                {post.duration && (
                                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-xs font-semibold"
                                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', color: '#ffffff' }}
                                  >
                                    {post.duration}
                                  </div>
                                )}
                              </div>

                              {/* Info - Bigger text for profile grid */}
                              <div>
                                <h3 className="font-semibold text-base mb-2 line-clamp-2 group-hover:underline transition-all"
                                  style={{ color: '#1C1C1C' }}
                                >
                                  {title}
                                </h3>
                                <div className="flex items-center gap-3 text-sm mb-2" style={{ color: '#6A6A6A' }}>
                                  <span>{formatViews(views)} views</span>
                                  <span>•</span>
                                  <span>{formatTime(post.created_at)}</span>
                                </div>
                                <div className="flex items-center gap-4 text-sm" style={{ color: '#6A6A6A' }}>
                                  <div className="flex items-center gap-1.5">
                                    <Heart size={14} />
                                    <span>{formatViews(likes)}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <MessageCircle size={14} />
                                    <span>{formatViews(comments)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                  ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-6 md:p-8 relative max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-2xl"
              onClick={handleCloseInfoModal}
              aria-label="Close"
            >
              ✕
            </button>

            <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full name</label>
                <input
                  type="text"
                  value={infoForm.full_name}
                  onChange={(e) => setInfoForm({ ...infoForm, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-light-purple"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                <input
                  type="text"
                  value={infoForm.username}
                  onChange={(e) => setInfoForm({ ...infoForm, username: e.target.value.toLowerCase() })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-light-purple"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                <textarea
                  value={infoForm.bio}
                  onChange={(e) => setInfoForm({ ...infoForm, bio: e.target.value })}
                  rows={4}
                  maxLength={160}
                  placeholder="Tell the community about your tone, topics and vibe..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-light-purple"
                />
                <p className="text-xs text-gray-500 mt-1">{infoForm.bio?.length || 0}/160</p>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">Account privacy</label>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    {infoForm.is_private ? (
                      <Lock size={22} className="text-gray-600" />
                    ) : (
                      <Globe size={22} className="text-gray-600" />
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">
                        {infoForm.is_private ? 'Private account' : 'Public account'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {infoForm.is_private
                          ? 'Only followers you approve can see content.'
                          : 'Anyone on PodVerse can discover your work.'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInfoForm({ ...infoForm, is_private: !infoForm.is_private })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      infoForm.is_private ? 'bg-light-purple' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        infoForm.is_private ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateInfo}
                disabled={isUpdating}
                className={`flex-1 px-6 py-3 bg-light-purple text-white rounded-xl hover:bg-purple-700 transition-all font-medium ${
                  isUpdating ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isUpdating ? 'Saving...' : 'Save changes'}
              </button>
              <button
                onClick={handleCloseInfoModal}
                disabled={isUpdating}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 transition-all font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl p-6 md:p-8 relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-2xl"
              onClick={handleCloseAvatarModal}
              aria-label="Close"
            >
              ✕
            </button>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">Update profile photo</h2>
            <p className="text-sm text-gray-500 mb-6">Keep it crisp, centered, and on-brand.</p>

            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex flex-col items-center gap-3">
                <img
                  src={avatarPreview || avatarForm.profile_url || profile.profile_url || ProfileMarry}
                  alt="Profile preview"
                  className="w-36 h-36 rounded-3xl object-cover border-4 border-white shadow-lg bg-gray-100"
                  onError={(e) => {
                    e.target.src = ProfileMarry;
                  }}
                />
                {avatarFile && (
                  <button
                    onClick={() => {
                      setAvatarFile(null);
                      setAvatarPreview(null);
                    }}
                    className="text-sm text-red-500 hover:text-red-600"
                  >
                    Remove upload
                  </button>
                )}
              </div>

              <div className="flex-1 space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700 mb-2 block">Upload a new photo</span>
                  <div className="p-4 border-2 border-dashed border-gray-300 rounded-2xl hover:border-light-purple hover:bg-purple-50/40 transition-all cursor-pointer text-center">
                    <Camera className="mx-auto text-light-purple mb-2" size={24} />
                    <p className="text-sm font-semibold text-gray-800">Drag & drop or browse</p>
                    <p className="text-xs text-gray-500">JPG, PNG, GIF • Max 5MB</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </div>
                </label>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Or paste image URL</label>
                  <input
                    type="url"
                    value={avatarForm.profile_url}
                    onChange={(e) => setAvatarForm({ profile_url: e.target.value })}
                    disabled={!!avatarFile}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-light-purple disabled:bg-gray-100"
                    placeholder="https://..."
                  />
                  {avatarFile && (
                    <p className="text-xs text-gray-500 mt-1">Remove the uploaded file to enable URL input.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={handleUpdateAvatar}
                disabled={isUpdating}
                className={`flex-1 px-6 py-3 bg-light-purple text-white rounded-xl hover:bg-purple-700 transition-all font-medium ${
                  isUpdating ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isUpdating ? 'Saving...' : 'Save photo'}
              </button>
              <button
                onClick={handleCloseAvatarModal}
                disabled={isUpdating}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 transition-all font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showCoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl p-6 md:p-8 relative max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-2xl"
              onClick={handleCloseCoverModal}
              aria-label="Close"
            >
              ✕
            </button>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">Refresh cover art</h2>
            <p className="text-sm text-gray-500 mb-6">
              Go widescreen (16:9) for the best hero moment across devices.
            </p>

            <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden mb-6 h-56 relative">
              {coverPreview || coverForm.cover_image_url || profile.cover_image_url ? (
                <img
                  src={coverPreview || coverForm.cover_image_url || profile.cover_image_url}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <Camera size={32} className="mb-2 text-light-purple" />
                  No cover selected yet
                </div>
              )}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/20 to-transparent" />
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700 mb-2 block">Upload an image</span>
                <div className="p-5 border-2 border-dashed border-gray-300 rounded-2xl hover:border-light-purple hover:bg-purple-50/40 transition-all cursor-pointer text-center">
                  <Camera className="mx-auto text-light-purple mb-2" size={26} />
                  <p className="text-sm font-semibold text-gray-800">Drop an image here or click to browse</p>
                  <p className="text-xs text-gray-500">High-res JPG, PNG, GIF • Max 5MB</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverChange}
                    className="hidden"
                  />
                </div>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Or paste cover URL</label>
                <input
                  type="url"
                  value={coverForm.cover_image_url}
                  onChange={(e) => setCoverForm({ cover_image_url: e.target.value })}
                  disabled={!!coverFile}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-light-purple disabled:bg-gray-100"
                  placeholder="https://..."
                />
                {coverFile && (
                  <p className="text-xs text-gray-500 mt-1">Remove the uploaded file to enable URL input.</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={handleUpdateCover}
                disabled={isUpdating}
                className={`flex-1 px-6 py-3 bg-light-purple text-white rounded-xl hover:bg-purple-700 transition-all font-medium ${
                  isUpdating ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isUpdating ? 'Saving...' : 'Save cover'}
              </button>
              <button
                onClick={handleCloseCoverModal}
                disabled={isUpdating}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 transition-all font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Followers Modal */}
      {showFollowersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-6 md:p-8 relative max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Followers</h2>
                <p className="text-sm text-gray-500 mt-1">{profile?.followers_count || 0} {profile?.followers_count === 1 ? 'follower' : 'followers'}</p>
              </div>
              <button
                className="text-gray-400 hover:text-red-500 text-2xl transition-colors"
                onClick={() => {
                  setShowFollowersModal(false);
                  setConnectionError(null);
                }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingConnections ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-light-purple"></div>
                </div>
              ) : connectionError ? (
                <div className="text-center py-12">
                  <Lock size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-800 font-semibold mb-2">Access Restricted</p>
                  <p className="text-gray-600 text-sm mb-4">{connectionError}</p>
                  {!isOwnProfile && profile?.is_private && (
                    <>
                      {isFollowPending ? (
                        <div className="px-4 py-2 text-sm bg-yellow-100 text-yellow-800 rounded-lg border border-yellow-300">
                          Request Pending
                        </div>
                      ) : !isFollowingApproved ? (
                        <button
                          onClick={() => {
                            setShowFollowersModal(false);
                            handleFollow();
                          }}
                          className="px-4 py-2 text-sm bg-light-purple text-white rounded-lg hover:bg-purple-700 transition-all"
                        >
                          Follow to View
                        </button>
                      ) : null}
                    </>
                  )}
                </div>
              ) : followers.length === 0 ? (
                <div className="text-center py-12">
                  <UserPlus size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 font-medium">No followers yet</p>
                  <p className="text-sm text-gray-500 mt-2">When someone follows this account, they'll appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {followers.map((follower) => (
                    <div
                      key={follower.user_id}
                      className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 hover:border-light-purple/30 transition-all cursor-pointer group"
                      onClick={() => {
                        navigate(`/profile/${follower.user_id}`);
                        setShowFollowersModal(false);
                      }}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <img
                          src={follower.profile_url || ProfileMarry}
                          alt={follower.full_name}
                          className="w-14 h-14 rounded-full object-cover border-2 border-gray-200 group-hover:border-light-purple transition-colors flex-shrink-0"
                          onError={(e) => {
                            e.target.src = ProfileMarry;
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{follower.full_name}</p>
                          <p className="text-sm text-gray-500 truncate">@{follower.username}</p>
                          {follower.bio && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-1">{follower.bio}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/profile/${follower.user_id}`);
                          setShowFollowersModal(false);
                        }}
                        className="px-4 py-2 text-sm bg-light-purple text-white rounded-lg hover:bg-purple-700 transition-all flex-shrink-0 ml-2"
                      >
                        View
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Following Modal */}
      {showFollowingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-6 md:p-8 relative max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Following</h2>
                <p className="text-sm text-gray-500 mt-1">{profile?.following_count || 0} {profile?.following_count === 1 ? 'account' : 'accounts'}</p>
              </div>
              <button
                className="text-gray-400 hover:text-red-500 text-2xl transition-colors"
                onClick={() => {
                  setShowFollowingModal(false);
                  setConnectionError(null);
                }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingConnections ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-light-purple"></div>
                </div>
              ) : connectionError ? (
                <div className="text-center py-12">
                  <Lock size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-800 font-semibold mb-2">Access Restricted</p>
                  <p className="text-gray-600 text-sm mb-4">{connectionError}</p>
                  {!isOwnProfile && profile?.is_private && (
                    <>
                      {isFollowPending ? (
                        <div className="px-4 py-2 text-sm bg-yellow-100 text-yellow-800 rounded-lg border border-yellow-300">
                          Request Pending
                        </div>
                      ) : !isFollowingApproved ? (
                        <button
                          onClick={() => {
                            setShowFollowingModal(false);
                            handleFollow();
                          }}
                          className="px-4 py-2 text-sm bg-light-purple text-white rounded-lg hover:bg-purple-700 transition-all"
                        >
                          Follow to View
                        </button>
                      ) : null}
                    </>
                  )}
                </div>
              ) : following.length === 0 ? (
                <div className="text-center py-12">
                  <UserPlus size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 font-medium">Not following anyone yet</p>
                  <p className="text-sm text-gray-500 mt-2">When this account follows someone, they'll appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {following.map((followed) => (
                    <div
                      key={followed.user_id}
                      className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 hover:border-light-purple/30 transition-all cursor-pointer group"
                      onClick={() => {
                        navigate(`/profile/${followed.user_id}`);
                        setShowFollowingModal(false);
                      }}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <img
                          src={followed.profile_url || ProfileMarry}
                          alt={followed.full_name}
                          className="w-14 h-14 rounded-full object-cover border-2 border-gray-200 group-hover:border-light-purple transition-colors flex-shrink-0"
                          onError={(e) => {
                            e.target.src = ProfileMarry;
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{followed.full_name}</p>
                          <p className="text-sm text-gray-500 truncate">@{followed.username}</p>
                          {followed.bio && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-1">{followed.bio}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/profile/${followed.user_id}`);
                          setShowFollowingModal(false);
                        }}
                        className="px-4 py-2 text-sm bg-light-purple text-white rounded-lg hover:bg-purple-700 transition-all flex-shrink-0 ml-2"
                      >
                        View
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Post Modal */}
      <PostModal
        post={selectedPost}
        isOpen={showPostModal}
        onClose={() => {
          setShowPostModal(false);
          setSelectedPost(null);
        }}
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
              setPosts(prev => prev.map(p => {
                if (p.id === postId) {
                  return {
                    ...p,
                    likes_count: result.likes_count || (liked ? (p.likes_count || 0) + 1 : Math.max(0, (p.likes_count || 0) - 1))
                  };
                }
                return p;
              }));
              // Update selected post
              if (selectedPost && selectedPost.id === postId) {
                setSelectedPost(prev => ({
                  ...prev,
                  likes_count: result.likes_count || (liked ? (prev.likes_count || 0) + 1 : Math.max(0, (prev.likes_count || 0) - 1))
                }));
              }
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
              setPosts(prev => prev.map(p => {
                if (p.id === postId) {
                  return {
                    ...p,
                    comments_count: (p.comments_count || 0) + 1
                  };
                }
                return p;
              }));
              // Update selected post
              if (selectedPost && selectedPost.id === postId) {
                setSelectedPost(prev => ({
                  ...prev,
                  comments_count: (prev.comments_count || 0) + 1
                }));
              }
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
              setPosts(prev => prev.map(p => {
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
        onTagClick={(tagName) => {
          navigate(`/search?tag=${encodeURIComponent(tagName)}`);
        }}
      />
    </BaseLayout>
  );
};

export default ProfilePage;

