import React, { useState, useEffect } from 'react';
import {
  FaSearch, FaFilter, FaEdit, FaTrash, FaEye, FaBan, FaCheckCircle,
  FaUserSlash, FaDownload, FaPlus, FaChevronLeft, FaChevronRight,
  FaUserCheck, FaCalendar, FaSortUp, FaSortDown, FaFileAlt, FaTimes, FaSave
} from 'react-icons/fa';
import { adminApi } from '../../utils/adminApi';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [userStats, setUserStats] = useState({ total: 0, active: 0, suspended: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  // Note: status column doesn't exist in profiles table, so we remove status filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    email: '',
    username: '',
    full_name: '',
    password: '',
    role: 'user',
    onboarding_complete: false
  });
  const usersPerPage = 10;

  useEffect(() => {
    loadUsers();
    loadUserStats();
  }, [currentPage, sortField, sortDirection]);

  const loadUserStats = async () => {
    try {
      const response = await adminApi.getUserStats();
      if (response.success) {
        setUserStats(response.stats);
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);

      const response = await adminApi.getUsers({
        page: currentPage,
        limit: usersPerPage,
        search: searchTerm,
        sort_field: sortField,
        sort_direction: sortDirection,
      });

      if (response.success) {
        setUsers(response.users || []);
      } else {
        throw new Error('Failed to load users');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
      alert('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusChange = async (userId, newStatus) => {
    try {
      const response = await adminApi.updateUserStatus(userId, newStatus);

      if (response.success) {
        setUsers(users.map(user =>
          user.id === userId ? { ...user, status: newStatus } : user
        ));
        alert(`User status updated to ${newStatus}`);
      } else {
        throw new Error('Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      const response = await adminApi.deleteUser(userId);

      if (response.success) {
        setUsers(users.filter(user => user.id !== userId));
        setShowDeleteModal(false);
        setUserToDelete(null);
        alert('User deleted successfully');
      } else {
        throw new Error('Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedUsers.length} selected users?`)) {
      try {
        // Delete users one by one (backend doesn't support bulk delete yet)
        for (const userId of selectedUsers) {
          await adminApi.deleteUser(userId);
        }

        setUsers(users.filter(user => !selectedUsers.includes(user.id)));
        setSelectedUsers([]);
        alert('Users deleted successfully');
      } catch (error) {
        console.error('Error deleting users:', error);
        alert('Failed to delete users');
      }
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    setUserForm({
      email: '',
      username: '',
      full_name: '',
      password: '',
      role: 'user',
      onboarding_complete: false
    });
    setShowUserModal(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setUserForm({
      email: user.email || '',
      username: user.username || '',
      full_name: user.full_name || '',
      password: '', // Don't prefill password
      role: user.role || 'user',
      onboarding_complete: user.onboarding_complete || false,
      bio: user.bio || '',
      profile_url: user.profile_url || ''
    });
    setShowUserModal(true);
  };

  const handleViewDetails = async (user) => {
    try {
      const response = await adminApi.getUserById(user.id);
      if (response.success) {
        setViewingUser(response.user);
        setShowDetailsModal(true);
      }
    } catch (error) {
      console.error('Error loading user details:', error);
      alert('Failed to load user details');
    }
  };

  const handleSaveUser = async () => {
    try {
      if (editingUser) {
        // Update user - don't send password if empty
        const updateData = { ...userForm };
        if (!updateData.password) {
          delete updateData.password;
        }
        await adminApi.updateUser(editingUser.id, updateData);
        alert('User updated successfully');
      } else {
        // Create user
        if (!userForm.password) {
          alert('Password is required for new users');
          return;
        }
        await adminApi.createUser(userForm);
        alert('User created successfully');
      }
      setShowUserModal(false);
      loadUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Failed to save user');
    }
  };

  const handleExport = () => {
    const csv = [
      ['ID', 'Username', 'Full Name', 'Email', 'Status', 'Created At', 'Posts', 'Followers'].join(','),
      ...filteredUsers.map(user => [
        user.id,
        user.username,
        user.full_name,
        user.email,
        user.status,
        new Date(user.created_at).toLocaleDateString(),
        user.posts_count,
        user.followers_count
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const toggleSelectUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id));
    }
  };

  // Filter users based on search (status filtering removed since column doesn't exist)
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  // Pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const getStatusBadge = (user) => {
    // Use onboarding_complete as status indicator since status column doesn't exist
    const isActive = user.onboarding_complete === true;
    const status = isActive ? 'active' : 'inactive';

    const styles = {
      active: 'bg-green-100 text-green-800 border-green-200',
      inactive: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    const icons = {
      active: <FaUserCheck className="mr-1" />,
      inactive: <FaUserSlash className="mr-1" />
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${styles[status] || styles.inactive}`}>
        {icons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <FaSortUp className="text-gray-300 ml-1" />;
    return sortDirection === 'asc' ?
      <FaSortUp className="text-purple-600 ml-1" /> :
      <FaSortDown className="text-purple-600 ml-1" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
          <p className="text-gray-600 mt-1">Manage and monitor all platform users</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCreate}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
          >
            <FaPlus />
            Add User
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Users</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{userStats.total}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <FaUserCheck className="text-blue-600 text-2xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Active Users</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {userStats.active}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <FaCheckCircle className="text-green-600 text-2xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Pending Onboarding</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">
                {userStats.inactive}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <FaUserSlash className="text-yellow-600 text-2xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Posts</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                {users.reduce((sum, u) => sum + (u.posts_count || 0), 0)}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <FaFileAlt className="text-purple-600 text-2xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 w-full lg:w-auto">
            <input
              type="text"
              placeholder="Search by name, username, or email..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>

          {/* Status filter removed - status column doesn't exist in profiles table */}

          {/* Actions */}
          <div className="flex gap-2">
            {selectedUsers.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <FaTrash /> Delete ({selectedUsers.length})
              </button>
            )}
            <button
              onClick={handleExport}
              className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <FaDownload /> Export
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                </th>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort('username')}
                    className="flex items-center font-semibold text-gray-700 hover:text-purple-600"
                  >
                    Username <SortIcon field="username" />
                  </button>
                </th>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort('full_name')}
                    className="flex items-center font-semibold text-gray-700 hover:text-purple-600"
                  >
                    Full Name <SortIcon field="full_name" />
                  </button>
                </th>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort('email')}
                    className="flex items-center font-semibold text-gray-700 hover:text-purple-600"
                  >
                    Email <SortIcon field="email" />
                  </button>
                </th>
                <th className="px-6 py-4 text-left font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort('created_at')}
                    className="flex items-center font-semibold text-gray-700 hover:text-purple-600"
                  >
                    Joined Date <SortIcon field="created_at" />
                  </button>
                </th>
                <th className="px-6 py-4 text-center font-semibold text-gray-700">Posts</th>
                <th className="px-6 py-4 text-center font-semibold text-gray-700">Followers</th>
                <th className="px-6 py-4 text-center font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleSelectUser(user.id)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                        {user.username?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-800">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{user.full_name}</td>
                  <td className="px-6 py-4 text-gray-600">{user.email}</td>
                  <td className="px-6 py-4">{getStatusBadge(user)}</td>
                  <td className="px-6 py-4 text-gray-600">
                    <div className="flex items-center gap-2">
                      <FaCalendar className="text-gray-400" />
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center font-semibold text-gray-700">
                    {user.posts_count}
                  </td>
                  <td className="px-6 py-4 text-center font-semibold text-gray-700">
                    {user.followers_count}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleViewDetails(user)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <FaEye />
                      </button>
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                        title="Edit User"
                      >
                        <FaEdit />
                      </button>
                      {user.onboarding_complete ? (
                        <button
                          onClick={() => handleStatusChange(user.id, 'inactive')}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Deactivate User"
                        >
                          <FaBan />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(user.id, 'active')}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Activate User"
                        >
                          <FaCheckCircle />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setUserToDelete(user);
                          setShowDeleteModal(true);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete User"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {indexOfFirstUser + 1} to {Math.min(indexOfLastUser, filteredUsers.length)} of {filteredUsers.length} users
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <FaChevronLeft /> Previous
            </button>
            <div className="flex gap-2">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-10 h-10 rounded-lg font-semibold ${currentPage === i + 1
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                    : 'border border-gray-300 hover:bg-gray-100'
                    }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Next <FaChevronRight />
            </button>
          </div>
        </div>
      </div>

      {/* Create/Edit User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingUser ? 'Edit User' : 'Create User'}
              </h2>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username *</label>
                <input
                  type="text"
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={userForm.onboarding_complete}
                  onChange={(e) => setUserForm({ ...userForm, onboarding_complete: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm font-medium text-gray-700">Onboarding Complete</label>
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setShowUserModal(false)}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUser}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <FaSave />
                {editingUser ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showDetailsModal && viewingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">User Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <p className="text-gray-900">{viewingUser.username || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-gray-900">{viewingUser.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <p className="text-gray-900">{viewingUser.full_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <p className="text-gray-900">{viewingUser.role || 'user'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Posts</label>
                  <p className="text-gray-900">{viewingUser.posts_count || 0}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Followers</label>
                  <p className="text-gray-900">{viewingUser.followers_count || 0}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Following</label>
                  <p className="text-gray-900">{viewingUser.following_count || 0}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
                  <p className="text-gray-900">{viewingUser.comments_count || 0}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Onboarding Complete</label>
                  <p className="text-gray-900">{viewingUser.onboarding_complete ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created At</label>
                  <p className="text-gray-900">
                    {viewingUser.created_at ? new Date(viewingUser.created_at).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  handleEdit(viewingUser);
                }}
                className="flex-1 px-6 py-3 bg-yellow-600 text-white rounded-xl font-semibold hover:bg-yellow-700 transition-colors flex items-center justify-center gap-2"
              >
                <FaEdit />
                Edit User
              </button>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaTrash className="text-red-600 text-2xl" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Delete User?</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <strong>{userToDelete?.username}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setUserToDelete(null);
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteUser(userToDelete.id)}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;