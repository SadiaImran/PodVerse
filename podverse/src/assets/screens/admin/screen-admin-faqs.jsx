import { useState, useEffect } from 'react';
import {
  FaBook, FaQuestion, FaPlus, FaEdit, FaTrash, FaSearch, FaTimes, FaSave
} from 'react-icons/fa';
import { adminApi } from '../../utils/adminApi';

// ==================== FAQs SCREEN ====================
const FAQs = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ question: '', answer: '' });

  useEffect(() => {
    loadFAQs();
  }, [searchTerm]);

  const loadFAQs = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getFAQs({
        search: searchTerm || undefined,
        limit: 100,
      });
      if (response.success) {
        setFaqs(response.faqs || []);
      }
    } catch (error) {
      console.error('Error loading FAQs:', error);
      setFaqs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingFAQ(null);
    setFormData({ question: '', answer: '' });
    setShowModal(true);
  };

  const handleEdit = (faq) => {
    setEditingFAQ(faq);
    setFormData({ question: faq.question, answer: faq.answer });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (editingFAQ) {
        await adminApi.updateFAQ(editingFAQ.id, formData);
        alert('FAQ updated successfully');
      } else {
        await adminApi.createFAQ(formData);
        alert('FAQ created successfully');
      }
      setShowModal(false);
      loadFAQs();
    } catch (error) {
      console.error('Error saving FAQ:', error);
      alert('Failed to save FAQ');
    }
  };

  const handleDelete = async (faqId) => {
    try {
      await adminApi.deleteFAQ(faqId);
      alert('FAQ deleted successfully');
      setDeleteConfirm(null);
      loadFAQs();
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      alert('Failed to delete FAQ');
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <FaBook className="text-purple-400" />
          FAQs
        </h1>
        <p className="text-gray-400">Manage FAQs</p>
      </div>

      {/* Filters & Search */}
      <div className="bg-slate-800 rounded-lg p-4 mb-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search FAQs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
        <button
          onClick={handleCreate}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
        >
          <FaPlus />
          Add FAQ
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading FAQs...</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {faqs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FaQuestion className="text-6xl mx-auto mb-4 opacity-50" />
              <p>No FAQs found</p>
            </div>
          ) : (
            faqs.map(faq => (
              <div key={faq.id} className="bg-slate-800 rounded-lg p-6 hover:bg-slate-750 transition-all border border-slate-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">{faq.question}</h3>
                    <p className="text-gray-400 mb-3">{faq.answer}</p>
                    {faq.created_at && (
                      <p className="text-xs text-gray-500">
                        Created: {new Date(faq.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(faq)}
                      className="p-2 text-yellow-400 hover:bg-slate-700 rounded-lg transition-all"
                      title="Edit FAQ"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(faq)}
                      className="p-2 text-red-400 hover:bg-slate-700 rounded-lg transition-all"
                      title="Delete FAQ"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl border border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {editingFAQ ? 'Edit FAQ' : 'Create FAQ'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <FaTimes />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Question</label>
                <input
                  type="text"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter question..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Answer</label>
                <textarea
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter answer..."
                />
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-6 py-3 border border-slate-600 text-gray-300 rounded-xl font-semibold hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <FaSave />
                {editingFAQ ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-slate-700">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaTrash className="text-red-400 text-2xl" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Delete FAQ?</h3>
              <p className="text-gray-400 mb-6">
                Are you sure you want to delete this FAQ? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-6 py-3 border border-slate-600 text-gray-300 rounded-xl font-semibold hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm.id)}
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
export default FAQs;