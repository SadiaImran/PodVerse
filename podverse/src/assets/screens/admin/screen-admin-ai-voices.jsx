import { useState, useEffect } from 'react';
import {
    FaMicrophone, FaTrash, FaSearch, FaTimes, FaMusic
} from 'react-icons/fa';
import { adminApi } from '../../utils/adminApi';

const AdminAIVoices = () => {
    const [voices, setVoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const itemsPerPage = 12;

    useEffect(() => {
        loadVoices();
    }, [currentPage, searchTerm]);

    const loadVoices = async () => {
        try {
            setLoading(true);
            const response = await adminApi.getVoices({
                page: currentPage,
                limit: itemsPerPage,
                search: searchTerm || undefined,
            });
            if (response.success) {
                setVoices(response.voices || []);
            }
        } catch (error) {
            console.error('Error loading voices:', error);
            setVoices([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (voiceId) => {
        try {
            await adminApi.deleteVoice(voiceId);
            alert('Voice deleted successfully');
            setDeleteConfirm(null);
            loadVoices();
        } catch (error) {
            console.error('Error deleting voice:', error);
            alert('Failed to delete voice');
        }
    };

    return (
        <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 min-h-screen">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <FaMicrophone className="text-purple-400" />
                    Voices
                </h1>
                <p className="text-gray-400">Manage voices for AI Studio</p>
            </div>

            {/* Filters */}
            <div className="bg-slate-800 rounded-lg p-4 mb-6">
                <div className="relative">
                    <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search voices..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mx-auto"></div>
                    <p className="text-gray-400 mt-4">Loading voices...</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {voices.length === 0 ? (
                            <div className="col-span-full text-center py-12 text-gray-400">
                                <FaMusic className="text-6xl mx-auto mb-4 opacity-50" />
                                <p>No voices found</p>
                            </div>
                        ) : (
                            voices.map(voice => (
                                <div key={voice.id} className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-purple-500 transition-all">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-white font-semibold">{voice.name}</h3>
                                        <button
                                            onClick={() => setDeleteConfirm(voice)}
                                            className="p-2 text-red-400 hover:bg-slate-700 rounded-lg transition-all"
                                            title="Delete voice"
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                    {voice.url && (
                                        <audio controls className="w-full mb-3">
                                            <source src={voice.url} type="audio/mpeg" />
                                            Your browser does not support the audio element.
                                        </audio>
                                    )}
                                    <div className="text-xs text-gray-400">
                                        <p>File: {voice.filename}</p>
                                        {voice.created_at && (
                                            <p>Created: {new Date(voice.created_at).toLocaleDateString()}</p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-slate-700">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FaTrash className="text-red-400 text-2xl" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Delete Voice?</h3>
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

export default AdminAIVoices;

