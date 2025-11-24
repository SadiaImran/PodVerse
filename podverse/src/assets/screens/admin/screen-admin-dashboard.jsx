import { useState, useEffect } from 'react';
import { FaUsers, FaVideo, FaFileAlt, FaChartBar, FaCog, FaShieldAlt, FaPlus, FaCheckCircle, FaExclamationTriangle, FaComment, FaHeart, FaEye } from 'react-icons/fa';
import { adminApi } from '../../utils/adminApi';

function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPosts: 0,
    totalComments: 0,
    totalViews: 0,
    totalLikes: 0,
    totalFAQs: 0,
    totalKnowledgeBase: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Get analytics
      const analyticsResponse = await adminApi.getAnalytics(30);
      if (analyticsResponse.success) {
        setStats({
          totalUsers: analyticsResponse.analytics.total_users || 0,
          totalPosts: analyticsResponse.analytics.total_posts || 0,
          totalComments: analyticsResponse.analytics.total_comments || 0,
          totalViews: analyticsResponse.analytics.total_views || 0,
          totalLikes: analyticsResponse.analytics.total_likes || 0,
          totalFAQs: 0,
          totalKnowledgeBase: 0
        });
      }

      // Get FAQs count
      try {
        const faqsResponse = await adminApi.getFAQs({ limit: 1 });
        if (faqsResponse.success && faqsResponse.pagination) {
          setStats(prev => ({ ...prev, totalFAQs: faqsResponse.pagination.total || 0 }));
        }
      } catch (e) {
        console.error('Error loading FAQs:', e);
      }

      // Get Knowledge Base count
      try {
        const kbResponse = await adminApi.getDocuments({ limit: 1 });
        if (kbResponse.success && kbResponse.pagination) {
          setStats(prev => ({ ...prev, totalKnowledgeBase: kbResponse.pagination.total || 0 }));
        }
      } catch (e) {
        console.error('Error loading KB:', e);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const dashboardStats = [
    {
      label: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      icon: FaUsers,
      color: 'from-blue-500 to-blue-600'
    },
    {
      label: 'Total Posts',
      value: stats.totalPosts.toLocaleString(),
      icon: FaFileAlt,
      color: 'from-green-500 to-green-600'
    },
    {
      label: 'Total Comments',
      value: stats.totalComments.toLocaleString(),
      icon: FaComment,
      color: 'from-purple-500 to-purple-600'
    },
    {
      label: 'Total Views',
      value: stats.totalViews.toLocaleString(),
      icon: FaEye,
      color: 'from-indigo-500 to-indigo-600'
    },
    {
      label: 'Total Likes',
      value: stats.totalLikes.toLocaleString(),
      icon: FaHeart,
      color: 'from-pink-500 to-pink-600'
    },
    {
      label: 'FAQs',
      value: stats.totalFAQs.toLocaleString(),
      icon: FaChartBar,
      color: 'from-orange-500 to-orange-600'
    }
  ];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your PodVerse platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg bg-gradient-to-r ${stat.color}`}>
                <stat.icon className="text-white text-2xl" />
              </div>
            </div>
            <h3 className="text-gray-600 text-sm font-medium">{stat.label}</h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Manage Users', icon: FaUsers, color: 'from-blue-500 to-blue-600', route: '/admin/users' },
          { label: 'View Analytics', icon: FaChartBar, color: 'from-green-500 to-green-600', route: '/admin/analytics' },
          { label: 'Manage Posts', icon: FaFileAlt, color: 'from-purple-500 to-purple-600', route: '/admin/posts' },
          { label: 'FAQs', icon: FaFileAlt, color: 'from-teal-500 to-teal-600', route: '/admin/knowledge-base' }
        ].map((action, idx) => (
          <a
            key={idx}
            href={action.route}
            className={`bg-gradient-to-r ${action.color} text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 flex flex-col items-center gap-3 cursor-pointer`}
          >
            <action.icon className="text-3xl" />
            <span className="font-semibold">{action.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

export default AdminDashboard;
