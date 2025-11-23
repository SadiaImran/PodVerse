import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBell, FaHome, FaSignOutAlt, FaSearch, FaChevronDown } from 'react-icons/fa';

const AdminHeader = ({ user, onLogout, pageTitle = "Dashboard" }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            {pageTitle}
          </h1>
          <p className="text-gray-500 text-sm">Manage your PodVerse platform</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent w-64"
          />
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FaBell className="text-xl" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 max-h-96 overflow-y-auto">
              <div className="px-4 py-2 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800">Notifications</h3>
              </div>
              {[1, 2, 3].map(i => (
                <div key={i} className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-800">New user registered</p>
                  <p className="text-xs text-gray-500 mt-1">5 minutes ago</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
              {user?.name?.[0] || 'A'}
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-800">{user?.name || 'Admin User'}</p>
              <p className="text-xs text-gray-500">{user?.email || 'admin@podverse.com'}</p>
            </div>
            <FaChevronDown className="text-gray-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
              <button
                onClick={() => navigate('/home')}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-gray-700"
              >
                <FaHome /> View Site
              </button>
              <button
                onClick={onLogout}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-red-600"
              >
                <FaSignOutAlt /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
export default AdminHeader;
