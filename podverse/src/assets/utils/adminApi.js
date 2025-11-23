import { getSupabaseAuthorizedtoken } from '../supabaseClient';

const API_BASE_URL = 'http://localhost:8000';

/**
 * Make an authenticated API request to admin endpoints
 */
const adminApiRequest = async (endpoint, options = {}) => {
    try {
        const token = await getSupabaseAuthorizedtoken();
        if (!token) {
            throw new Error('Authentication required');
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: response.statusText }));
            throw new Error(error.detail || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Admin API request error:', error);
        throw error;
    }
};

/**
 * Admin API methods
 */
export const adminApi = {
    // Users
    getUsers: async (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page);
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.search) queryParams.append('search', params.search);
        if (params.sort_field) queryParams.append('sort_field', params.sort_field);
        if (params.sort_direction) queryParams.append('sort_direction', params.sort_direction);

        return adminApiRequest(`/admin/users?${queryParams.toString()}`);
    },

    getUserById: async (userId) => {
        return adminApiRequest(`/admin/users/${userId}`);
    },

    getUserStats: async () => {
        return adminApiRequest('/admin/users/stats');
    },

    createUser: async (user) => {
        return adminApiRequest('/admin/users', {
            method: 'POST',
            body: JSON.stringify(user),
        });
    },

    updateUser: async (userId, user) => {
        return adminApiRequest(`/admin/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(user),
        });
    },

    updateUserStatus: async (userId, status) => {
        return adminApiRequest(`/admin/users/${userId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    },

    deleteUser: async (userId) => {
        return adminApiRequest(`/admin/users/${userId}`, {
            method: 'DELETE',
        });
    },

    // Posts
    getPosts: async (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page);
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.search) queryParams.append('search', params.search);

        return adminApiRequest(`/admin/posts?${queryParams.toString()}`);
    },

    updatePostStatus: async (postId, status) => {
        return adminApiRequest(`/admin/posts/${postId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    },

    deletePost: async (postId) => {
        return adminApiRequest(`/admin/posts/${postId}`, {
            method: 'DELETE',
        });
    },

    // Comments
    getComments: async (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page);
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.search) queryParams.append('search', params.search);

        return adminApiRequest(`/admin/comments?${queryParams.toString()}`);
    },

    updateCommentStatus: async (commentId, status) => {
        return adminApiRequest(`/admin/comments/${commentId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    },

    deleteComment: async (commentId) => {
        return adminApiRequest(`/admin/comments/${commentId}`, {
            method: 'DELETE',
        });
    },

    // Analytics
    getAnalytics: async (days = 30) => {
        return adminApiRequest(`/admin/analytics/overview?days=${days}`);
    },

    // Knowledge Base
    getFAQs: async (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page);
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.search) queryParams.append('search', params.search);

        return adminApiRequest(`/admin/faqs?${queryParams.toString()}`);
    },

    createFAQ: async (faq) => {
        return adminApiRequest('/admin/faqs', {
            method: 'POST',
            body: JSON.stringify(faq),
        });
    },

    updateFAQ: async (faqId, faq) => {
        return adminApiRequest(`/admin/faqs/${faqId}`, {
            method: 'PUT',
            body: JSON.stringify(faq),
        });
    },

    deleteFAQ: async (faqId) => {
        return adminApiRequest(`/admin/faqs/${faqId}`, {
            method: 'DELETE',
        });
    },

    // Posts CRUD
    createPost: async (post) => {
        return adminApiRequest('/admin/posts', {
            method: 'POST',
            body: JSON.stringify(post),
        });
    },

    updatePost: async (postId, post) => {
        return adminApiRequest(`/admin/posts/${postId}`, {
            method: 'PUT',
            body: JSON.stringify(post),
        });
    },

    // Comments CRUD
    createComment: async (comment) => {
        return adminApiRequest('/admin/comments', {
            method: 'POST',
            body: JSON.stringify(comment),
        });
    },

    updateComment: async (commentId, comment) => {
        return adminApiRequest(`/admin/comments/${commentId}`, {
            method: 'PUT',
            body: JSON.stringify(comment),
        });
    },

    // Avatar Templates
    getAvatarTemplates: async (speaker = null) => {
        const queryParams = new URLSearchParams();
        if (speaker) queryParams.append('speaker', speaker);
        const query = queryParams.toString();
        return adminApiRequest(`/admin/avatar-templates${query ? `?${query}` : ''}`);
    },

    uploadAvatarTemplate: async (file, speaker) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('speaker', speaker);

        const token = await getSupabaseAuthorizedtoken();
        if (!token) {
            throw new Error('Authentication required');
        }

        const response = await fetch(`${API_BASE_URL}/admin/avatar-templates`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: response.statusText }));
            throw new Error(error.detail || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
    },

    deleteAvatarTemplate: async (templateId) => {
        return adminApiRequest(`/admin/avatar-templates/${templateId}`, {
            method: 'DELETE',
        });
    },

    // Voices
    getVoices: async (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page);
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.search) queryParams.append('search', params.search);

        return adminApiRequest(`/admin/voices?${queryParams.toString()}`);
    },

    deleteVoice: async (voiceId) => {
        return adminApiRequest(`/admin/voices/${voiceId}`, {
            method: 'DELETE',
        });
    },
};

