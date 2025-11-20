import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient.js';
import { useAuth } from '../context/AuthContext';
import BaseLayout from '../components/layouts/BaseLayout';
import { 
  Settings, 
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
  Camera
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

  // Profile data fetch karna - Using Backend API
  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) {
        // Agar userId nahi hai, current user ka profile dikhao
        if (currentUser?.id) {
          navigate(`/profile/${currentUser.id}`, { replace: true });
        }
        return;
      }

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

        // Debug: Log profile data to check image URLs
        console.log('Profile data received:', {
          profile_url: profileData.profile_url,
          avatar_url: profileData.avatar_url, // Check for both field names
          cover_image_url: profileData.cover_image_url,
          full_name: profileData.full_name,
          all_fields: Object.keys(profileData)
        });
        
        // Use profile_url or avatar_url (whichever is available)
        const profileImageUrl = profileData.profile_url || profileData.avatar_url || '';
        const coverImageUrl = profileData.cover_image_url || '';
        
        // Check if URLs are valid
        if (profileImageUrl) {
          console.log('Profile Image URL:', profileImageUrl);
        } else {
          console.warn('No profile image URL found in profile data');
        }
        
        if (coverImageUrl) {
          console.log('Cover Image URL:', coverImageUrl);
        } else {
          console.warn('No cover image URL found in profile data');
        }

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

        // User ke posts fetch karo (still using Supabase for posts)
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
          .order('created_at', { ascending: false });

        if (!postsError && postsData) {
          setPosts(postsData);
        }

      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId, currentUser, navigate]);

  // Set up Realtime listeners for followers/following counts
  useEffect(() => {
    if (!userId || !profile) return;

    let followsChannel = null;
    let currentUserChannel = null;
    let mounted = true;

    const setupRealtime = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !mounted) return;

        const currentUserId = user.id;
        console.log('👥 [REALTIME] Setting up follows listener for profile:', userId);
        console.log('👥 [REALTIME] Current user ID:', currentUserId);

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
            console.log('✅ [REALTIME] Successfully subscribed to follows channel for profile:', userId);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ [REALTIME] Follows channel error - Make sure Realtime is enabled for "follows" table');
          }
        });

        // Also set up listener for current user's following count (if viewing own profile)
        if (currentUserId === userId) {
          console.log('👥 [REALTIME] Setting up current user following listener');
          // The existing listeners already cover this case since userId === currentUserId
        } else {
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
            }
          });
        }
      } catch (error) {
        console.error('❌ [REALTIME] Error setting up follows listener:', error);
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
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_BASE_URL}/social-media/connections/followers?user_id=${userId}`, {
        headers: session ? {
          'Authorization': `Bearer ${session.access_token}`,
        } : {},
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setFollowers(result.followers || []);
      } else {
        setConnectionError(result.detail || 'Unable to load followers');
        setFollowers([]);
      }
    } catch (error) {
      console.error('Error fetching followers:', error);
      setConnectionError('Failed to load followers');
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
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_BASE_URL}/social-media/connections/following?user_id=${userId}`, {
        headers: session ? {
          'Authorization': `Bearer ${session.access_token}`,
        } : {},
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setFollowing(result.following || []);
      } else {
        setConnectionError(result.detail || 'Unable to load following');
        setFollowing([]);
      }
    } catch (error) {
      console.error('Error fetching following:', error);
      setConnectionError('Failed to load following');
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

  const totalViews = posts.reduce((sum, post) => sum + (post.views_count || 0), 0);
  const totalLikes = posts.reduce((sum, post) => sum + (post.likes_count || 0), 0);
  const totalComments = posts.reduce((sum, post) => sum + (post.comments_count || 0), 0);
  const engagementRate = totalViews > 0
    ? Math.min(100, Math.round(((totalLikes + totalComments) / totalViews) * 100))
    : 0;
  const websiteUrl = profile?.website_url || profile?.website || '';
  const locationLabel = profile?.location || profile?.city || '';
  const joinedDateLabel = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long'
      })
    : '';

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

  return (
    <BaseLayout>
      <div className="min-h-screen bg-gradient-to-b from-white via-white to-gray-100">
        <div className="relative">
          <div className="relative h-72 md:h-[380px] overflow-hidden bg-gradient-to-r from-[#6D3EFF] via-[#A54EFF] to-[#FF6FB5]">
            {profile.cover_image_url ? (
              <img
                src={profile.cover_image_url}
                alt="Cover"
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => {
                  console.error('Cover image failed to load:', profile.cover_image_url);
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-light-purple to-pink-400" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/25 to-transparent" />
            {isOwnProfile && (
              <button
                onClick={() => setShowCoverModal(true)}
                className="absolute top-5 right-5 bg-white/90 hover:bg-white text-gray-800 px-4 py-2 rounded-full flex items-center gap-2 transition-all shadow-lg"
              >
                <Camera size={18} />
                Edit Cover
              </button>
            )}
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 md:-mt-16 lg:-mt-12 pb-16 relative z-10">
          <div className="bg-gradient-to-br from-[#E0C2FF] via-[#F9D7FF] to-[#FFD4EF] backdrop-blur-md rounded-[40px] shadow-[0_30px_90px_rgba(109,62,255,0.2)] border border-[#D3ABFF] p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="relative">
                  <img
                    src={profile.profile_url || ProfileMarry}
                    alt={profile.full_name || 'User'}
                    className="w-36 h-36 rounded-full border-4 border-white/80 shadow-2xl object-cover bg-gray-50"
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
                      className="absolute -bottom-1 -right-1 bg-light-purple text-white p-3 rounded-full hover:bg-purple-700 transition-all shadow-lg"
                    >
                      <Camera size={16} />
                    </button>
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">
                      {profile.full_name || 'User'}
                    </h1>
                    {profile.is_private ? (
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                        <Lock size={14} />
                        Private
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-light-purple bg-purple-50 px-3 py-1 rounded-full">
                        <Globe size={14} />
                        Public
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-lg">@{profile.username || 'username'}</p>
                  {profile.bio && (
                    <p className="mt-3 text-gray-700 max-w-2xl leading-relaxed">{profile.bio}</p>
                  )}

                  <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600">
                    {locationLabel && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={15} />
                        {locationLabel}
                      </span>
                    )}
                    {websiteUrl && (
                      <a
                        href={websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-light-purple hover:underline"
                      >
                        <LinkIcon size={15} />
                        Website
                      </a>
                    )}
                    {profile.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail size={15} />
                        {profile.email}
                      </span>
                    )}
                    {joinedDateLabel && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={15} />
                        Joined {joinedDateLabel}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {isOwnProfile ? (
                  <>
                    <button
                      onClick={() => setShowInfoModal(true)}
                      className="px-6 py-2.5 bg-light-purple text-white rounded-full hover:bg-purple-700 transition-all flex items-center gap-2 shadow-lg"
                    >
                      <Edit3 size={18} />
                      Edit Profile
                    </button>
                    <button
                      onClick={() => navigate('/settings')}
                      className="px-6 py-2.5 bg-white text-gray-800 rounded-full border border-gray-200 hover:border-gray-300 transition-all flex items-center gap-2"
                    >
                      <Settings size={18} />
                      Settings
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleFollow}
                      className={`px-6 py-2.5 rounded-full transition-all flex items-center gap-2 shadow-md ${
                        isFollowing
                          ? 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          : 'bg-light-purple text-white hover:bg-purple-700'
                      }`}
                    >
                      {isFollowing === 'pending' ? (
                        <>
                          <UserPlus size={18} />
                          Requested
                        </>
                      ) : isFollowing ? (
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
                    <button className="px-6 py-2.5 bg-white text-gray-800 rounded-full border border-gray-200 hover:border-gray-300 transition-all">
                      Message
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-[#E9DCFF] bg-gradient-to-br from-[#E9DCFF] via-white to-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">Posts</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{posts.length}</p>
                <span className="text-xs text-light-purple font-semibold">This month</span>
              </div>
              <div 
                onClick={handleShowFollowers}
                className="rounded-2xl border border-[#FDE4FF] bg-gradient-to-br from-[#FDE4FF] via-white to-white p-5 shadow-sm cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all"
              >
                <p className="text-sm text-gray-500">Followers</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{profile.followers_count || 0}</p>
                <span className="text-xs text-gray-400">Community love</span>
              </div>
              <div 
                onClick={handleShowFollowing}
                className="rounded-2xl border border-[#DFF0FF] bg-gradient-to-br from-[#DFF0FF] via-white to-white p-5 shadow-sm cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all"
              >
                <p className="text-sm text-gray-500">Following</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{profile.following_count || 0}</p>
                <span className="text-xs text-gray-400">Collabs</span>
              </div>
              <div className="rounded-2xl border border-[#FFDDE7] bg-gradient-to-br from-[#FFDDE7] via-white to-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">Engagement</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{engagementRate}%</p>
                <span className="text-xs text-gray-400">Likes + comments</span>
              </div>
            </div>
          </div>

          <div className="mt-10 bg-white rounded-3xl shadow-xl border border-gray-100">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('posts')}
                className={`flex-1 px-6 py-4 text-center font-semibold transition-all ${
                  activeTab === 'posts'
                    ? 'text-light-purple border-b-2 border-light-purple'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Posts
              </button>
              <button
                onClick={() => setActiveTab('about')}
                className={`flex-1 px-6 py-4 text-center font-semibold transition-all ${
                  activeTab === 'about'
                    ? 'text-light-purple border-b-2 border-light-purple'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                About
              </button>
            </div>

            <div className="p-6 md:p-8">
              {activeTab === 'posts' && (
                <div className="space-y-6">
                  {profile.is_private && !isOwnProfile && !isFollowing && (
                    <div className="text-center py-14 bg-gray-50 rounded-3xl border border-dashed border-gray-300">
                      <Lock size={48} className="mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-800 text-xl font-semibold mb-2">This account is private</p>
                      <p className="text-gray-500 mb-6">
                        Follow {profile.full_name || 'this creator'} to unlock their content.
                      </p>
                      <button
                        onClick={handleFollow}
                        className="px-6 py-2.5 bg-light-purple text-white rounded-full hover:bg-purple-700 transition-all"
                      >
                        Request Follow
                      </button>
                    </div>
                  )}

                  {!profile.is_private || isOwnProfile || isFollowing ? (
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
                      <div className="space-y-6">
                        {posts.map((post) => (
                          <div
                            key={post.id}
                            className="border border-gray-100 rounded-3xl p-5 shadow-md hover:shadow-lg transition-all"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h3 className="text-xl font-bold text-gray-900">{post.podcastTitle}</h3>
                                <p className="text-sm text-gray-500">
                                  {new Date(post.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </p>
                              </div>
                              <span className="text-xs font-semibold text-light-purple bg-purple-50 px-3 py-1 rounded-full">
                                Podcast drop
                              </span>
                            </div>
                            <p className="text-gray-700 mb-4">{post.description}</p>
                            {post.video_url && (
                              <div className="overflow-hidden rounded-2xl border border-gray-100 mb-4">
                                <video
                                  src={post.video_url}
                                  poster={post.thumbnail_url}
                                  className="w-full"
                                  controls
                                />
                              </div>
                            )}
                            <div className="flex flex-wrap gap-6 text-sm text-gray-500">
                              <span className="inline-flex items-center gap-1">
                                <Heart size={16} />
                                {post.likes_count || 0} Likes
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <MessageCircle size={16} />
                                {post.comments_count || 0} Comments
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Eye size={16} />
                                {post.views_count || 0} Plays
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : null}
                </div>
              )}

              {activeTab === 'about' && (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-3xl border border-gray-100 p-6 bg-gradient-to-br from-purple-50 to-white">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Story</h3>
                    <p className="text-gray-700 leading-relaxed">
                      {profile.bio || 'No bio yet. Share your vibe, mission, and what makes your pod unique!'}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-gray-100 p-6 bg-white">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Account information</h3>
                    <div className="space-y-3 text-gray-700">
                      <div className="flex items-center gap-3">
                        <Calendar size={18} className="text-light-purple" />
                        <span>{joinedDateLabel ? `Joined ${joinedDateLabel}` : 'Joining soon'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Lock size={18} className="text-light-purple" />
                        <span>{profile.is_private ? 'Private profile' : 'Public profile'}</span>
                      </div>
                      {locationLabel && (
                        <div className="flex items-center gap-3">
                          <MapPin size={18} className="text-light-purple" />
                          <span>{locationLabel}</span>
                        </div>
                      )}
                      {websiteUrl && (
                        <div className="flex items-center gap-3">
                          <LinkIcon size={18} className="text-light-purple" />
                          <a
                            href={websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-light-purple hover:underline"
                          >
                            {websiteUrl}
                          </a>
                        </div>
                      )}
                      {profile.email && (
                        <div className="flex items-center gap-3">
                          <Mail size={18} className="text-light-purple" />
                          <span>{profile.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
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
                    <button
                      onClick={() => {
                        setShowFollowersModal(false);
                        handleFollow();
                      }}
                      className="px-4 py-2 text-sm bg-light-purple text-white rounded-lg hover:bg-purple-700 transition-all"
                    >
                      Follow to View
                    </button>
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
                    <button
                      onClick={() => {
                        setShowFollowingModal(false);
                        handleFollow();
                      }}
                      className="px-4 py-2 text-sm bg-light-purple text-white rounded-lg hover:bg-purple-700 transition-all"
                    >
                      Follow to View
                    </button>
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
    </BaseLayout>
  );
};

export default ProfilePage;

