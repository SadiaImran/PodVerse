import React, { useState, useEffect } from 'react';
import {
  FaSearch, FaTrash, FaEye, FaFlag, FaEyeSlash, FaVideo, FaHeart, FaComment,
  FaShare, FaChevronLeft, FaChevronRight, FaCheckCircle, FaExclamationTriangle,
  FaCalendar, FaReply, FaBan, FaUserCircle, FaPlus, FaEdit, FaTimes, FaSave
} from 'react-icons/fa';
import { adminApi } from '../../utils/adminApi';

// FILE: screens/admin/screen-admin-posts.jsx
// Consolidated: Posts + Comments + Moderation Queue

const AdminPosts = () => {
  const [activeTab, setActiveTab] = useState('posts'); // posts, comments, moderation
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [flaggedContent, setFlaggedContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  // Status filter removed - posts table doesn't have status column
  const [dateFilter, setDateFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [postForm, setPostForm] = useState({ user_id: '', video_url: '', thumbnail_url: '' });
  const [commentForm, setCommentForm] = useState({ content: '', post_id: '', user_id: '' });
  const [users, setUsers] = useState([]);
  const itemsPerPage = 10;

  useEffect(() => {
    loadData();
    if (showPostModal || showCommentModal) {
      loadUsers();
    }
  }, [activeTab, dateFilter, currentPage, showPostModal, showCommentModal]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'posts') await loadPosts();
      else if (activeTab === 'comments') await loadComments();
      else if (activeTab === 'moderation') await loadFlaggedContent();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      const response = await adminApi.getPosts({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
      });

      if (response.success) {
        setPosts(response.posts || []);
      } else {
        throw new Error('Failed to load posts');
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      setPosts([]);
    }
  };

  const loadComments = async () => {
    try {
      const response = await adminApi.getComments({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
      });

      if (response.success) {
        setComments(response.comments || []);
      } else {
        throw new Error('Failed to load comments');
      }
    } catch (error) {
      console.error('Error loading comments:', error);
      setComments([]);
    }
  };

  const loadFlaggedContent = async () => {
    try {
      // Moderation queue - since status column doesn't exist, show empty for now
      setFlaggedContent([]);
    } catch (error) {
      console.error('Error loading flagged content:', error);
      setFlaggedContent([]);
    }
  };

  // Status change removed - posts and comments tables don't have status columns

  const loadUsers = async () => {
    try {
      const response = await adminApi.getUsers({ limit: 100 });
      if (response.success) {
        setUsers(response.users || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleCreatePost = () => {
    setEditingPost(null);
    setPostForm({ user_id: '', video_url: '', thumbnail_url: '' });
    setShowPostModal(true);
  };

  const handleEditPost = (post) => {
    setEditingPost(post);
    setPostForm({
      user_id: post.user_id || '',
      video_url: post.video_url || '',
      thumbnail_url: post.thumbnail_url || ''
    });
    setShowPostModal(true);
  };

  const handleSavePost = async () => {
    try {
      if (editingPost) {
        await adminApi.updatePost(editingPost.id, postForm);
        alert('Post updated successfully');
      } else {
        await adminApi.createPost(postForm);
        alert('Post created successfully');
      }
      setShowPostModal(false);
      loadPosts();
    } catch (error) {
      console.error('Error saving post:', error);
      alert('Failed to save post');
    }
  };

  const handleCreateComment = () => {
    setEditingComment(null);
    setCommentForm({ content: '', post_id: '', user_id: '' });
    setShowCommentModal(true);
  };

  const handleEditComment = (comment) => {
    setEditingComment(comment);
    setCommentForm({
      content: comment.content || '',
      post_id: comment.post_id || '',
      user_id: comment.user_id || ''
    });
    setShowCommentModal(true);
  };

  const handleSaveComment = async () => {
    try {
      if (editingComment) {
        await adminApi.updateComment(editingComment.id, { content: commentForm.content });
        alert('Comment updated successfully');
      } else {
        await adminApi.createComment(commentForm);
        alert('Comment created successfully');
      }
      setShowCommentModal(false);
      loadComments();
    } catch (error) {
      console.error('Error saving comment:', error);
      alert('Failed to save comment');
    }
  };

  const handleDelete = async (itemId, type = 'post') => {
    try {
      if (type === 'post') {
        const response = await adminApi.deletePost(itemId);
        if (response.success) {
          setPosts(posts.filter(post => post.id !== itemId));
          setShowDeleteModal(false);
          setItemToDelete(null);
          alert('Post deleted successfully');
        }
      } else {
        const response = await adminApi.deleteComment(itemId);
        if (response.success) {
          setComments(comments.filter(comment => comment.id !== itemId));
          setShowDeleteModal(false);
          setItemToDelete(null);
          alert('Comment deleted successfully');
        }
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete');
    }
  };

  const getStatusBadge = (status) => {
    if (!status) return null; // Posts table doesn't have status column
    const styles = {
      published: 'bg-green-100 text-green-800 border-green-200',
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
      hidden: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      flagged: 'bg-red-100 text-red-800 border-red-200'
    };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${styles[status] || styles.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Filter data based on active tab
  const getFilteredData = () => {
    let data = activeTab === 'posts' ? posts : activeTab === 'comments' ? comments : flaggedContent;

    // Apply search filter (posts don't have content column)
    data = data.filter(item => {
      const matchesSearch =
        item.profiles?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.video_url?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });

    return data;
  };

  const filteredData = getFilteredData();
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentData = filteredData.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Content Management</h1>
          <p className="text-gray-600 mt-1">Posts, comments, and moderation in one place</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'posts' && (
            <button
              onClick={handleCreatePost}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
            >
              <FaPlus />
              Create Post
            </button>
          )}
          {activeTab === 'comments' && (
            <button
              onClick={handleCreateComment}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
            >
              <FaPlus />
              Create Comment
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => { setActiveTab('posts'); setCurrentPage(1); }}
            className={`flex-1 px-6 py-4 font-semibold transition-colors ${activeTab === 'posts'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-gray-800'
              }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FaVideo />
              <span>Posts</span>
              <span className="bg-purple-100 text-purple-600 px-2 py-1 rounded-full text-xs">{posts.length}</span>
            </div>
          </button>
          <button
            onClick={() => { setActiveTab('comments'); setCurrentPage(1); }}
            className={`flex-1 px-6 py-4 font-semibold transition-colors ${activeTab === 'comments'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-gray-800'
              }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FaComment />
              <span>Comments</span>
              <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs">{comments.length}</span>
            </div>
          </button>
          <button
            onClick={() => { setActiveTab('moderation'); setCurrentPage(1); }}
            className={`flex-1 px-6 py-4 font-semibold transition-colors ${activeTab === 'moderation'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-gray-800'
              }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FaFlag />
              <span>Moderation Queue</span>
              <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs">
                0
              </span>
            </div>
          </button>
        </div>

        {/* Stats Bar */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">
                {activeTab === 'posts' ? posts.length : activeTab === 'comments' ? comments.length : flaggedContent.length}
              </p>
              <p className="text-sm text-gray-600">Total {activeTab === 'posts' ? 'Posts' : activeTab === 'comments' ? 'Comments' : 'Flagged'}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {activeTab === 'posts' ? posts.length : comments.length}
              </p>
              <p className="text-sm text-gray-600">Total {activeTab === 'posts' ? 'Posts' : 'Comments'}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {activeTab === 'posts'
                  ? posts.reduce((sum, p) => sum + (p.likes_count || 0), 0)
                  : comments.length}
              </p>
              <p className="text-sm text-gray-600">{activeTab === 'posts' ? 'Total Likes' : 'Total Comments'}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {activeTab === 'posts'
                  ? posts.reduce((sum, p) => sum + p.views_count, 0).toLocaleString()
                  : comments.reduce((sum, c) => sum + c.likes_count, 0)}
              </p>
              <p className="text-sm text-gray-600">{activeTab === 'posts' ? 'Total Views' : 'Total Likes'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
          {/* Status filter removed - posts table doesn't have status column */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {/* Content Display */}
      {activeTab === 'posts' ? (
        // Posts Grid View
        <div className="grid grid-cols-1 gap-6">
          {currentData.map((post) => (
            <div key={post.id} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow">
              <div className="flex flex-col lg:flex-row">
                <div className="lg:w-80 h-48 lg:h-auto relative flex-shrink-0">
                  <img src={post.thumbnail_url} alt="Post" className="w-full h-full object-cover" />
                  {post.video_url && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                        <FaVideo className="text-purple-600 text-2xl ml-1" />
                      </div>
                    </div>
                  )}
                  {/* Flagged badge removed - posts table doesn't have flagged column */}
                </div>
                <div className="flex-1 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                        {post.profiles?.username?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{post.profiles?.full_name}</p>
                        <p className="text-sm text-gray-500">@{post.profiles?.username}</p>
                      </div>
                    </div>
                    {getStatusBadge(post.status || 'published')}
                  </div>
                  {post.video_url && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 mb-2">Video:</p>
                      <a href={post.video_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {post.video_url}
                      </a>
                    </div>
                  )}
                  {post.thumbnail_url && (
                    <div className="mb-4">
                      <img src={post.thumbnail_url} alt="Post thumbnail" className="max-w-xs rounded-lg" />
                    </div>
                  )}
                  {!post.video_url && !post.thumbnail_url && (
                    <p className="text-gray-500 mb-4 italic">No content available</p>
                  )}
                  {/* Flag reason removed - posts table doesn't have flagged column */}
                  <div className="flex items-center gap-6 mb-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <FaEye className="text-gray-400" />
                      <span>{post.views_count.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FaHeart className="text-pink-500" />
                      <span>{post.likes_count}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FaComment className="text-blue-500" />
                      <span>{post.comments_count}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <FaCalendar className="text-gray-400" />
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                      <FaEye /> View
                    </button>
                    <button
                      onClick={() => handleEditPost(post)}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2"
                    >
                      <FaEdit /> Edit
                    </button>
                    {/* Status actions removed - posts table doesn't have status column */}
                    <button
                      onClick={() => { setItemToDelete({ ...post, type: 'post' }); setShowDeleteModal(true); }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                      <FaTrash /> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Comments Table View
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-gray-700">User</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-700">Comment</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-700">Post</th>
                <th className="px-6 py-4 text-center font-semibold text-gray-700">Actions</th>
                <th className="px-6 py-4 text-center font-semibold text-gray-700">Date</th>
                <th className="px-6 py-4 text-center font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentData.map((comment) => (
                <tr key={comment.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                        {comment.profiles?.username?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{comment.profiles?.full_name}</p>
                        <p className="text-xs text-gray-500">@{comment.profiles?.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-700">{comment.content}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600 line-clamp-2">{comment.post?.content}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {/* Status removed - comments table doesn't have status column */}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      {/* Status actions removed - comments table doesn't have status column */}
                      <button
                        onClick={() => handleEditComment(comment)}
                        className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => { setItemToDelete({ ...comment, type: 'comment' }); setShowDeleteModal(true); }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
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
      )}

      {/* Pagination */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing {indexOfFirst + 1} to {Math.min(indexOfLast, filteredData.length)} of {filteredData.length}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaChevronLeft />
          </button>
          {[...Array(Math.min(5, totalPages))].map((_, i) => (
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
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaChevronRight />
          </button>
        </div>
      </div>

      {/* Post Create/Edit Modal */}
      {showPostModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingPost ? 'Edit Post' : 'Create Post'}
              </h2>
              <button
                onClick={() => setShowPostModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">User</label>
                <select
                  value={postForm.user_id}
                  onChange={(e) => setPostForm({ ...postForm, user_id: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select a user</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.username || user.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Video URL (optional)</label>
                <input
                  type="text"
                  value={postForm.video_url || ''}
                  onChange={(e) => setPostForm({ ...postForm, video_url: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Thumbnail URL (optional)</label>
                <input
                  type="text"
                  value={postForm.thumbnail_url || ''}
                  onChange={(e) => setPostForm({ ...postForm, thumbnail_url: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setShowPostModal(false)}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePost}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <FaSave />
                {editingPost ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Create/Edit Modal */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingComment ? 'Edit Comment' : 'Create Comment'}
              </h2>
              <button
                onClick={() => setShowCommentModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">User</label>
                <select
                  value={commentForm.user_id}
                  onChange={(e) => setCommentForm({ ...commentForm, user_id: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select a user</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.username || user.email}</option>
                  ))}
                </select>
              </div>
              {!editingComment && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Post ID</label>
                  <input
                    type="text"
                    value={commentForm.post_id}
                    onChange={(e) => setCommentForm({ ...commentForm, post_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter post ID..."
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                <textarea
                  value={commentForm.content}
                  onChange={(e) => setCommentForm({ ...commentForm, content: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter comment content..."
                />
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setShowCommentModal(false)}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveComment}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <FaSave />
                {editingComment ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaTrash className="text-red-600 text-2xl" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Delete {itemToDelete?.type}?</h3>
              <p className="text-gray-600 mb-6">This action cannot be undone.</p>
              <div className="flex gap-4">
                <button
                  onClick={() => { setShowDeleteModal(false); setItemToDelete(null); }}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(itemToDelete.id, itemToDelete.type)}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700"
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

export default AdminPosts;