import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../connection_supabase_client';
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
  Camera,
  XCircle
} from 'lucide-react';
import ProfileMarry from '../images/icon-profile-marry.png';
import PostCard from '../components/feed/activity-feed';

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
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Form states for editing
  const [editForm, setEditForm] = useState({
    full_name: '',
    username: '',
    bio: '',
    profile_url: '',
    cover_image_url: '',
    is_private: false
  });

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

        setProfile(normalizedProfile);
        setEditForm({
          full_name: normalizedProfile.full_name || '',
          username: normalizedProfile.username || '',
          bio: normalizedProfile.bio || '',
          profile_url: profileImageUrl,
          cover_image_url: coverImageUrl,
          is_private: normalizedProfile.is_private || false
        });

        // Set is_following from API response
        if (profileData.is_following !== undefined) {
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

  // Follow/Unfollow handler
  const handleFollow = async () => {
    if (!currentUser) {
      navigate('/signin-email');
      return;
    }

    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', userId);
        
        if (!error) {
          setIsFollowing(false);
          setProfile(prev => ({
            ...prev,
            followers_count: Math.max(0, (prev.followers_count || 0) - 1)
          }));
        }
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: currentUser.id,
            following_id: userId
          });
        
        if (!error) {
          setIsFollowing(true);
          setProfile(prev => ({
            ...prev,
            followers_count: (prev.followers_count || 0) + 1
          }));
        }
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
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
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Profile update handler - Using Backend API
  const handleUpdateProfile = async () => {
    if (!currentUser) {
      alert('You must be logged in to update your profile');
      return;
    }

    setIsUpdating(true);

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Create FormData for the API request
      const formDataToSend = new FormData();
      
      if (editForm.full_name) {
        formDataToSend.append('full_name', editForm.full_name.trim());
      }
      if (editForm.username) {
        formDataToSend.append('username', editForm.username.toLowerCase().trim());
      }
      if (editForm.bio !== undefined) {
        formDataToSend.append('bio', editForm.bio.trim() || '');
      }
      
      // Add profile image if user selected one
      if (avatarFile) {
        formDataToSend.append('profile_image', avatarFile);
      } else if (editForm.profile_url && !avatarFile) {
        // If URL is provided and no file, pass the URL
        formDataToSend.append('profile_url', editForm.profile_url);
      }
      
      // Add cover image if user selected one
      if (coverFile) {
        formDataToSend.append('cover_image', coverFile);
      } else if (editForm.cover_image_url && !coverFile) {
        // If URL is provided and no file, pass the URL
        formDataToSend.append('cover_image_url', editForm.cover_image_url);
      }
      
      if (editForm.is_private !== undefined) {
        formDataToSend.append('is_private', editForm.is_private.toString());
      }

      // Update profile using backend API
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
        setIsUpdating(false);
        return;
      }

      // Success! Update local state
      if (result.profile) {
        setProfile(result.profile);
        // Reset file states
        setAvatarFile(null);
        setAvatarPreview(null);
        setCoverFile(null);
        setCoverPreview(null);
        setShowEditModal(false);
        alert('Profile updated successfully!');
      }

    } catch (error) {
      console.error('Error updating profile:', error);
      alert(error.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Reset edit modal when closed
  const handleCloseEditModal = () => {
    setShowEditModal(false);
    // Reset to original profile data
    if (profile) {
      setEditForm({
        full_name: profile.full_name || '',
        username: profile.username || '',
        bio: profile.bio || '',
        profile_url: profile.profile_url || '',
        cover_image_url: profile.cover_image_url || '',
        is_private: profile.is_private || false
      });
    }
    // Reset file states
    setAvatarFile(null);
    setAvatarPreview(null);
    setCoverFile(null);
    setCoverPreview(null);
  };

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
      <div className="min-h-screen bg-gray-50">
        {/* Cover Image */}
        <div className="relative h-64 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 overflow-hidden">
          {profile.cover_image_url ? (
            <img
              src={profile.cover_image_url}
              alt="Cover"
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error('Cover image failed to load:', profile.cover_image_url);
                e.target.style.display = 'none';
              }}
              onLoad={() => {
                console.log('Cover image loaded successfully:', profile.cover_image_url);
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-purple-400 via-pink-500 to-red-500"></div>
          )}
          {isOwnProfile && (
            <button
              onClick={() => setShowEditModal(true)}
              className="absolute top-4 right-4 bg-white/90 hover:bg-white text-gray-800 px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-md"
            >
              <Edit3 size={18} />
              Edit Cover
            </button>
          )}
        </div>

        {/* Profile Content */}
        <div className="max-w-6xl mx-auto px-4 -mt-20 relative z-10">
          {/* Profile Header */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              {/* Avatar and Basic Info */}
              <div className="flex flex-col md:flex-row items-center md:items-end gap-4">
                <div className="relative">
                  <img
                    src={profile.profile_url || ProfileMarry}
                    alt={profile.full_name || 'User'}
                    className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover bg-gray-200"
                    onError={(e) => {
                      console.error('Profile image failed to load:', profile.profile_url);
                      if (e.target.src !== ProfileMarry) {
                        e.target.src = ProfileMarry;
                      }
                    }}
                    onLoad={() => {
                      if (profile.profile_url) {
                        console.log('Profile image loaded successfully:', profile.profile_url);
                      }
                    }}
                  />
                  {isOwnProfile && (
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="absolute bottom-0 right-0 bg-light-purple text-white p-2 rounded-full hover:bg-purple-700 transition-all shadow-md"
                    >
                      <Edit3 size={16} />
                    </button>
                  )}
                </div>
                
                <div className="text-center md:text-left">
                  <div className="flex items-center gap-2 justify-center md:justify-start">
                    <h1 className="text-3xl font-bold text-gray-900">
                      {profile.full_name || 'User'}
                    </h1>
                    {profile.is_private && (
                      <div className="flex items-center gap-1 text-gray-600" title="Private Account">
                        <Lock size={18} />
                        <span className="text-sm font-medium">Private</span>
                      </div>
                    )}
                    {!profile.is_private && (
                      <div className="flex items-center gap-1 text-gray-600" title="Public Account">
                        <Globe size={18} />
                        <span className="text-sm font-medium">Public</span>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-500 mb-2">@{profile.username || 'username'}</p>
                  {profile.bio && (
                    <p className="text-gray-700 max-w-md">{profile.bio}</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                {isOwnProfile ? (
                  <>
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="px-6 py-2 bg-light-purple text-white rounded-lg hover:bg-purple-700 transition-all flex items-center gap-2 shadow-md"
                    >
                      <Edit3 size={18} />
                      Edit Profile
                    </button>
                    <button
                      onClick={() => navigate('/settings')}
                      className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all flex items-center gap-2"
                    >
                      <Settings size={18} />
                      Settings
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleFollow}
                      className={`px-6 py-2 rounded-lg transition-all flex items-center gap-2 shadow-md ${
                        isFollowing
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-light-purple text-white hover:bg-purple-700'
                      }`}
                    >
                      {isFollowing ? (
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
                    <button className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all">
                      Message
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8 mt-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{posts.length}</p>
                <p className="text-sm text-gray-500">Posts</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {profile.followers_count || 0}
                </p>
                <p className="text-sm text-gray-500">Followers</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {profile.following_count || 0}
                </p>
                <p className="text-sm text-gray-500">Following</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {posts.reduce((sum, post) => sum + (post.views_count || 0), 0)}
                </p>
                <p className="text-sm text-gray-500">Total Views</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-2xl shadow-lg mb-6">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('posts')}
                className={`flex-1 px-6 py-4 text-center font-medium transition-all ${
                  activeTab === 'posts'
                    ? 'text-light-purple border-b-2 border-light-purple'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Posts
              </button>
              <button
                onClick={() => setActiveTab('about')}
                className={`flex-1 px-6 py-4 text-center font-medium transition-all ${
                  activeTab === 'about'
                    ? 'text-light-purple border-b-2 border-light-purple'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                About
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'posts' && (
                <div className="space-y-6">
                  {/* Private Profile Restriction Message */}
                  {profile.is_private && !isOwnProfile && !isFollowing && (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                      <Lock size={48} className="mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-700 text-lg font-semibold mb-2">This Account is Private</p>
                      <p className="text-gray-600 mb-4">
                        Follow this account to see their posts
                      </p>
                      <button
                        onClick={handleFollow}
                        className="px-6 py-2 bg-light-purple text-white rounded-lg hover:bg-purple-700 transition-all"
                      >
                        Follow
                      </button>
                    </div>
                  )}
                  
                  {!profile.is_private || isOwnProfile || isFollowing ? (
                    posts.length === 0 ? (
                      <div className="text-center py-12">
                        <Mic size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600 text-lg">No posts yet</p>
                        {isOwnProfile && (
                          <button
                            onClick={() => navigate('/create-podcast')}
                            className="mt-4 px-6 py-2 bg-light-purple text-white rounded-lg hover:bg-purple-700"
                          >
                            Create Your First Post
                          </button>
                        )}
                      </div>
                    ) : (
                      posts.map((post) => (
                      <div key={post.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{post.podcastTitle}</h3>
                        <p className="text-gray-600 mb-4">{post.description}</p>
                        {post.video_url && (
                          <video
                            src={post.video_url}
                            poster={post.thumbnail_url}
                            className="w-full rounded-lg"
                            controls
                          />
                        )}
                        <div className="flex items-center gap-6 mt-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Heart size={16} />
                            {post.likes_count || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle size={16} />
                            {post.comments_count || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye size={16} />
                            {post.views_count || 0}
                          </span>
                        </div>
                      </div>
                      ))
                    )
                  ) : null}
                </div>
              )}

              {activeTab === 'about' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Bio</h3>
                    <p className="text-gray-700">
                      {profile.bio || 'No bio available'}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-gray-700">
                        <Calendar size={18} className="text-gray-400" />
                        <span>Joined {new Date(profile.created_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long' 
                        })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl p-6 md:p-8 relative max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-2xl"
              onClick={handleCloseEditModal}
            >
              ✕
            </button>

            <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Profile</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-light-purple"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value.toLowerCase() })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-light-purple"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-light-purple"
                  placeholder="Tell us about yourself..."
                  maxLength={160}
                />
                <p className="text-xs text-gray-500 mt-1">{editForm.bio?.length || 0}/160</p>
              </div>

              {/* Profile Picture Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Picture
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={avatarPreview || editForm.profile_url || ProfileMarry}
                      alt="Profile"
                      className="w-20 h-20 rounded-full border-2 border-gray-300 object-cover"
                      onError={(e) => {
                        e.target.src = ProfileMarry;
                      }}
                    />
                    {avatarPreview && (
                      <button
                        onClick={() => {
                          setAvatarFile(null);
                          setAvatarPreview(null);
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <XCircle size={16} />
                      </button>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block">
                      <div className="flex items-center gap-3 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50/50 transition-all cursor-pointer">
                        <Camera className="text-purple-600" size={20} />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-800">
                            {avatarFile ? 'Change profile picture' : 'Upload a photo'}
                          </p>
                          <p className="text-xs text-gray-600">JPG, PNG or GIF • Max 5MB</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </div>
                    </label>
                  </div>
                </div>
                {!avatarFile && (
                  <div className="mt-2">
                    <label className="block text-xs text-gray-600 mb-1">Or enter image URL:</label>
                    <input
                      type="url"
                      value={editForm.profile_url}
                      onChange={(e) => setEditForm({ ...editForm, profile_url: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-light-purple"
                      placeholder="https://..."
                    />
                  </div>
                )}
              </div>

              {/* Cover Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cover Image
                </label>
                <div className="relative">
                  <div className="w-full h-32 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50">
                    {coverPreview || editForm.cover_image_url ? (
                      <div className="relative w-full h-full">
                        <img
                          src={coverPreview || editForm.cover_image_url}
                          alt="Cover"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        {coverPreview && (
                          <button
                            onClick={() => {
                              setCoverFile(null);
                              setCoverPreview(null);
                            }}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                        <label className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-all cursor-pointer">
                          <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center gap-2 opacity-0 hover:opacity-100 transition-opacity">
                            <Camera className="text-purple-600" size={20} />
                            <span className="text-sm font-semibold text-gray-800">Change cover</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleCoverChange}
                              className="hidden"
                            />
                          </div>
                        </label>
                      </div>
                    ) : (
                      <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer group">
                        <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors mb-2">
                          <Camera className="text-purple-600" size={24} />
                        </div>
                        <p className="text-sm font-semibold text-gray-800 mb-1">Upload cover image</p>
                        <p className="text-xs text-gray-600">JPG, PNG or GIF • Max 5MB</p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCoverChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
                {!coverFile && (
                  <div className="mt-2">
                    <label className="block text-xs text-gray-600 mb-1">Or enter image URL:</label>
                    <input
                      type="url"
                      value={editForm.cover_image_url}
                      onChange={(e) => setEditForm({ ...editForm, cover_image_url: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-light-purple"
                      placeholder="https://..."
                    />
                  </div>
                )}
              </div>

              {/* Privacy Setting */}
              <div className="border-t border-gray-200 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Account Privacy
                </label>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {editForm.is_private ? (
                      <Lock size={24} className="text-gray-600" />
                    ) : (
                      <Globe size={24} className="text-gray-600" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">
                        {editForm.is_private ? 'Private Account' : 'Public Account'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {editForm.is_private 
                          ? 'Only approved followers can see your posts' 
                          : 'Anyone can see your posts and profile'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, is_private: !editForm.is_private })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      editForm.is_private ? 'bg-light-purple' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        editForm.is_private ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateProfile}
                disabled={isUpdating}
                className={`flex-1 px-6 py-3 bg-light-purple text-white rounded-lg hover:bg-purple-700 transition-all font-medium ${
                  isUpdating ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isUpdating ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Updating...
                  </span>
                ) : (
                  'Save Changes'
                )}
              </button>
              <button
                onClick={handleCloseEditModal}
                disabled={isUpdating}
                className={`flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium ${
                  isUpdating ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </BaseLayout>
  );
};

export default ProfilePage;

