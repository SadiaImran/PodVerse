import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, UserMinus, Clock, X } from 'lucide-react';
import { supabase } from '../supabaseClient.js';
import { useAuth } from '../context/AuthContext';
import BaseLayout from '../components/layouts/BaseLayout';
import ProfileMarry from '../images/icon-profile-marry.png';

const API_BASE_URL = 'http://localhost:8000';

const SearchPage = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState(null);

  // Debounced search
  const performSearch = useCallback(async (query) => {
    if (!query.trim() || query.length < 1) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
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
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle search input with debounce
  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300); // 300ms debounce

    setDebounceTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [searchQuery, performSearch]);

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

  return (
    <BaseLayout>
      <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Search Users</h1>
            <p className="text-gray-600">Find and connect with podcasters on PodVerse</p>
          </div>

          {/* Search Bar */}
          <div className="relative mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by username or name..."
                className="w-full pl-12 pr-12 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-light-purple focus:border-transparent text-lg"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-light-purple"></div>
              <span className="ml-3 text-gray-600">Searching...</span>
            </div>
          )}

          {/* No Results */}
          {!loading && searchQuery && searchResults.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
              <Search size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg">No users found</p>
              <p className="text-gray-500 text-sm mt-2">Try a different search term</p>
            </div>
          )}

          {/* Search Results */}
          {!loading && searchResults.length > 0 && (
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

          {/* Empty State - No Search */}
          {!loading && !searchQuery && (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
              <Search size={64} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600 text-lg font-medium mb-2">Start searching</p>
              <p className="text-gray-500 text-sm">Enter a username or name to find users</p>
            </div>
          )}
        </div>
      </div>
    </BaseLayout>
  );
};

export default SearchPage;

