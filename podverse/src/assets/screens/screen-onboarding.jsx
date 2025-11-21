import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient.js';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Globe, Camera, CheckCircle, XCircle, UserCircle } from 'lucide-react';
import ProfileMarry from '../images/icon-profile-marry.png';
import PodcastIllustration from '../images/Podcast-audience-bro.png';
import SpeechIllustration from '../images/Speech-to-text-bro.png';
import { FaPodcast, FaHeadphones, FaUserCircle } from 'react-icons/fa';
import { MdWaves, MdAccountCircle } from 'react-icons/md';

const API_BASE_URL = 'http://localhost:8000';

const OnboardingScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    bio: '',
    profile_url: '',
    cover_image_url: '',
    is_private: null // null means not selected yet
  });
  
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const usernameTimeoutRef = useRef(null);

  // Check if user already has profile and load Google profile data
  useEffect(() => {
    const checkProfileAndLoadGoogleData = async () => {
      if (!user?.id) {
        navigate('/signin-email');
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, username, onboarding_complete')
          .eq('id', user.id)
          .single();

        // If profile exists and onboarding is complete, redirect to create-podcast
        if (profile && profile.onboarding_complete === true) {
          navigate('/create-podcast', { replace: true });
          return;
        }

        // Profile doesn't exist, load Google profile data if available
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser) {
          // Check if user logged in via Google or other OAuth provider
          const provider = authUser.app_metadata?.provider || authUser.user_metadata?.provider;
          const googleAvatar = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture;
          const googleName = authUser.user_metadata?.full_name || authUser.user_metadata?.name;
          
          // Auto-fill form with Google data
          if (googleName && !formData.full_name) {
            setFormData(prev => ({
              ...prev,
              full_name: googleName
            }));
          }
          
          // Set Google profile picture if available
          if (googleAvatar && !formData.profile_url && !avatarPreview) {
            setFormData(prev => ({
              ...prev,
              profile_url: googleAvatar
            }));
            setAvatarPreview(googleAvatar);
          }
        }
      } catch (error) {
        // Profile doesn't exist, continue with onboarding
        console.log('No profile found, continuing onboarding');
        
        // Still try to load Google data
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser) {
            const googleAvatar = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture;
            const googleName = authUser.user_metadata?.full_name || authUser.user_metadata?.name;
            
            if (googleName && !formData.full_name) {
              setFormData(prev => ({
                ...prev,
                full_name: googleName
              }));
            }
            
            if (googleAvatar && !formData.profile_url && !avatarPreview) {
              setFormData(prev => ({
                ...prev,
                profile_url: googleAvatar
              }));
              setAvatarPreview(googleAvatar);
            }
          }
        } catch (err) {
          console.log('Error loading Google data:', err);
        }
      }
    };

    checkProfileAndLoadGoogleData();
  }, [user, navigate]);

  // Username validation and availability check using backend API
  const checkUsername = async (username) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    // Username format validation
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      setUsernameAvailable(false);
      setErrors(prev => ({ ...prev, username: 'Username can only contain letters, numbers, and underscores' }));
      return;
    }

    setIsCheckingUsername(true);
    setErrors(prev => ({ ...prev, username: '' }));

    try {
      const response = await fetch(`${API_BASE_URL}/social-media/profile/username/${encodeURIComponent(username.toLowerCase())}/check`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Username check response:', data); // Debug log

      if (data.available === true) {
        // Username is available
        setUsernameAvailable(true);
        setErrors(prev => ({ ...prev, username: '' }));
      } else {
        // Username already taken or invalid
        setUsernameAvailable(false);
        setErrors(prev => ({ ...prev, username: data.message || 'This username is already taken' }));
      }
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameAvailable(null);
      setErrors(prev => ({ ...prev, username: 'Error checking username. Please try again.' }));
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleUsernameChange = (e) => {
    const value = e.target.value.toLowerCase();
    setFormData({ ...formData, username: value });
    setUsernameAvailable(null);
    setErrors(prev => ({ ...prev, username: '' }));
    
    // Clear previous timeout
    if (usernameTimeoutRef.current) {
      clearTimeout(usernameTimeoutRef.current);
    }
    
    // Debounce username check - check after user stops typing for 500ms
    usernameTimeoutRef.current = setTimeout(() => {
      if (value.length >= 3) {
        checkUsername(value);
      }
    }, 500);
  };

  // Check username when user leaves the field (onBlur)
  const handleUsernameBlur = () => {
    // Clear any pending timeout and check immediately
    if (usernameTimeoutRef.current) {
      clearTimeout(usernameTimeoutRef.current);
    }
    
    if (formData.username && formData.username.length >= 3) {
      checkUsername(formData.username);
    }
  };

  // Handle avatar file selection (no upload yet, just preview)
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
    
    // Create preview (local preview only, no upload)
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Handle cover image file selection (no upload yet, just preview)
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
    
    // Create preview (local preview only, no upload)
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear any pending username check
    if (usernameTimeoutRef.current) {
      clearTimeout(usernameTimeoutRef.current);
    }
    
    // Final username check if not already checked
    if (formData.username && formData.username.length >= 3 && usernameAvailable === null) {
      await checkUsername(formData.username);
      // Wait a bit for the check to complete
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Validation
    const newErrors = {};
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (usernameAvailable === false) {
      newErrors.username = 'Please choose a different username';
    } else if (usernameAvailable === null && formData.username.length >= 3) {
      newErrors.username = 'Please wait while we check username availability';
    }
    
    // Privacy setting is required
    if (formData.is_private === null) {
      newErrors.is_private = 'Please select account privacy (Public or Private)';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Get auth token from Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Create FormData for the API request
      const formDataToSend = new FormData();
      formDataToSend.append('full_name', formData.full_name.trim());
      formDataToSend.append('username', formData.username.toLowerCase().trim());
      if (formData.bio.trim()) {
        formDataToSend.append('bio', formData.bio.trim());
      }
      
      // Add profile image if user selected one
      if (avatarFile) {
        formDataToSend.append('profile_image', avatarFile);
      } else if (avatarPreview && !avatarFile && formData.profile_url) {
        // Google avatar is being used - pass the URL directly
        formDataToSend.append('profile_url', formData.profile_url);
      }
      
      // Add cover image if user selected one
      if (coverFile) {
        formDataToSend.append('cover_image', coverFile);
      }
      
      formDataToSend.append('is_private', formData.is_private.toString());

      // Create profile using backend API (images will be uploaded here if provided)
      const response = await fetch(`${API_BASE_URL}/social-media/create-profile`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formDataToSend
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.detail && result.detail.includes('Username already taken')) {
          setErrors({ username: 'This username is already taken' });
        } else {
          throw new Error(result.detail || 'Failed to create profile');
        }
        setIsSubmitting(false);
        return;
      }

      // Success! Redirect to create-podcast
      navigate('/create-podcast', { replace: true });
    } catch (error) {
      console.error('Error creating profile:', error);
      alert(error.message || 'Failed to create profile. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-purple mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Calculate progress (based on filled fields)
  const progress = Math.round(
    ((formData.full_name ? 1 : 0) +
     (formData.username && usernameAvailable === true ? 1 : 0) +
     (formData.is_private !== null ? 1 : 0)) / 3 * 100
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements - Same as Signup */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-60 h-60 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
        
        {/* Floating Icons */}
        <div className="absolute top-20 left-20 text-purple-400 opacity-20 animate-float">
          <FaPodcast size={24} />
        </div>
        <div className="absolute top-60 right-20 text-indigo-400 opacity-20 animate-float animation-delay-2000">
          <FaHeadphones size={28} />
        </div>
        <div className="absolute bottom-40 left-1/3 text-pink-400 opacity-20 animate-float animation-delay-4000">
          <MdWaves size={32} />
        </div>
      </div>

      {/* Decorative Illustrations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <img 
          src={PodcastIllustration} 
          alt="" 
          className="absolute left-4 top-1/4 w-64 h-64 md:w-80 md:h-80 object-contain opacity-25"
          style={{ transform: 'rotate(-10deg)' }}
        />
        <img 
          src={SpeechIllustration} 
          alt="" 
          className="absolute right-4 bottom-1/4 w-64 h-64 md:w-80 md:h-80 object-contain opacity-25"
          style={{ transform: 'rotate(10deg)' }}
        />
      </div>

      <div className="w-full max-w-3xl relative z-10">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-base font-medium text-gray-200">Profile Setup</span>
            <span className="text-base font-semibold bg-gradient-to-r from-purple-300 via-indigo-300 to-pink-300 bg-clip-text text-transparent">{progress}%</span>
          </div>
          <div className="w-full h-3 bg-gray-800/60 rounded-full overflow-hidden border border-gray-600/50 shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 rounded-full transition-all duration-500 ease-out shadow-lg"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-28 h-28 bg-white rounded-full mb-6 shadow-2xl shadow-purple-500/50 transform hover:scale-105 transition-transform duration-300 ring-4 ring-purple-500/60 border-4 border-purple-500">
            <User className="text-purple-600" size={48} strokeWidth={2} />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-300 via-indigo-300 to-pink-300 bg-clip-text text-transparent mb-4 drop-shadow-lg" style={{ WebkitTextStroke: '1px rgba(147, 51, 234, 0.3)' }}>
            Welcome to PodVerse! 🎙️
          </h1>
          <p className="text-xl text-gray-200 max-w-md mx-auto font-medium">
            Let's personalize your profile. This will only take a minute.
          </p>
        </div>

        {/* Form Card */}
        <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-10 border border-white/20">
          {/* Background Effect Behind Card - Same as Signup */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 rounded-3xl blur opacity-20 -z-10"></div>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-base font-bold text-gray-800">
                <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600"></span>
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <div className={`absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl opacity-0 group-hover:opacity-5 transition-opacity ${
                  errors.full_name ? 'opacity-0' : ''
                }`}></div>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => {
                    setFormData({ ...formData, full_name: e.target.value });
                    setErrors({ ...errors, full_name: '' });
                  }}
                  className={`relative w-full px-5 py-4 pl-14 text-base border-2 rounded-xl focus:outline-none focus:ring-2 transition-all bg-white/50 backdrop-blur-sm ${
                    errors.full_name
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : formData.full_name
                      ? 'border-purple-300 focus:border-purple-500 focus:ring-purple-200'
                      : 'border-gray-200 focus:border-purple-500 focus:ring-purple-200'
                  }`}
                  placeholder="John Doe"
                />
                <div className={`absolute left-4 top-1/2 transform -translate-y-1/2 transition-colors ${
                  formData.full_name ? 'text-purple-600' : 'text-gray-400'
                }`}>
                  <User size={22} />
                </div>
                {formData.full_name && !errors.full_name && (
                  <CheckCircle className="absolute right-4 top-1/2 transform -translate-y-1/2 text-green-500" size={20} />
                )}
              </div>
              {errors.full_name && (
                <p className="flex items-center gap-2 text-base text-red-600 font-medium">
                  <XCircle size={18} />
                  {errors.full_name}
                </p>
              )}
            </div>

            {/* Username */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-base font-bold text-gray-800">
                <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600"></span>
                Username <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <div className={`absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl opacity-0 group-hover:opacity-5 transition-opacity ${
                  errors.username ? 'opacity-0' : ''
                }`}></div>
                <div className="relative flex items-center">
                  <div className={`absolute left-4 top-1/2 transform -translate-y-1/2 transition-colors z-10 ${
                    formData.username ? 'text-purple-600' : 'text-gray-500'
                  }`}>
                    <User size={22} strokeWidth={2} />
                  </div>
                  <span className="absolute left-12 text-gray-500 font-semibold z-10">@</span>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={handleUsernameChange}
                    onBlur={handleUsernameBlur}
                    className={`w-full px-5 py-4 pl-20 pr-14 text-base border-2 rounded-xl focus:outline-none focus:ring-2 transition-all bg-white/50 backdrop-blur-sm ${
                      errors.username
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                        : usernameAvailable === true
                        ? 'border-green-300 focus:border-green-500 focus:ring-green-200'
                        : formData.username
                        ? 'border-purple-300 focus:border-purple-500 focus:ring-purple-200'
                        : 'border-gray-200 focus:border-purple-500 focus:ring-purple-200'
                    }`}
                    placeholder="johndoe"
                    maxLength={30}
                  />
                  {isCheckingUsername && (
                    <div className="absolute right-4">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-500 border-t-transparent"></div>
                    </div>
                  )}
                  {!isCheckingUsername && usernameAvailable === true && (
                    <CheckCircle className="absolute right-4 text-green-500" size={20} />
                  )}
                  {!isCheckingUsername && usernameAvailable === false && (
                    <XCircle className="absolute right-4 text-red-500" size={20} />
                  )}
                </div>
              </div>
              {errors.username && (
                <p className="flex items-center gap-2 text-base text-red-600 font-medium">
                  <XCircle size={18} />
                  {errors.username}
                </p>
              )}
              {usernameAvailable === true && !errors.username && (
                <p className="flex items-center gap-2 text-base text-green-600 font-semibold">
                  <CheckCircle size={18} />
                  Great! This username is available
                </p>
              )}
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <span>3-30 characters</span>
                <span>•</span>
                <span>Letters, numbers, and underscores only</span>
              </p>
            </div>

            {/* Bio */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-base font-bold text-gray-800">
                <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600"></span>
                Bio <span className="text-gray-500 text-sm font-normal">(Optional)</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl opacity-0 group-hover:opacity-5 transition-opacity"></div>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                  className={`relative w-full px-5 py-4 text-base border-2 rounded-xl focus:outline-none focus:ring-2 transition-all resize-none bg-white/50 backdrop-blur-sm ${
                    formData.bio
                      ? 'border-purple-300 focus:border-purple-500 focus:ring-purple-200'
                      : 'border-gray-200 focus:border-purple-500 focus:ring-purple-200'
                  }`}
                  placeholder="Tell us about yourself, your interests, or what you'll be sharing..."
                  maxLength={160}
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Share a bit about yourself with the community
                </p>
                <p className={`text-sm font-semibold ${
                  formData.bio.length > 150 ? 'text-red-500' : 'text-gray-600'
                }`}>
                  {formData.bio.length}/160
                </p>
              </div>
            </div>

            {/* Avatar Upload */}
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-base font-bold text-gray-800">
                <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600"></span>
                Profile Picture <span className="text-gray-500 text-sm font-normal">(Optional)</span>
                {(avatarPreview || formData.profile_url) && !avatarFile && (
                  <span className="ml-auto flex items-center gap-2 text-sm text-green-600 font-semibold">
                    <CheckCircle size={16} />
                    Using Google photo
                  </span>
                )}
              </label>
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full opacity-0 group-hover:opacity-20 transition-opacity blur"></div>
                  <div className="relative">
                    <img
                      src={avatarPreview || formData.profile_url || ProfileMarry}
                      alt="Profile"
                      className="w-24 h-24 rounded-full border-4 border-white shadow-xl object-cover ring-2 ring-purple-100"
                      onError={(e) => {
                        e.target.src = ProfileMarry;
                      }}
                    />
                    {isUploadingAvatar && (
                      <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
                        <div className="animate-spin rounded-full h-8 w-8 border-3 border-white border-t-transparent"></div>
                      </div>
                    )}
                    <label className="absolute -bottom-1 -right-1 bg-gradient-to-r from-purple-600 to-indigo-600 p-2.5 rounded-full shadow-lg hover:shadow-xl cursor-pointer transform hover:scale-110 transition-all">
                      <Camera className="text-white" size={18} />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                        disabled={isUploadingAvatar}
                      />
                    </label>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block">
                    <div className="flex items-center gap-3 px-5 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-400 hover:bg-purple-50/50 transition-all cursor-pointer group">
                      <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                        <Camera className="text-purple-600" size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-semibold text-gray-800">
                          {avatarPreview && !avatarFile 
                            ? 'Change profile picture' 
                            : 'Upload a photo'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {avatarPreview && !avatarFile 
                            ? 'Click to upload a different image' 
                            : 'JPG, PNG or GIF • Max 5MB'}
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                        disabled={isUploadingAvatar}
                      />
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Cover Image Upload */}
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-base font-bold text-gray-800">
                <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600"></span>
                Cover Image <span className="text-gray-500 text-sm font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <div className="w-full h-48 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50 hover:border-purple-400 hover:bg-purple-50/50 transition-all">
                  {coverPreview || formData.cover_image_url ? (
                    <div className="relative w-full h-full">
                      <img
                        src={coverPreview || formData.cover_image_url}
                        alt="Cover"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      {isUploadingCover && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                          <div className="animate-spin rounded-full h-10 w-10 border-3 border-white border-t-transparent"></div>
                        </div>
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
                            disabled={isUploadingCover}
                          />
                        </div>
                      </label>
                    </div>
                  ) : (
                    <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer group">
                      <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors mb-3">
                        <Camera className="text-purple-600" size={24} />
                      </div>
                      <p className="text-base font-semibold text-gray-800 mb-1">Upload cover image</p>
                      <p className="text-sm text-gray-600">JPG, PNG or GIF • Max 5MB</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverChange}
                        className="hidden"
                        disabled={isUploadingCover}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Account Privacy - Required */}
            <div className="border-t-2 border-gray-200 pt-8 space-y-5">
              <label className="flex items-center gap-2 text-base font-bold text-gray-800">
                <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600"></span>
                Account Privacy <span className="text-red-500">*</span>
                <span className="text-sm text-gray-500 font-normal ml-2">(Required)</span>
              </label>
              {errors.is_private && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                  <XCircle className="text-red-500" size={20} />
                  <p className="text-base text-red-600 font-semibold">{errors.is_private}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Public Account Option */}
                <div
                  onClick={() => {
                    setFormData({ ...formData, is_private: false });
                    setErrors({ ...errors, is_private: '' });
                  }}
                  className={`relative p-8 border-4 rounded-3xl cursor-pointer transition-all transform hover:scale-[1.03] hover:shadow-2xl ${
                    formData.is_private === false
                      ? 'border-purple-500 bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-50 shadow-xl shadow-purple-500/30 ring-4 ring-purple-200/50'
                      : 'border-gray-300 hover:border-purple-400 bg-white shadow-md hover:shadow-lg'
                  } ${errors.is_private ? 'border-red-400 ring-2 ring-red-200' : ''}`}
                >
                  {formData.is_private === false && (
                    <div className="absolute -top-3 -right-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 flex items-center justify-center shadow-xl ring-4 ring-white">
                        <CheckCircle className="text-white" size={20} strokeWidth={3} />
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className={`p-5 rounded-3xl transition-all ${
                      formData.is_private === false 
                        ? 'bg-gradient-to-br from-purple-200 via-indigo-200 to-pink-200 shadow-lg' 
                        : 'bg-gray-100'
                    }`}>
                      <Globe className={formData.is_private === false ? 'text-purple-700' : 'text-gray-400'} size={40} strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="font-bold text-2xl text-gray-900 mb-2">Public</h3>
                      <p className="text-base text-gray-600 leading-relaxed">
                        Anyone can discover and view your content
                      </p>
                    </div>
                  </div>
                </div>

                {/* Private Account Option */}
                <div
                  onClick={() => {
                    setFormData({ ...formData, is_private: true });
                    setErrors({ ...errors, is_private: '' });
                  }}
                  className={`relative p-8 border-3 rounded-3xl cursor-pointer transition-all transform hover:scale-[1.03] hover:shadow-2xl ${
                    formData.is_private === true
                      ? 'border-purple-500 bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-50 shadow-xl shadow-purple-500/30 ring-4 ring-purple-200/50'
                      : 'border-gray-300 hover:border-purple-400 bg-white shadow-md hover:shadow-lg'
                  } ${errors.is_private ? 'border-red-400 ring-2 ring-red-200' : ''}`}
                >
                  {formData.is_private === true && (
                    <div className="absolute -top-3 -right-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 flex items-center justify-center shadow-xl ring-4 ring-white">
                        <CheckCircle className="text-white" size={20} strokeWidth={3} />
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className={`p-5 rounded-3xl transition-all ${
                      formData.is_private === true 
                        ? 'bg-gradient-to-br from-purple-200 via-indigo-200 to-pink-200 shadow-lg' 
                        : 'bg-gray-100'
                    }`}>
                      <Lock className={formData.is_private === true ? 'text-purple-700' : 'text-gray-400'} size={40} strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="font-bold text-2xl text-gray-900 mb-2">Private</h3>
                      <p className="text-base text-gray-600 leading-relaxed">
                        Only approved followers can see your posts
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={isSubmitting || usernameAvailable === false || isUploadingAvatar || isUploadingCover}
                className={`group relative w-full py-4 px-6 rounded-xl font-bold text-white transition-all duration-300 overflow-hidden ${
                  isSubmitting || usernameAvailable === false || isUploadingAvatar || isUploadingCover
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-700 hover:via-indigo-700 hover:to-purple-700 shadow-xl hover:shadow-2xl hover:shadow-purple-500/50 transform hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {/* Animated background gradient */}
                {!(isSubmitting || usernameAvailable === false || isUploadingAvatar || isUploadingCover) && (
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-[length:200%_100%] animate-shimmer"></div>
                )}
                <span className="relative flex items-center justify-center gap-3">
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Creating your profile...</span>
                    </>
                  ) : isUploadingAvatar || isUploadingCover ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Uploading image...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Setup</span>
                      <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </span>
              </button>
              <p className="mt-5 text-center text-sm text-gray-600">
                By continuing, you agree to PodVerse's Terms of Service and Privacy Policy
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OnboardingScreen;

