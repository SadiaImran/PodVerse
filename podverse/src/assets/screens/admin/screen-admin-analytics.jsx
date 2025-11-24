import React, { useState, useEffect } from 'react';
import {
  FaUsers, FaVideo, FaEye, FaHeart, FaComment, FaShare,
  FaChartLine, FaDownload, FaCalendar,
  FaGlobe, FaMobile, FaDesktop, FaClock
} from 'react-icons/fa';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { HiArrowTrendingDown, HiArrowTrendingUp } from "react-icons/hi2";
import { adminApi } from '../../utils/adminApi';


const AdminAnalytics = () => {
  const [dateRange, setDateRange] = useState('30days');
  const [exportFormat, setExportFormat] = useState('csv');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const days = dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : dateRange === '90days' ? 90 : 365;
      const response = await adminApi.getAnalytics(days);
      if (response.success) {
        setAnalytics(response.analytics);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleExport = () => {
    alert(`Exporting analytics report as ${exportFormat.toUpperCase()}...`);
  };

  const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B'];

  return (
    <div className="p-6 space-y-6">
      {/* Header with Date Range Selector */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Comprehensive platform insights and metrics</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>

          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="csv">Export as CSV</option>
            <option value="xlsx">Export as Excel</option>
            <option value="pdf">Export as PDF</option>
          </select>

          <button
            onClick={handleExport}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
          >
            <FaDownload /> Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <FaUsers className="text-3xl opacity-80" />
          </div>
          <h3 className="text-sm font-medium opacity-90">Total Users</h3>
          <p className="text-3xl font-bold mt-2">{analytics?.total_users?.toLocaleString() || '0'}</p>
          <p className="text-sm opacity-75 mt-1">{analytics?.active_users || 0} active • {analytics?.new_users || 0} new</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <FaVideo className="text-3xl opacity-80" />
          </div>
          <h3 className="text-sm font-medium opacity-90">Total Content</h3>
          <p className="text-3xl font-bold mt-2">{analytics?.total_posts?.toLocaleString() || '0'}</p>
          <p className="text-sm opacity-75 mt-1">{analytics?.new_posts || 0} new posts</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <FaEye className="text-3xl opacity-80" />
          </div>
          <h3 className="text-sm font-medium opacity-90">Total Views</h3>
          <p className="text-3xl font-bold mt-2">{analytics?.total_views ? (analytics.total_views > 1000000 ? `${(analytics.total_views / 1000000).toFixed(1)}M` : analytics.total_views.toLocaleString()) : '0'}</p>
          <p className="text-sm opacity-75 mt-1">{analytics?.new_views || 0} new views</p>
        </div>

        <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <FaHeart className="text-3xl opacity-80" />
          </div>
          <h3 className="text-sm font-medium opacity-90">Engagement</h3>
          <p className="text-3xl font-bold mt-2">{analytics?.engagement_rate?.toFixed(1) || '0'}%</p>
          <p className="text-sm opacity-75 mt-1">{analytics?.new_likes || 0} new likes • {analytics?.new_comments || 0} new comments</p>
        </div>
      </div>

      {/* Top Posts Table - Real Data */}
      {analytics?.top_posts && Array.isArray(analytics.top_posts) && analytics.top_posts.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Top Performing Posts</h3>
              <p className="text-sm text-gray-600">Most viewed posts</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">Post Content</th>
                  <th className="px-6 py-4 text-center font-semibold text-gray-700">Views</th>
                  <th className="px-6 py-4 text-center font-semibold text-gray-700">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {analytics.top_posts.map((post, idx) => (
                  <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                          {idx + 1}
                        </div>
                        <span className="font-medium text-gray-800">{post.title || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-700">{post.views?.toLocaleString() || 0}</td>
                    <td className="px-6 py-4 text-center text-gray-700">
                      {post.created_at ? new Date(post.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAnalytics;