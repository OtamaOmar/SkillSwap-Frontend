import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Search, Users, LogOut, Heart, MessageCircle, Share2, Plus, Mail, Bell, Home, X, Eye } from "lucide-react";
import { getCurrentUserProfile, isAuthenticated, postAPI, friendshipsAPI, notificationsAPI, searchAPI, getAllUsers } from "../services/api";

export default function FeedPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode] = useState(localStorage.getItem("theme") === "dark");
  const [posts, setPosts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [friendSuggestions, setFriendSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [likeLoadingId, setLikeLoadingId] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [commentPostId, setCommentPostId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostImageUrl, setNewPostImageUrl] = useState("");

  // Authentication guard - redirect if not logged in
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  // Fetch current user, posts feed, and friend suggestions
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        // Fetch current user profile first (auth gate)
        const userProfile = await getCurrentUserProfile();
        setCurrentUser(userProfile);

        // Fetch posts feed (critical)
        const feedPosts = await postAPI.getAllPosts();
        setPosts(Array.isArray(feedPosts) ? feedPosts : []);
      } catch (err) {
        console.error("FeedPage critical fetch error:", err);
        setError(err.message || "Failed to load feed");
        if (err.message?.toLowerCase().includes("token") || err.message?.toLowerCase().includes("authentication")) {
          navigate("/login", { replace: true });
        }
        setLoading(false);
        return;
      }

      // Non-critical: friend suggestions and notifications
      try {
        console.log("Fetching all users for friend suggestions...");
        const allUsers = await getAllUsers();
        console.log("All users received:", allUsers);
        // Filter out current user and show other real users
        const usersArray = Array.isArray(allUsers) ? allUsers : [];
        let otherUsers = usersArray.filter(user => user.id !== userProfile.id).slice(0, 8);
        // Fallback: if filtering removed everyone (e.g., single-user DB), show first few users
        if (otherUsers.length === 0 && usersArray.length > 0) {
          otherUsers = usersArray.slice(0, 8);
        }
        console.log("Filtered other users:", otherUsers);
        setFriendSuggestions(otherUsers);
      } catch (e) {
        console.error("Friend suggestions failed (non-blocking)", e?.message || e, e);
        setFriendSuggestions([]);
      }

      try {
        const notifs = await notificationsAPI.getNotifications();
        setNotifications(Array.isArray(notifs) ? notifs : []);
        const unread = await notificationsAPI.getUnreadCount();
        setUnreadCount(unread?.unread_count || 0);
      } catch (e) {
        console.warn("Notifications fetch failed (non-blocking)", e?.message || e);
        setNotifications([]);
        setUnreadCount(0);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated()) {
      fetchData();
    }
  }, [navigate]);

  // DARK MODE
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const toggleLike = async (postId, liked) => {
    try {
      setLikeLoadingId(postId);
      if (liked) {
        await postAPI.unlikePost(postId);
      } else {
        await postAPI.likePost(postId);
      }
      // Refresh posts minimally
      const feedPosts = await postAPI.getAllPosts();
      setPosts(Array.isArray(feedPosts) ? feedPosts : []);
    } catch (e) {
      console.error("toggleLike error:", e);
    } finally {
      setLikeLoadingId(null);
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!commentPostId || !commentText.trim()) return;
    try {
      await postAPI.addComment(commentPostId, commentText.trim());
      const postIdToExpand = commentPostId;
      setCommentText("");
      setCommentPostId(null);
      const feedPosts = await postAPI.getAllPosts();
      setPosts(Array.isArray(feedPosts) ? feedPosts : []);
      // Keep the post expanded to show the new comment
      setExpandedPostId(postIdToExpand);
    } catch (e) {
      console.error("submitComment error:", e);
    }
  };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    
    try {
      setIsSearching(true);
      const results = await searchAPI.searchPosts(query);
      setSearchResults(Array.isArray(results) ? results : []);
    } catch (err) {
      console.error("Search error:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleShare = async (postId) => {
    try {
      await postAPI.sharePost(postId);
      const feedPosts = await postAPI.getAllPosts();
      setPosts(Array.isArray(feedPosts) ? feedPosts : []);
    } catch (e) {
      console.error("Share error:", e);
    }
  };

  const submitNewPost = async (e) => {
    e.preventDefault();
    const content = newPostContent.trim();
    if (!content) return;
    try {
      await postAPI.createPost(content, newPostImageUrl.trim() || null);
      setNewPostContent("");
      setNewPostImageUrl("");
      const feedPosts = await postAPI.getAllPosts();
      setPosts(Array.isArray(feedPosts) ? feedPosts : []);
    } catch (err) {
      console.error("Create post error:", err);
      setError(err.message || "Failed to create post");
    }
  };

  const handleReply = async (commentId) => {
    if (!replyText.trim()) return;
    try {
      await postAPI.addCommentReply(commentId, replyText.trim());
      setReplyText("");
      setReplyingTo(null);
      const feedPosts = await postAPI.getAllPosts();
      setPosts(Array.isArray(feedPosts) ? feedPosts : []);
    } catch (e) {
      console.error("Reply error:", e);
    }
  };

  const markNotificationAsRead = async (notifId) => {
    try {
      await notificationsAPI.markAsRead(notifId);
      const notifs = await notificationsAPI.getNotifications();
      setNotifications(Array.isArray(notifs) ? notifs : []);
      const unread = await notificationsAPI.getUnreadCount();
      setUnreadCount(unread?.unread_count || 0);
    } catch (e) {
      console.error("Mark as read error:", e);
    }
  };

  const deleteNotification = async (notifId) => {
    try {
      await notificationsAPI.deleteNotification(notifId);
      const notifs = await notificationsAPI.getNotifications();
      setNotifications(Array.isArray(notifs) ? notifs : []);
    } catch (e) {
      console.error("Delete notification error:", e);
    }
  };

  const sendRequest = async (toUserId) => {
    try {
      await friendshipsAPI.sendFriendRequest(toUserId);
      const suggestions = await friendshipsAPI.getSuggestions(8, 0);
      setFriendSuggestions(suggestions?.suggestions || []);
    } catch (e) {
      console.error("sendRequest error:", e);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 text-black dark:text-white">

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 flex justify-between items-center z-20">

        {/* LEFT */}
        <div className="flex items-center gap-4">
          <button
            className="rounded-md hover:bg-emerald-500/10 dark:hover:bg-emerald-500/20 cursor-pointer p-2"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu />
          </button>
          <h1 className="text-2xl font-bold text-emerald-600">SkillSwap</h1>
        </div>

        {/* SEARCH */}
        <div className="flex items-center justify-center flex-1 px-4">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full rounded-full border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-4 py-2 pl-10 text-base"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-300" size={20} />
          </div>
        </div>

        {/* PROFILE + NOTIFICATIONS */}
        <div className="relative flex items-center gap-4">
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold">Notifications</h3>
                </div>
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">No notifications</div>
                ) : (
                  notifications.map(notif => (
                    <div key={notif.id} className={`p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ${!notif.read_at ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <p className="text-sm text-gray-800 dark:text-gray-200">{notif.content}</p>
                          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{new Date(notif.created_at).toLocaleString()}</span>
                        </div>
                        <button 
                          onClick={() => deleteNotification(notif.id)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      {!notif.read_at && (
                        <button 
                          onClick={() => markNotificationAsRead(notif.id)}
                          className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          
          <img
            src={currentUser?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.full_name || currentUser?.username || 'User')}&background=10b981&color=fff`}
            alt="Profile"
            className="w-10 h-10 rounded-full cursor-pointer border border-gray-300 dark:border-gray-700 object-cover"
            onClick={() => navigate("/profile")}
          />
        </div>
      </header>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex flex-1 mt-16">
        {/* SIDEBAR */}
        <aside
          className={`
            fixed top-16 left-0 h-[calc(100vh-4rem)]
            bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
            flex flex-col justify-between z-10 transition-all duration-300
            ${sidebarOpen ? "w-64 p-4" : "w-16 p-2"}
          `}
        >
          <div className="flex flex-col gap-2">
            <SidebarButton icon={<Menu />} text="Toggle" sidebarOpen={sidebarOpen} onClick={() => setSidebarOpen(!sidebarOpen)} hidden={true} />
            <SidebarButton icon={<Home />} text="Feed" sidebarOpen={sidebarOpen} onClick={() => navigate("/feed")} />
            <SidebarButton icon={<Users />} text="Friends" sidebarOpen={sidebarOpen} />
            <SidebarButton icon={<Mail/>} text="Messages" sidebarOpen={sidebarOpen}onClick={() => navigate("/chat")} />
            <SidebarButton icon={<Bell />} text="Notifications" sidebarOpen={sidebarOpen} />
          </div>
             
          <div>
            <SidebarButton 
              icon={<LogOut />} 
              text="Logout" 
              sidebarOpen={sidebarOpen}
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                navigate("/login");
              }}
            />
          </div>
        </aside>

        {/* MAIN FEED */}
        <main
          className={`flex-1 p-6 transition-all duration-300 overflow-y-auto
            ${sidebarOpen ? "ml-64" : "ml-16"} mr-80`}
        >
          <h2 className="text-3xl font-bold mb-6">
            {searchQuery ? `Search Results for "${searchQuery}"` : "Your Feed"}
          </h2>

          {/* Create New Post */}
          {!searchQuery && (
            <form onSubmit={submitNewPost} className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700">
              <div className="mb-3">
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="What's on your mind?"
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 min-h-24"
                />
              </div>
              <div className="mb-3">
                <input
                  type="url"
                  value={newPostImageUrl}
                  onChange={(e) => setNewPostImageUrl(e.target.value)}
                  placeholder="Optional image URL"
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2"
                />
              </div>
              <div className="flex justify-end">
                <button className="px-4 py-2 rounded-md bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer">Post</button>
              </div>
            </form>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-10">
              <p className="text-gray-500 dark:text-gray-400">Loading feed...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-6">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Posts Feed or Search Results */}
          {!loading && !error && (searchQuery ? searchResults : posts).length === 0 && (
            <div className="text-center py-10">
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery ? "No posts found." : "No posts yet. Create your first post!"}
              </p>
            </div>
          )}

          {!loading && !error && (searchQuery ? searchResults : posts).length > 0 && (
            <div className="space-y-6">
              {(searchQuery ? searchResults : posts).map(post => (
                <div
                  key={post.id}
                  className="relative p-6 bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700"
                >
                  {/* HEADER */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <img
                        src={post.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.full_name || post.username)}&background=10b981&color=fff`}
                        className="w-12 h-12 rounded-full border border-gray-300 dark:border-gray-700 object-cover"
                        alt={post.full_name || post.username}
                      />
                      <div>
                        <h3 className="font-semibold">{post.full_name || post.username}</h3>
                        <span className="text-sm text-gray-500 dark:text-gray-400">@{post.username}</span>
                      </div>
                    </div>
                    {currentUser?.id === post.user_id && (
                      <button 
                        onClick={async () => {
                          if (confirm("Delete this post?")) {
                            try {
                              await postAPI.deletePost(post.id);
                              const feedPosts = await postAPI.getAllPosts();
                              setPosts(Array.isArray(feedPosts) ? feedPosts : []);
                            } catch (e) {
                              console.error("Delete error:", e);
                            }
                          }
                        }}
                        className="text-gray-400 hover:text-red-500 transition"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* CONTENT */}
                  <div className="mt-2">
                    <p className="text-gray-800 dark:text-gray-200">{post.content}</p>
                    {post.image_url && (
                      <img src={post.image_url} alt="post" className="mt-3 rounded-lg max-h-96 object-cover w-full" />
                    )}
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Posted {new Date(post.created_at).toLocaleString()}</span>
                      <div className="flex items-center gap-2">
                        <Eye size={16} />
                        <span>{post.view_count || 0} views</span>
                      </div>
                    </div>
                  </div>

                  {/* REACTIONS */}
                  <div className="flex items-center gap-6 mt-4 text-gray-500 dark:text-gray-400">
                    <button
                      disabled={likeLoadingId === post.id}
                      onClick={() => toggleLike(post.id, Boolean(post.user_liked))}
                      className="flex items-center gap-1 hover:text-emerald-500 cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Heart size={18} className={post.user_liked ? "text-emerald-500" : ""} />
                      {post.user_liked ? "Unlike" : "Like"} ({post.likes_count || 0})
                    </button>
                    <button 
                      onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)}
                      className="flex items-center gap-1 hover:text-emerald-500 cursor-pointer transition"
                    >
                      <MessageCircle size={18} /> Comment ({post.comments_count || 0})
                    </button>
                    <button 
                      onClick={() => handleShare(post.id)}
                      className="flex items-center gap-1 hover:text-emerald-500 cursor-pointer transition"
                    >
                      <Share2 size={18} /> Share ({post.shares_count || 0})
                    </button>
                  </div>

                  {/* COMMENTS */}
                  <div className="mt-4 space-y-3">
                    {expandedPostId === post.id && post.comments && post.comments.length > 0 && (
                      <div className="space-y-2 mb-3 pl-4 border-l-2 border-gray-300 dark:border-gray-700">
                        {post.comments.map(comment => (
                          <div key={comment.id} className="text-sm">
                            <div className="flex gap-2">
                              <img 
                                src={comment.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.username)}&background=10b981&color=fff`}
                                alt={comment.username}
                                className="w-6 h-6 rounded-full"
                              />
                              <div className="flex-1">
                                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{comment.username}</p>
                                <p className="text-gray-700 dark:text-gray-300">{comment.content}</p>
                                <button 
                                  onClick={() => setReplyingTo(comment.id)}
                                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline mt-1"
                                >
                                  Reply
                                </button>
                                
                                {replyingTo === comment.id && (
                                  <div className="mt-2 flex gap-2">
                                    <input 
                                      type="text"
                                      placeholder="Reply..."
                                      value={replyText}
                                      onChange={(e) => setReplyText(e.target.value)}
                                      className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1 text-sm"
                                    />
                                    <button 
                                      onClick={() => handleReply(comment.id)}
                                      className="px-2 py-1 rounded-md bg-emerald-500 text-white text-sm hover:bg-emerald-600 cursor-pointer"
                                    >
                                      Send
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setReplyingTo(null);
                                        setReplyText("");
                                      }}
                                      className="px-2 py-1 rounded-md bg-gray-300 dark:bg-gray-700 text-sm hover:bg-gray-400 cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <form onSubmit={submitComment} className="flex items-center gap-2">
                      <input
                        className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2"
                        placeholder="Write a comment..."
                        value={commentPostId === post.id ? commentText : ""}
                        onChange={(e) => { setCommentPostId(post.id); setCommentText(e.target.value); }}
                      />
                      <button className="px-3 py-2 rounded-md bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer">Comment</button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className="fixed top-16 right-0 h-[calc(100vh-4rem)] w-80 bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-900 p-4 flex flex-col">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Friend Suggestions</h3>
          
          <div className="space-y-3 overflow-y-auto">
            {loading ? (
              <p className="text-center text-gray-500 dark:text-gray-400">Loading...</p>
            ) : friendSuggestions.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400">No suggestions yet</p>
            ) : (
              friendSuggestions.map((profile) => (
                <div key={profile.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                  <div className="flex items-center gap-3 flex-1">
                    <img
                      src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || profile.username)}&background=10b981&color=fff`}
                      className="w-10 h-10 rounded-full border border-emerald-500 object-cover"
                      alt={profile.full_name || profile.username}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {profile.full_name || profile.username}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        @{profile.username}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => sendRequest(profile.id)} className="p-1.5 rounded-full hover:bg-emerald-500/20 text-emerald-500 transition cursor-pointer shrink-0">
                    <Plus size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      {/* FOOTER */}
      <footer
        id="contact"
        className="py-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800"
      >
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            © {new Date().getFullYear()} SkillSwap. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

/* SIDEBAR BUTTON */
function SidebarButton({ icon, text, sidebarOpen, onClick, hidden }) {
  if (hidden) return null;
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center py-3 w-full rounded-md transition-colors duration-300 
        hover:bg-emerald-500/10 dark:hover:bg-emerald-500/20 cursor-pointer
        ${sidebarOpen ? "gap-4 px-4" : "justify-center"}
      `}
    >
      {icon}
      {sidebarOpen && <span className="font-medium">{text}</span>}
    </button>
  );
}