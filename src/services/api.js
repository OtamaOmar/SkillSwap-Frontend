
import axios from "axios";

// Use VITE_API_BASE_URL if set, else fallback to production API URL
const BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://skillswap-app.duckdns.org/api";

// Use relative API paths if running in Docker (proxy), else use BASE_URL
const useRelative = !import.meta.env?.VITE_API_BASE_URL;
const API_URL = useRelative ? "/api" : BASE_URL;
const AUTH_URL = useRelative ? "/auth" : `${BASE_URL.replace(/\/api$/, '')}/auth`;

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add interceptor to include token in headers
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
axiosInstance.interceptors.response.use(
  (response) => {
    // Ensure response data is properly formatted
    if (!response.data) {
      return Promise.reject(new Error("Empty response from server"));
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) {
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          window.location.href = "/login";
          return Promise.reject(error);
        }

        const response = await axios.post(`${AUTH_URL}/refresh`, { refresh_token: refreshToken });

        const session = response.data?.session;
        if (session?.access_token) {
          localStorage.setItem("token", session.access_token);
        }
        if (session?.refresh_token) {
          localStorage.setItem("refreshToken", session.refresh_token);
        }

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${session.access_token}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    // Better error logging for debugging
    if (error.response?.data?.error) {
      return Promise.reject(new Error(error.response.data.error));
    }

    return Promise.reject(error);
  }
);

// Register user (JWT auth)
export const registerUser = async (username, email, password, full_name) => {
  try {
    const response = await axios.post(`${AUTH_URL}/signup`, { username, email, password, full_name });

    const data = response.data;

    // Store both access and refresh tokens
    if (data.session?.access_token) {
      localStorage.setItem("token", data.session.access_token);
    }
    if (data.session?.refresh_token) {
      localStorage.setItem("refreshToken", data.session.refresh_token);
    }

    return data;
  } catch (err) {
    const errorMessage = err.response?.data?.error || "Registration failed";
    throw new Error(errorMessage);
  }
};

// Login user (JWT auth)
export const loginUser = async (email, password) => {
  try {
    const response = await axios.post(`${AUTH_URL}/login`, { email, password });

    const data = response.data;

    // Store both access and refresh tokens
    if (data.session?.access_token) {
      localStorage.setItem("token", data.session.access_token);
    }
    if (data.session?.refresh_token) {
      localStorage.setItem("refreshToken", data.session.refresh_token);
    }

    return data;
  } catch (err) {
    const errorMessage = err.response?.data?.error || "Login failed";
    throw new Error(errorMessage);
  }
};

// Get all users
export const getAllUsers = async () => {
  try {
    const response = await axiosInstance.get(`${API_URL}/users`);
    return response.data;
  } catch (err) {
    const errorMessage = err.response?.data?.error || "Failed to fetch users";
    throw new Error(errorMessage);
  }
};

// Get all profiles
export const getAllProfiles = async () => {
  try {
    const response = await axiosInstance.get(`${API_URL}/users`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    console.error("getAllProfiles error:", err);
    const errorMessage = err.response?.data?.error || "Failed to fetch profiles";
    throw new Error(errorMessage);
  }
};

// Get current user profile
export const getCurrentUserProfile = async () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await axiosInstance.get(`${API_URL}/users/me`);
    return response.data;
  } catch (err) {
    console.error("getCurrentUserProfile error:", err);
    const errorMessage = err.response?.data?.error || err.message || "Failed to fetch profile";
    throw new Error(errorMessage);
  }
};

// Logout user
export const logoutUser = async () => {
  try {
    await axiosInstance.post(`${AUTH_URL}/logout`);
  } catch (err) {
    console.error("Logout error:", err);
  } finally {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
  }
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = localStorage.getItem("token");
  return !!token;
};

