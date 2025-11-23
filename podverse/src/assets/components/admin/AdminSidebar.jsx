import { useState } from 'react';
import {
  FaUsers, FaVideo, FaFileAlt, FaMicrophone, FaChartBar, FaCog,
  FaShieldAlt, FaDatabase, FaUserShield, FaBell, FaRobot, FaTachometerAlt,
  FaBars, FaTimes, FaPodcast, FaChevronDown, FaChevronRight, FaFlag,
  FaClipboardList, FaChartLine
} from 'react-icons/fa';

const AdminSidebar = ({ collapsed, onToggle, activeRoute, onNavigate }) => {
  const [expandedSections, setExpandedSections] = useState({
    dashboard: true,
    analytics: true
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const menuSections = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: FaTachometerAlt,
      route: '/admin/dashboard',
      single: true
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: FaChartLine,
      route: '/admin/analytics',
      single: true
    },
    {
      id: 'users',
      label: 'Users',
      icon: FaUsers,
      route: '/admin/users',
      single: true,
      description: 'User list, profiles, details, edit all in one'
    },

    // AI & GENERATION (2)
    {
      id: 'ai',
      label: 'AI Studio',
      icon: FaRobot,
      items: [
        { label: 'Avatar Templates', route: '/admin/ai/avatars', description: 'Manage avatar templates' },
        { label: 'Voices', route: '/admin/ai/voices', description: 'Manage voices' }
      ]
    },

    // CONTENT MANAGEMENT (3)
    {
      id: 'content',
      label: 'Content',
      icon: FaFileAlt,
      items: [
        { label: 'Posts & Comments', route: '/admin/posts', description: 'Posts, comments, moderation' },
        { label: 'FAQs', route: '/admin/faqs', description: 'FAQs' },
        { label: 'Media Library', route: '/admin/media', description: 'Videos, audio, images' }
      ]
    },

    // SYSTEM MANAGEMENT (4)
    {
      id: 'system',
      label: 'System',
      icon: FaCog,
      items: [
        { label: 'Settings', route: '/admin/settings', description: 'Settings + API keys + storage' },
        { label: 'Admin Users', route: '/admin/admin-users', description: 'Admins + roles + permissions' },
        { label: 'Security', route: '/admin/security', description: 'Logs + privacy + audit' },
        { label: 'Database & Health', route: '/admin/database', description: 'DB + system health' }
      ]
    },

    // SOCIAL & COMMUNICATION (3)
    {
      id: 'social',
      label: 'Social',
      icon: FaBell,
      items: [
        { label: 'Social Management', route: '/admin/social', description: 'Connections + notifications' },
        { label: 'Content Reports', route: '/admin/reports', description: 'Flagged content moderation' },
        { label: 'Activity Logs', route: '/admin/activity', description: 'All platform activity' }
      ]
    }
  ];

  return (
    <div className={`${collapsed ? 'w-20' : 'w-72'} bg-gradient-to-b from-slate-900 to-slate-800 h-screen fixed left-0 top-0 transition-all duration-300 overflow-y-auto border-r border-slate-700 shadow-2xl z-50`}>
      {/* Logo */}
      <div className="p-6 border-b border-slate-700 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-2 rounded-lg">
              <FaPodcast className="text-white text-xl" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">PodVerse</h2>
              <p className="text-purple-400 text-xs">Admin Panel</p>
            </div>
          </div>
        )}
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-slate-700 rounded-lg"
        >
          {collapsed ? <FaBars /> : <FaTimes />}
        </button>
      </div>

      {/* Menu Items */}
      <nav className="p-4 space-y-2">
        {menuSections.map(section => (
          <div key={section.id}>
            {section.single ? (
              <button
                onClick={() => onNavigate(section.route)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeRoute === section.route
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                  : 'text-gray-400 hover:bg-slate-700 hover:text-white'
                  }`}
                title={section.description}
              >
                <section.icon className="text-lg flex-shrink-0" />
                {!collapsed && <span className="font-medium">{section.label}</span>}
              </button>
            ) : (
              <div>
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-gray-400 hover:bg-slate-700 hover:text-white transition-all"
                >
                  <div className="flex items-center gap-3">
                    <section.icon className="text-lg flex-shrink-0" />
                    {!collapsed && <span className="font-medium">{section.label}</span>}
                  </div>
                  {!collapsed && (
                    expandedSections[section.id] ? <FaChevronDown /> : <FaChevronRight />
                  )}
                </button>

                {!collapsed && expandedSections[section.id] && (
                  <div className="ml-4 mt-2 space-y-1 border-l-2 border-slate-700 pl-4">
                    {section.items.map(item => (
                      <button
                        key={item.route}
                        onClick={() => onNavigate(item.route)}
                        className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${activeRoute === item.route
                          ? 'bg-purple-600/20 text-purple-400 font-medium'
                          : 'text-gray-500 hover:text-gray-300 hover:bg-slate-700'
                          }`}
                        title={item.description}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
};

export default AdminSidebar;