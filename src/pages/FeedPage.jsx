import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Search, Users, LogOut, Heart, MessageCircle, Share2, Plus, Mail, Bell, Home } from "lucide-react";
import { getCurrentUserProfile, isAuthenticated, postAPI, friendshipsAPI } from "../services/api";

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

  // Authentication guard - redirect if not logged in
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  // Fetch current user, posts feed, and friend suggestions
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        
        // Fetch current user profile
        const userProfile = await getCurrentUserProfile();
        setCurrentUser(userProfile);
        
        // Fetch posts feed
        const feedPosts = await postAPI.getAllPosts();
        setPosts(Array.isArray(feedPosts) ? feedPosts : []);

        // Fetch friend suggestions from backend
        const suggestions = await friendshipsAPI.getSuggestions(8, 0);
        const list = suggestions?.suggestions || [];
        setFriendSuggestions(list);
        
      } catch (err) {
        console.error("FeedPage fetchData error:", err);
        setError(err.message || "Failed to load data");
        // If authentication error, redirect to login
        if (err.message.includes("token") || err.message.includes("authentication")) {
          navigate("/login", { replace: true });
        }
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
      setCommentText("");
      setCommentPostId(null);
      const feedPosts = await postAPI.getAllPosts();
      setPosts(Array.isArray(feedPosts) ? feedPosts : []);
    } catch (e) {
      console.error("submitComment error:", e);
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
              placeholder="Search..."
              className="w-full rounded-full border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-4 py-2 pl-10 text-base"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-300" size={20} />
          </div>
        </div>

        {/* PROFILE + MENU */}
        <div className="relative flex items-center gap-4">
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
          <h2 className="text-3xl font-bold mb-6">Your Feed</h2>

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

          {/* Posts Feed */}
          {!loading && !error && posts.length === 0 && (
            <div className="text-center py-10">
              <p className="text-gray-500 dark:text-gray-400">No posts yet. Create your first post!</p>
            </div>
          )}

          {!loading && !error && posts.length > 0 && (
            <div className="space-y-6">
              {posts.map(post => (
                <div
                  key={post.id}
                  className="relative p-6 bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700"
                >
                  {/* HEADER */}
                  <div className="flex items-center gap-4 mb-3">
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

                  {/* CONTENT */}
                  <div className="mt-2">
                    <p className="text-gray-800 dark:text-gray-200">{post.content}</p>
                    {post.image_url && (
                      <img src={post.image_url} alt="post" className="mt-3 rounded-lg max-h-96 object-cover w-full" />
                    )}
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Posted {new Date(post.created_at).toLocaleString()}
                    </p>
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
                      onClick={() => navigate("/chat")}
                      className="flex items-center gap-1 hover:text-emerald-500 cursor-pointer transition"
                    >
                      <MessageCircle size={18} /> Message
                    </button>
                    <button className="flex items-center gap-1 hover:text-emerald-500 cursor-pointer transition">
                      <Share2 size={18} /> Share
                    </button>
                  </div>

                  {/* COMMENTS */}
                  <div className="mt-4">
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