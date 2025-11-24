import { useState, useRef, useEffect, useCallback } from "react";
import { FaChevronDown } from "react-icons/fa";
import { FiLogOut, FiMenu } from "react-icons/fi";
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
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notificationRef = useRef(null);
  const showNotificationsRef = useRef(showNotifications);

  // Keep ref in sync with state
  useEffect(() => {
    showNotificationsRef.current = showNotifications;
  }, [showNotifications]);

  const { logout } = useAuth();

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

      <div className="flex items-center justify-end gap-4 flex-1 max-w-full">
        <div className="flex items-center gap-4 flex-shrink-0">
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
              <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white border rounded-2xl shadow-2xl z-50 max-h-[500px] overflow-y-auto" style={{ borderColor: '#A388E7' }}>
                <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: '#A388E7', backgroundColor: '#FAFAFBFF' }}>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: '#6057C7' }}>
                      <HiOutlineBell className="w-4 h-4" style={{ color: '#F9F5EB' }} />
                    </div>
                    <h3 className="font-bold" style={{ color: '#6057C7' }}>Notifications</h3>
                  </div>
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
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all border"
                      style={{
                        color: '#6057C7',
                        backgroundColor: '#A388E7',
                        borderColor: '#7d6ce3'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#7d6ce3';
                        e.target.style.color = '#F9F5EB';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#A388E7';
                        e.target.style.color = '#6057C7';
                      }}
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
                        className={`p-4 transition-all cursor-pointer relative rounded-xl mx-2 my-1 border-l-4 ${
                          !notif.is_read 
                            ? 'shadow-md hover:shadow-lg' 
                            : 'hover:bg-gray-50'
                        }`}
                        style={!notif.is_read ? {
                          backgroundColor: '#A388E7',
                          borderLeftColor: '#6057C7'
                        } : {
                          borderLeftColor: 'transparent'
                        }}
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
                          <div className="relative flex-shrink-0">
                            <div className="absolute inset-0 rounded-full opacity-0 hover:opacity-100 blur-md transition-opacity duration-300" style={{ backgroundColor: '#A388E7' }} />
                            <img
                              src={notif.from_user?.profile_url || ProfileMarry}
                              alt={notif.from_user?.full_name}
                              className="relative w-12 h-12 rounded-full object-cover ring-2 shadow-sm"
                              style={{ ringColor: '#A388E7' }}
                              onError={(e) => {
                                e.target.src = ProfileMarry;
                              }}
                            />
                          </div>
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
                                  className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg flex items-center gap-1.5 shadow-md transition-all hover:shadow-lg"
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
                            <div className="w-3 h-3 rounded-full mt-2 flex-shrink-0 shadow-lg animate-pulse" style={{ backgroundColor: '#6057C7' }}></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

    </nav>
  );
}
