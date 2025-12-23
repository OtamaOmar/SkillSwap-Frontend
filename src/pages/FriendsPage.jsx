import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Home, ArrowLeft, Mail, Search, LogOut } from "lucide-react";
import { friendshipsAPI, getCurrentUserProfile, isAuthenticated, notificationsAPI } from "../services/api";

export default function FriendsPage() {
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const resolveImageUrl = (url) => {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    const base = import.meta.env?.VITE_API_BASE_URL || "/api";
    return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");

      let profile = null;
      try {
        if (isAuthenticated()) {
          profile = await getCurrentUserProfile();
          setCurrentUser(profile);
        }
      } catch (err) {
        console.error("FriendsPage profile error:", err);
        setCurrentUser(null);
      }

      try {
        const res = await friendshipsAPI.getMyFriendships();
        const meId = profile?.id;
        const connections = Array.isArray(res?.connections)
          ? res.connections
              .filter((c) => c?.status === "accepted")
              .map((c) => {
                const other = meId && c.user?.id === meId ? c.friend : c.user;
                return other?.id
                  ? {
                      id: other.id,
                      username: other.username,
                      full_name: other.full_name,
                      avatar_url: other.avatar_url,
                      bio: other.bio,
                      skills: other.skills || [],
                    }
                  : null;
              })
              .filter(Boolean)
          : [];
        setFriends(connections);
      } catch (err) {
        console.error("FriendsPage fetch error:", err);
        setError(err.message || "Failed to load friends");
        setFriends([]);
      }

      try {
        const unread = await notificationsAPI.getUnreadCount();
        setUnreadCount(unread?.unread_count || 0);
      } catch {
        setUnreadCount(0);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const filteredFriends = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return friends;
    return friends.filter((f) =>
      (f.full_name || "").toLowerCase().includes(term) || (f.username || "").toLowerCase().includes(term)
    );
  }, [friends, search]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-black dark:text-white">
      <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 flex justify-between items-center z-20">
        <div className="flex items-center gap-3">
          <button
            className="rounded-md hover:bg-emerald-500/10 dark:hover:bg-emerald-500/20 cursor-pointer p-2"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft />
          </button>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">SkillSwap</p>
            <h1 className="text-xl font-bold text-emerald-600 flex items-center gap-2">
              <Users size={18} />
              Friends
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="relative rounded-md hover:bg-emerald-500/10 dark:hover:bg-emerald-500/20 cursor-pointer p-2"
            onClick={() => navigate("/feed")}
            aria-label="Go to feed"
          >
            <Home />
          </button>
          <button
            className="relative rounded-md hover:bg-emerald-500/10 dark:hover:bg-emerald-500/20 cursor-pointer p-2"
            onClick={() => navigate("/chat")}
            aria-label="Messages"
          >
            <Mail />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500 text-white">
                {unreadCount}
              </span>
            )}
          </button>
          {currentUser?.avatar_url ? (
            <img
              src={resolveImageUrl(currentUser.avatar_url)}
              alt="Profile"
              className="w-10 h-10 rounded-full cursor-pointer border border-gray-300 dark:border-gray-700 object-cover"
              onClick={() => navigate("/profile")}
            />
          ) : (
            <div
              onClick={() => navigate("/profile")}
              className="w-10 h-10 rounded-full cursor-pointer border border-gray-300 dark:border-gray-700 bg-gray-300 dark:bg-gray-700 flex items-center justify-center"
            >
              <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                {(currentUser?.full_name || currentUser?.username || "U").charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <button
            className="rounded-md hover:bg-emerald-500/10 dark:hover:bg-emerald-500/20 cursor-pointer p-2"
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("refreshToken");
              navigate("/login");
            }}
            aria-label="Logout"
          >
            <LogOut />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-20 pb-10">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Accepted connections</p>
              <h2 className="text-3xl font-bold">Your Friends</h2>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search friends"
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
              />
            </div>
          </div>

          {loading && (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow">
              Loading friends...
            </div>
          )}

          {!loading && error && (
            <div className="p-6 text-center text-red-600 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-700 rounded-xl shadow">
              {error}
            </div>
          )}

          {!loading && !error && filteredFriends.length === 0 && (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow">
              No accepted friends yet.
            </div>
          )}

          {!loading && !error && filteredFriends.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow flex gap-3"
                >
                  {friend.avatar_url ? (
                    <img
                      src={resolveImageUrl(friend.avatar_url)}
                      alt={friend.full_name || friend.username}
                      className="w-14 h-14 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center border border-gray-200 dark:border-gray-700 text-lg font-semibold text-gray-700 dark:text-gray-200">
                      {(friend.full_name || friend.username || "F").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate">
                        <p className="font-semibold truncate">{friend.full_name || friend.username}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">@{friend.username}</p>
                      </div>
                      <button
                        className="px-3 py-1 text-xs rounded-full bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer"
                        onClick={() => navigate(`/chat?with=${encodeURIComponent(friend.id)}`)}
                      >
                        Message
                      </button>
                    </div>
                    {friend.bio && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">{friend.bio}</p>
                    )}
                    {friend.skills && friend.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {friend.skills.slice(0, 3).map((s, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200 border border-emerald-100 dark:border-emerald-800"
                          >
                            {s.skill_name || s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
