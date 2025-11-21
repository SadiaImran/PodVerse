import { useState, useRef, useEffect, useCallback } from "react";
import { FaChevronDown } from "react-icons/fa";
import { FiSearch, FiLogOut, FiMenu } from "react-icons/fi";
import { HiOutlineBell } from "react-icons/hi2";
import { UserPlus, Check, X } from "lucide-react";
import ProfileMarry from "../../images/icon-profile-marry.png";
import Logo from "../../images/logo.png";
import { supabase } from "../../supabaseClient.js";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const API_BASE_URL = 'http://localhost:8000';

export default function TopBar({ open, onMenuClick }) {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [fullName, setFullName] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);
  const showNotificationsRef = useRef(showNotifications);

  // Keep ref in sync with state
  useEffect(() => {
    showNotificationsRef.current = showNotifications;
  }, [showNotifications]);

  const { logout } = useAuth();

  // Load user profile from Supabase
  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, profile_url")
        .eq("id", user.id)
        .single();

      setUserData({
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || "",
        profile_url: profile?.profile_url || null,
      });
      setFullName(profile?.full_name || "");
      setPreviewUrl(profile?.profile_url || null);
    }
  };

  // Load notifications (only when dropdown is opened)
  // Memoized with useCallback to prevent unnecessary re-renders in realtime listener
  const loadNotifications = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setLoadingNotifications(true);

      // Get notifications (only fetch when dropdown is open)
      const response = await fetch(`${API_BASE_URL}/social-media/notifications?limit=10&unread_only=false`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      const result = await response.json();
      if (result.success) {
        setNotifications(result.notifications || []);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  }, []);
  
  // Load unread count only (lightweight)
  const loadUnreadCount = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const countResponse = await fetch(`${API_BASE_URL}/social-media/notifications/unread-count`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      const countResult = await countResponse.json();
      if (countResult.success) {
        setUnreadCount(countResult.unread_count || 0);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  useEffect(() => {
    loadProfile();
    
    // Initial unread count fetch
    const fetchInitialUnreadCount = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const countResponse = await fetch(`${API_BASE_URL}/social-media/notifications/unread-count`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
        const countResult = await countResponse.json();
        if (countResult.success) {
          setUnreadCount(countResult.unread_count || 0);
        }
      } catch (error) {
        console.error('Error fetching initial unread count:', error);
      }
    };
    
    fetchInitialUnreadCount();
  }, []);

  // Set up Supabase Realtime listeners for notifications
  // NOTE: Make sure Realtime is enabled for the 'notifications' table in Supabase Dashboard:
  // Dashboard > Database > Replication > Enable for 'notifications' table
  useEffect(() => {
    let notificationsChannel = null;
    let mounted = true;

    const setupRealtime = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.error('❌ Error getting user for realtime:', userError);
          return;
        }

        if (!mounted) return;

        const currentUserId = user.id;
        console.log('🔔 [REALTIME] Setting up listener for user:', currentUserId);

        // Remove existing channel if any
        if (notificationsChannel) {
          console.log('🧹 [REALTIME] Removing existing channel');
          await supabase.removeChannel(notificationsChannel);
        }

        // Create new channel with unique name
        const channelName = `notifications:${currentUserId}`;
        notificationsChannel = supabase.channel(channelName, {
          config: {
            broadcast: { self: false }
          }
        });

        // Listen for INSERT events (new notifications)
        notificationsChannel.on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${currentUserId}`,
          },
          (payload) => {
            console.log('🔔 [REALTIME] NEW NOTIFICATION INSERTED:', payload);
            if (!mounted) return;
            
            // Increment unread count when new notification is inserted
            setUnreadCount((prev) => {
              const newCount = prev + 1;
              console.log('📊 [REALTIME] Unread count:', prev, '→', newCount);
              return newCount;
            });
            
            // If dropdown is open, refresh notifications list to show new notification
            if (showNotificationsRef.current) {
              loadNotifications();
            }
          }
        );

        // Listen for UPDATE events (notification read status changes)
        notificationsChannel.on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${currentUserId}`,
          },
          (payload) => {
            console.log('🔔 [REALTIME] NOTIFICATION UPDATED:', payload);
            if (!mounted) return;
            
            const newRecord = payload.new;
            const oldRecord = payload.old;
            
            // If is_read changed from false to true, decrement unread count
            if (oldRecord.is_read === false && newRecord.is_read === true) {
              setUnreadCount((prev) => {
                const newCount = Math.max(0, prev - 1);
                console.log('📊 [REALTIME] Unread count decremented:', prev, '→', newCount);
                return newCount;
              });
              // Update the notification in the list locally (no need to refresh entire list)
              setNotifications(prev =>
                prev.map(n =>
                  n.id === newRecord.id ? { ...n, is_read: true } : n
                )
              );
            }
            // If is_read changed from true to false, increment unread count
            else if (oldRecord.is_read === true && newRecord.is_read === false) {
              setUnreadCount((prev) => {
                const newCount = prev + 1;
                console.log('📊 [REALTIME] Unread count incremented:', prev, '→', newCount);
                return newCount;
              });
              // Update the notification in the list locally (no need to refresh entire list)
              setNotifications(prev =>
                prev.map(n =>
                  n.id === newRecord.id ? { ...n, is_read: false } : n
                )
              );
            }
            // Don't refresh entire list - we already updated local state
          }
        );

        // Subscribe to the channel
        notificationsChannel.subscribe((status) => {
          console.log('🔔 [REALTIME] Subscription status:', status);
          
          if (status === 'SUBSCRIBED') {
            console.log('✅ [REALTIME] Successfully subscribed to notifications channel');
            console.log('✅ [REALTIME] Listening for INSERT/UPDATE on notifications table');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ [REALTIME] CHANNEL ERROR - Realtime not enabled!');
            console.error('📋 [REALTIME] Steps to fix:');
            console.error('   1. Go to Supabase Dashboard');
            console.error('   2. Navigate to: Database > Replication');
            console.error('   3. Find "notifications" table');
            console.error('   4. Toggle ON to enable Realtime');
          } else if (status === 'TIMED_OUT') {
            console.error('⏱️ [REALTIME] Subscription timed out');
          } else if (status === 'CLOSED') {
            console.warn('⚠️ [REALTIME] Channel closed');
          }
        });
      } catch (error) {
        console.error('❌ [REALTIME] Error setting up:', error);
      }
    };

    // Small delay to ensure component is fully mounted
    const timeoutId = setTimeout(() => {
      setupRealtime();
    }, 500);

    // Cleanup: unsubscribe when component unmounts
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      if (notificationsChannel) {
        console.log('🧹 [REALTIME] Cleaning up channel');
        supabase.removeChannel(notificationsChannel);
      }
    };
  }, []); // Only run once on mount

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/signin-email"; // full redirect clears cached session
  };
  
  const handleSaveProfile = async () => {
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        profile_url: previewUrl,
      })
      .eq("id", userData.id);

    if (!error) {
      setUserData({ ...userData, full_name: fullName, profile_url: previewUrl });
      alert("Profile updated!");
      setShowModal(false);
    } else {
      alert("Failed to update profile.");
    }
  };

  return (
    <nav className="bg-white sticky top-0 flex items-center justify-between p-4 shadow-md font-subheadingDMSans w-full z-50">
      {/* Mobile Menu Button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <FiMenu size={20} />
      </button>

      {open && (
        <div className="hidden md:flex items-center gap-2 mr-6">
          <img src={Logo} alt="Logo" className="w-10 md:w-12" />
          <span className="text-lg font-bold text-light-charcoal font-headingPoppins tracking-wider">
            POD<span className="text-light-purple">VERSE</span>
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 flex-1 max-w-full">
        <div 
          className="relative w-full max-w-[600px] md:mx-auto flex-1 border border-gray-300 rounded-lg cursor-pointer"
          onClick={() => navigate('/search')}
        >
          <input
            type="text"
            placeholder="Search users..."
            className="pl-8 pr-4 py-2 bg-light-background rounded-lg outline-none w-full text-base text-light-black cursor-pointer"
            readOnly
            onFocus={() => navigate('/search')}
          />
          <FiSearch className="absolute left-2 top-2.5 mt-0.5 text-light-grey" />
        </div>

        <div className="flex items-center gap-4 flex-shrink-0 ml-2">
          <div className="relative" ref={notificationRef}>
            <HiOutlineBell 
              className="text-light-charcoal w-8 h-8 cursor-pointer hover:text-light-purple transition-colors" 
              onClick={async () => {
                const wasOpen = showNotifications;
                setShowNotifications(!showNotifications);
                if (!wasOpen) {
                  // Opening dropdown - load notifications first
                  await loadNotifications();
                  // Then mark all unread notifications as read when opening
                  const { data: { session } } = await supabase.auth.getSession();
                  if (session && unreadCount > 0) {
                    try {
                      // Mark all as read - Realtime listener will update unread count automatically
                      await fetch(`${API_BASE_URL}/social-media/notifications/read-all`, {
                        method: 'PATCH',
                        headers: {
                          'Authorization': `Bearer ${session.access_token}`,
                        },
                      });
                      // Update local state immediately (realtime will sync)
                      setUnreadCount(0);
                      setNotifications(prev =>
                        prev.map(n => ({ ...n, is_read: true }))
                      );
                    } catch (error) {
                      console.error('Error marking notifications as read:', error);
                    }
                  }
                }
              }}
            />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 text-xs text-white bg-red-500 rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white border rounded-lg shadow-xl z-50 max-h-[500px] overflow-y-auto">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={async () => {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (session) {
                          try {
                            await fetch(`${API_BASE_URL}/social-media/notifications/read-all`, {
                              method: 'PATCH',
                              headers: {
                                'Authorization': `Bearer ${session.access_token}`,
                              },
                            });
                            // Update local state immediately (realtime will sync)
                            setUnreadCount(0);
                            setNotifications(prev =>
                              prev.map(n => ({ ...n, is_read: true }))
                            );
                            // Reload notifications list to sync
                            await loadNotifications();
                            // No need to call loadUnreadCount - realtime will handle it
                          } catch (error) {
                            console.error('Error marking all as read:', error);
                          }
                        }
                      }}
                      className="text-xs text-light-purple hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {loadingNotifications ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-light-purple mx-auto"></div>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <HiOutlineBell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-4 transition-colors cursor-pointer relative ${
                          !notif.is_read 
                            ? 'bg-gradient-to-r from-light-lightPurple/20 via-light-lightPurple/10 to-transparent border-l-4 border-light-lightPurple hover:from-light-lightPurple/30 hover:via-light-lightPurple/15' 
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={async () => {
                          // Mark as read if not already read
                          if (!notif.is_read) {
                            const { data: { session } } = await supabase.auth.getSession();
                            if (session) {
                              try {
                                await fetch(`${API_BASE_URL}/social-media/notifications/${notif.id}/read`, {
                                  method: 'PATCH',
                                  headers: {
                                    'Authorization': `Bearer ${session.access_token}`,
                                  },
                                });
                                // Update local state immediately (realtime will sync)
                                setNotifications(prev =>
                                  prev.map(n =>
                                    n.id === notif.id ? { ...n, is_read: true } : n
                                  )
                                );
                                setUnreadCount(prev => Math.max(0, prev - 1));
                                // No need to call loadUnreadCount - realtime will handle it
                              } catch (error) {
                                console.error('Error marking notification as read:', error);
                              }
                            }
                          }

                          // Navigate based on notification type
                          if (notif.type === 'follow_request' || notif.type === 'new_follower' || notif.type === 'request_accepted') {
                            const fromUserId = notif.metadata?.from_user_id || notif.from_user?.id;
                            if (fromUserId) {
                              navigate(`/profile/${fromUserId}`);
                              setShowNotifications(false);
                            }
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <img
                            src={notif.from_user?.profile_url || ProfileMarry}
                            alt={notif.from_user?.full_name}
                            className="w-10 h-10 rounded-full object-cover"
                            onError={(e) => {
                              e.target.src = ProfileMarry;
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!notif.is_read ? 'text-gray-900 font-semibold' : 'text-gray-900'}`}>
                              {notif.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(notif.created_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </p>
                            {notif.type === 'follow_request' && notif.metadata?.connection_id && (
                              <div className="flex gap-2 mt-2" key={`actions-${notif.id}`}>
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const { data: { session } } = await supabase.auth.getSession();
                                    if (session && notif.metadata?.connection_id) {
                                      try {
                                        const response = await fetch(`${API_BASE_URL}/social-media/connections/${notif.metadata.connection_id}/respond?action=accept`, {
                                          method: 'PATCH',
                                          headers: {
                                            'Authorization': `Bearer ${session.access_token}`,
                                          },
                                        });
                                        if (response.ok) {
                                          // Reload notifications to update the list
                                          await loadNotifications();
                                        } else {
                                          const error = await response.json();
                                          alert(error.detail || 'Failed to accept request');
                                        }
                                      } catch (error) {
                                        console.error('Error accepting request:', error);
                                        alert('Failed to accept request');
                                      }
                                    }
                                  }}
                                  className="px-3 py-1 text-xs bg-light-purple text-white rounded-lg hover:bg-purple-700 flex items-center gap-1"
                                >
                                  <Check size={14} />
                                  Accept
                                </button>
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const { data: { session } } = await supabase.auth.getSession();
                                    if (session && notif.metadata?.connection_id) {
                                      try {
                                        const response = await fetch(`${API_BASE_URL}/social-media/connections/${notif.metadata.connection_id}/respond?action=reject`, {
                                          method: 'PATCH',
                                          headers: {
                                            'Authorization': `Bearer ${session.access_token}`,
                                          },
                                        });
                                        if (response.ok) {
                                          // Reload notifications to update the list
                                          await loadNotifications();
                                        } else {
                                          const error = await response.json();
                                          alert(error.detail || 'Failed to decline request');
                                        }
                                      } catch (error) {
                                        console.error('Error declining request:', error);
                                        alert('Failed to decline request');
                                      }
                                    }
                                  }}
                                  className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-1"
                                >
                                  <X size={14} />
                                  Decline
                                </button>
                              </div>
                            )}
                          </div>
                          {!notif.is_read && (
                            <div className="w-2.5 h-2.5 bg-light-lightPurple rounded-full mt-2 flex-shrink-0 shadow-sm shadow-light-lightPurple/50"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 cursor-pointer relative" ref={dropdownRef}>
            <img 
              src={userData?.profile_url || ProfileMarry} 
              className="w-8 h-8 rounded-full border-2 border-purple-200 hover:border-purple-400 transition-colors"
              onClick={() => {
                if (userData?.id) {
                  navigate(`/profile/${userData.id}`);
                }
              }}
              alt={userData?.full_name || "User"}
            />
            <span 
              className="text-sm text-gray-800 font-medium hidden sm:block hover:text-purple-600 transition-colors"
              onClick={() => {
                if (userData?.id) {
                  navigate(`/profile/${userData.id}`);
                }
              }}
            >
              {userData?.full_name || "User"}
            </span>
            <FaChevronDown
              className="text-xs text-light-charcoal hidden sm:block"
              onClick={() => setShowDropdown(!showDropdown)}
            />

            {showDropdown && (
              <div className="absolute right-0 mt-10 w-48 bg-white border rounded-md shadow-lg z-50">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    if (userData?.id) {
                      navigate(`/profile/${userData.id}`);
                    }
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-100"
                >
                  View Profile
                </button>
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    setShowModal(true);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Edit Profile
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 hover:bg-light-background hover:text-light-charcoal hover:border-light-purple border-2 bg-light-purple text-white text-sm font-medium rounded-md shadow transition duration-200"
          >
            <FiLogOut className="text-lg" />
            Logout
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-lg p-6 md:p-8 relative">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-xl"
              onClick={() => setShowModal(false)}
              aria-label="Close"
            >
              ✕
            </button>

            <h2 className="text-2xl font-bold text-center text-light-charcoal mb-6">Edit Your Profile</h2>

            <div className="flex flex-col items-center gap-4">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-28 h-28 rounded-full object-cover border-4 border-light-purple shadow-md"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                  No Image
                </div>
              )}

              <div className="w-full">
                <label className="block text-sm font-medium text-gray-600 mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-light-purple focus:border-light-purple text-gray-800 placeholder:text-gray-400"
                  placeholder="Enter your full name"
                />
              </div>

              <button
                className="mt-4 w-full bg-light-purple hover:bg-purple-700 text-white font-semibold py-2 rounded-xl transition-all duration-200 shadow-sm"
                onClick={handleSaveProfile}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
