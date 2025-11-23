import { useState, useEffect } from 'react';
import {
    FaRobot, FaTrash, FaSearch, FaTimes, FaImage, FaPlus, FaUpload
} from 'react-icons/fa';
import { adminApi } from '../../utils/adminApi';

const AdminAIAvatars = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [speakerFilter, setSpeakerFilter] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadSpeaker, setUploadSpeaker] = useState('A');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        loadTemplates();
    }, [speakerFilter]);

    const loadTemplates = async () => {
        try {
            setLoading(true);
            const response = await adminApi.getAvatarTemplates(speakerFilter || null);
            if (response.success) {
                setTemplates(response.templates || []);
            }
        } catch (error) {
            console.error('Error loading avatar templates:', error);
            setTemplates([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (templateId) => {
        try {
            await adminApi.deleteAvatarTemplate(templateId);
            alert('Avatar template deleted successfully');
            setDeleteConfirm(null);
            loadTemplates();
        } catch (error) {
            console.error('Error deleting template:', error);
            alert('Failed to delete template');
        }
    };

    const handleUpload = async () => {
        if (!uploadFile) {
            alert('Please select a file');
            return;
        }

        try {
            setUploading(true);
            await adminApi.uploadAvatarTemplate(uploadFile, uploadSpeaker);
            alert('Avatar template uploaded successfully');
            setShowUploadModal(false);
            setUploadFile(null);
            loadTemplates();
        } catch (error) {
            console.error('Error uploading template:', error);
            alert('Failed to upload template');
        } finally {
            setUploading(false);
        }
    };

    const filteredTemplates = templates.filter(template => {
        if (searchTerm) {
            return template.name.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return true;
    });

    return (
        <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 min-h-screen">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <FaRobot className="text-purple-400" />
                    Avatar Templates
                </h1>
                <p className="text-gray-400">Manage avatar templates for AI Studio</p>
            </div>

            {/* Filters */}
            <div className="bg-slate-800 rounded-lg p-4 mb-6 flex flex-wrap gap-4">
                <div className="flex-1 min-w-[300px]">
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search templates..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                </div>
                <select
                    value={speakerFilter}
                    onChange={(e) => setSpeakerFilter(e.target.value)}
                    className="px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                    <option value="">All Speakers</option>
                    <option value="A">Speaker A</option>
                    <option value="B">Speaker B</option>
                </select>
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
                >
                    <FaPlus />
                    Upload Template
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mx-auto"></div>
                    <p className="text-gray-400 mt-4">Loading templates...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTemplates.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-gray-400">
                            <FaImage className="text-6xl mx-auto mb-4 opacity-50" />
                            <p>No avatar templates found</p>
                        </div>
                    ) : (
                        filteredTemplates.map(template => (
                            <div key={template.id} className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700 hover:border-purple-500 transition-all">
                                <div className="aspect-square bg-slate-700 relative">
                                    <img
                                        src={template.url}
                                        alt={template.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23475569" width="100" height="100"/%3E%3Ctext fill="%2394a3b8" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                                        }}
                                    />
                                    <div className="absolute top-2 right-2">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${template.speaker === 'A' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                                            }`}>
                                            Speaker {template.speaker}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="text-white font-semibold mb-2">{template.name}</h3>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-400">{template.filename}</span>
                                        <button
                                            onClick={() => setDeleteConfirm(template)}
                                            className="p-2 text-red-400 hover:bg-slate-700 rounded-lg transition-all"
                                            title="Delete template"
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

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-slate-700">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white">Upload Avatar Template</h2>
                            <button
                                onClick={() => {
                                    setShowUploadModal(false);
                                    setUploadFile(null);
                                }}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <FaTimes />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Speaker</label>
                                <select
                                    value={uploadSpeaker}
                                    onChange={(e) => setUploadSpeaker(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="A">Speaker A</option>
                                    <option value="B">Speaker B</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Image File</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setUploadFile(e.target.files[0])}
                                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                        </div>
                        <div className="flex gap-4 mt-6">
                            <button
                                onClick={() => {
                                    setShowUploadModal(false);
                                    setUploadFile(null);
                                }}
                                className="flex-1 px-6 py-3 border border-slate-600 text-gray-300 rounded-xl font-semibold hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={uploading || !uploadFile}
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <FaUpload />
                                {uploading ? 'Uploading...' : 'Upload'}
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
                            <h3 className="text-2xl font-bold text-white mb-2">Delete Template?</h3>
                            <p className="text-gray-400 mb-6">
                                Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.
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

export default AdminAIAvatars;

