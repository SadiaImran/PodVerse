import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import AdminRoute from '../admin/AdminRoute';
import AdminSidebar from '../admin/AdminSidebar';
import AdminHeader from '../admin/AdminHeader';
import AdminDashboard from '../../screens/admin/screen-admin-dashboard';

const AdminLayout = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const activeRoute = location.pathname;

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        setUser({
          ...authUser,
          name: profile?.full_name || profile?.username || 'Admin User',
          email: authUser.email
        });
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/signin-email');
  };

  const getPageTitle = (route) => {
    const titles = {
      '/admin/dashboard': 'Dashboard',
      '/admin/analytics': 'Analytics',
      '/admin/users': 'User Management',
      '/admin/posts': 'Posts Management',
      '/admin/videos': 'Videos Management',
      '/admin/settings': 'System Settings'
    };
    return titles[route] || 'Admin Panel';
  };

  const handleNavigate = (route) => {
    navigate(route);
  };

  return (
    <AdminRoute>
      <div className="flex min-h-screen bg-gray-50">
        <AdminSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          activeRoute={activeRoute}
          onNavigate={handleNavigate}
        />

        <div className={`flex-1 ${sidebarCollapsed ? 'ml-20' : 'ml-72'} transition-all duration-300`}>
          <AdminHeader
            user={user}
            onLogout={handleLogout}
            pageTitle={getPageTitle(activeRoute)}
          />

          <main className="p-6">
            {children || <AdminDashboard />}
          </main>
        </div>
      </div>
    </AdminRoute>
  );
};
export default AdminLayout;