// USER API OBJECT
export const userAPI = {
  getMe: async () => {
    const response = await axiosInstance.get(`${API_URL}/users/me`);
    return response.data;
  },

  getUser: async (userId) => {
    const response = await axiosInstance.get(`${API_URL}/users/${userId}`);
    return response.data;
  },

  getAllUsers: async () => {
    const response = await axiosInstance.get(`${API_URL}/users`);
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await axiosInstance.put(`${API_URL}/users/me`, profileData);
    return response.data;
  },

  getUserPosts: async (userId) => {
    const response = await axiosInstance.get(`${API_URL}/posts/user/${userId}`);
    return response.data;
  },

  uploadProfilePicture: async (file) => {
    // For now, using a placeholder URL. In production, upload to cloud storage first.
    const avatar_url = typeof file === 'string' ? file : URL.createObjectURL(file);
    const response = await axiosInstance.post(`${API_URL}/users/upload/profile-picture`, { avatar_url });
    return response.data;
  },

  uploadCoverImage: async (file) => {
    // For now, using a placeholder URL. In production, upload to cloud storage first.
    const cover_image_url = typeof file === 'string' ? file : URL.createObjectURL(file);
    const response = await axiosInstance.post(`${API_URL}/users/upload/cover-image`, { cover_image_url });
    return response.data;
  },

  addSkill: async (skillName, skillType) => {
    const response = await axiosInstance.post(`${API_URL}/users/skills`, {
      skill_name: skillName,
      skill_type: skillType,
    });
    return response.data;
  },

  deleteSkill: async (skillId) => {
    const response = await axiosInstance.delete(`${API_URL}/users/skills/${skillId}`);
    return response.data;
  },
};

// POST API OBJECT
export const postAPI = {
  getAllPosts: async () => {
    const response = await axiosInstance.get(`${API_URL}/posts`);
    return response.data;
  },

  getUserPosts: async (userId) => {
    const response = await axiosInstance.get(`${API_URL}/posts/user/${userId}`);
    return response.data;
  },

  createPost: async (content, image_url = null) => {
    const response = await axiosInstance.post(`${API_URL}/posts`, {
      content,
      image_url,
    });
    return response.data;
  },

  getComments: async (postId) => {
    const response = await axiosInstance.get(`${API_URL}/posts/${postId}/comments`);
    return response.data;
  },

  addComment: async (postId, content) => {
    const response = await axiosInstance.post(`${API_URL}/posts/${postId}/comment`, {
      content,
    });
    return response.data;
  },

  likePost: async (postId) => {
    const response = await axiosInstance.post(`${API_URL}/posts/${postId}/like`);
    return response.data;
  },

  unlikePost: async (postId) => {
    const response = await axiosInstance.delete(`${API_URL}/posts/${postId}/like`);
    return response.data;
  },

  deletePost: async (postId) => {
    const response = await axiosInstance.delete(`${API_URL}/posts/${postId}`);
    return response.data;
  },

  deleteComment: async (commentId) => {
    const response = await axiosInstance.delete(`${API_URL}/comments/${commentId}`);
    return response.data;
  },

  sharePost: async (postId) => {
    const response = await axiosInstance.post(`${API_URL}/posts/${postId}/share`);
    return response.data;
  },

  incrementViewCount: async (postId) => {
    const response = await axiosInstance.post(`${API_URL}/posts/${postId}/view`);
    return response.data;
  },

  addCommentReply: async (parentCommentId, content) => {
    const response = await axiosInstance.post(
      `${API_URL}/comments/${parentCommentId}/replies`,
      { content }
    );
    return response.data;
  },

  searchPosts: async (query, limit = 20) => {
    const response = await axiosInstance.get(`${API_URL}/posts/search`, {
      params: { q: query, limit },
    });
    return response.data;
  },
};

// NOTIFICATIONS API OBJECT
export const notificationsAPI = {
  getNotifications: async (limit = 20, offset = 0) => {
    const response = await axiosInstance.get(`${API_URL}/notifications`, {
      params: { limit, offset },
    });
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await axiosInstance.get(`${API_URL}/notifications/unread-count`);
    return response.data;
  },

  markAsRead: async (notificationId) => {
    const response = await axiosInstance.put(
      `${API_URL}/notifications/${notificationId}/read`
    );
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await axiosInstance.put(`${API_URL}/notifications/mark-all-read`);
    return response.data;
  },

  deleteNotification: async (notificationId) => {
    const response = await axiosInstance.delete(`${API_URL}/notifications/${notificationId}`);
    return response.data;
  },
};

// MESSAGES API OBJECT
export const messagesAPI = {
  // Send a message to another user
  sendMessage: async (toUserId, content) => {
    const response = await axiosInstance.post(`${API_URL}/chat/messages`, {
      toUserId,
      content,
    });
    return response.data;
  },

  // Get chat history with a specific user
  getConversation: async (userId) => {
    const response = await axiosInstance.get(`${API_URL}/chat/with/${userId}`);
    return response.data;
  },

  // Get all conversations (list of people you've chatted with)
  getAllConversations: async () => {
    const response = await axiosInstance.get(`${API_URL}/chat/conversations`);
    return response.data;
  },

  // Mark messages from a user as read
  markConversationAsRead: async (userId) => {
    const response = await axiosInstance.patch(`${API_URL}/chat/with/${userId}/read`);
    return response.data;
  },

  // Get real-time stream
  subscribeToMessages: async () => {
    return new EventSource(`${API_URL}/chat/stream`, { withCredentials: true });
  },
};

// SEARCH API OBJECT
export const searchAPI = {
  searchPosts: async (query, limit = 20) => {
    const response = await axiosInstance.get(`${API_URL}/posts/search`, {
      params: { q: query, limit },
    });
    return response.data;
  },
};

// SKILLS API OBJECT
export const skillsAPI = {
  getMySkills: async () => {
    const response = await axiosInstance.get(`${API_URL}/skills/me`);
    return response.data;
  },

  getUserSkills: async (userId) => {
    const response = await axiosInstance.get(`${API_URL}/skills/user/${userId}`);
    return response.data;
  },

  addSkill: async (skillName, skillType) => {
    const response = await axiosInstance.post(`${API_URL}/skills`, {
      skill_name: skillName,
      skill_type: skillType,
    });
    return response.data;
  },

  updateSkill: async (skillId, skillName, skillType) => {
    const response = await axiosInstance.put(`${API_URL}/skills/${skillId}`, {
      skill_name: skillName,
      skill_type: skillType,
    });
    return response.data;
  },

  deleteSkill: async (skillId) => {
    const response = await axiosInstance.delete(`${API_URL}/skills/${skillId}`);
    return response.data;
  },
};

// FRIENDSHIPS API OBJECT
export const friendshipsAPI = {
  // Accepted connections list
  getMyFriendships: async () => {
    const response = await axiosInstance.get(`${API_URL}/friendships`);
    return response.data;
  },

  // Alias for getMyFriendships for compatibility
  getConnections: async () => {
    const response = await axiosInstance.get(`${API_URL}/friendships`);
    return response.data;
  },

  // Send friend request to other user id
  sendFriendRequest: async (toUserId) => {
    const response = await axiosInstance.post(`${API_URL}/friendships/request`, {
      toUserId,
    });
    return response.data;
  },

  // Pending requests directed to me
  getIncomingRequests: async () => {
    const response = await axiosInstance.get(`${API_URL}/friendships/requests/incoming`);
    return response.data;
  },

  // Requests I have sent
  getOutgoingRequests: async () => {
    const response = await axiosInstance.get(`${API_URL}/friendships/requests/outgoing`);
    return response.data;
  },

  // Accept a request from other user
  acceptFriendRequest: async (otherUserId) => {
    const response = await axiosInstance.patch(`${API_URL}/friendships/requests/${otherUserId}/accept`);
    return response.data;
  },

  // Reject a request from other user
  rejectFriendRequest: async (otherUserId) => {
    const response = await axiosInstance.patch(`${API_URL}/friendships/requests/${otherUserId}/reject`);
    return response.data;
  },

  // Remove friendship or cancel pending
  unfriend: async (otherUserId) => {
    const response = await axiosInstance.delete(`${API_URL}/friendships/${otherUserId}`);
    return response.data;
  },

  // Friend suggestions
  getSuggestions: async (limit = 20, offset = 0) => {
    const response = await axiosInstance.get(`${API_URL}/friendships/suggestions`, {
      params: { limit, offset },
    });
    return response.data;
  },

  // Get friendship status with another user
  getFriendshipStatus: async (otherUserId) => {
    const response = await axiosInstance.get(`${API_URL}/friendships/status/${otherUserId}`);
    return response.data;
  },
};

export default axiosInstance;
