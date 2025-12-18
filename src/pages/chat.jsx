import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Menu, Search, Users, LogOut, Send, Bell, Mail, ArrowLeft } from "lucide-react";
import { messagesAPI, getCurrentUserProfile, friendshipsAPI } from "../services/api";

export default function ChatPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode] = useState(localStorage.getItem("theme") === "dark");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messageInput, setMessageInput] = useState("");
  
  // Real data from API
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [friendsMap, setFriendsMap] = useState({});

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  // Load conversations on mount and check for URL parameter
  useEffect(() => {
    loadConversations();
    loadCurrentUser();
    loadFriendsList();

    // Check if there's a "with" parameter in URL
    const withUserId = searchParams.get("with");
    if (withUserId) {
      setSelectedChat(withUserId);
      loadChatMessages(withUserId);
    }
  }, [searchParams]);

  const loadCurrentUser = async () => {
    try {
      const user = await getCurrentUserProfile();
      setCurrentUser(user);
    } catch (err) {
      console.error("Failed to load current user:", err);
    }
  };

  const loadFriendsList = async () => {
    try {
      const response = await friendshipsAPI.getConnections();
      const connections = response.connections || [];
      const friendsMapTemp = {};
      connections.forEach(conn => {
        friendsMapTemp[conn.user.id] = {
          id: conn.user.id,
          username: conn.user.username,
          full_name: conn.user.full_name,
          avatar_url: conn.user.avatar_url,
        };
      });
      setFriendsMap(friendsMapTemp);
    } catch (err) {
      console.error("Failed to load friends list:", err);
    }
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await messagesAPI.getAllConversations();
      // The backend returns { count, conversations } where conversations use 'other_id'
      const conversations = response.conversations ? response.conversations.map(conv => ({
        user_id: conv.other_id,
        username: conv.username,
        full_name: conv.full_name,
        avatar_url: conv.avatar_url,
        last_message: conv.last_message,
        last_message_time: conv.last_message_time,
        unread_count: conv.unread_count,
      })) : [];
      setChats(Array.isArray(conversations) ? conversations : []);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadChatMessages = async (userId) => {
    try {
      setLoading(true);
      const response = await messagesAPI.getConversation(userId);
      // Backend returns { limit, offset, count, messages }
      const msgs = response.messages ? response.messages.map(msg => ({
        id: msg.id,
        sender_id: msg.sender_id,
        receiver_id: msg.receiver_id,
        content: msg.content,
        created_at: msg.created_at,
        read_at: msg.read_at,
      })) : [];
      setMessages(Array.isArray(msgs) ? msgs.reverse() : []);
      // Mark all as read
      await messagesAPI.markConversationAsRead(userId);
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChat = (chat) => {
    setSelectedChat(chat.user_id);
    loadChatMessages(chat.user_id);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedChat) return;

    try {
      await messagesAPI.sendMessage(selectedChat, messageInput);
      setMessageInput("");
      // Reload chat messages
      await loadChatMessages(selectedChat);
      // Reload conversations
      await loadConversations();
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const getChatDisplayList = () => {
    const chatsList = [...chats];
    // If selectedChat is not in the list but is in friendsMap, add it temporarily
    if (selectedChat && !chats.find(c => c.user_id === selectedChat) && friendsMap[selectedChat]) {
      const friend = friendsMap[selectedChat];
      chatsList.unshift({
        user_id: friend.id,
        username: friend.username,
        full_name: friend.full_name,
        avatar_url: friend.avatar_url,
        last_message: "New conversation",
        last_message_time: "now",
        unread_count: 0,
      });
    }
    return chatsList;
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
              placeholder="Search messages..."
              className="w-full rounded-full border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-4 py-2 pl-10 text-base"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-300" size={20} />
          </div>
        </div>

        {/* PROFILE + MENU */}
        <div className="relative flex items-center gap-4">
          <img
            src="https://i.pravatar.cc/40"
            alt="Profile"
            className="w-10 h-10 rounded-full cursor-pointer border border-gray-300 dark:border-gray-700"
            onClick={() => setSettingsOpen(!settingsOpen)}
          />

          {/* Dropdown */}
          <div
            className={`
              absolute right-0 top-14 w-48 p-2 rounded-lg shadow-xl
              bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
              transform transition-all duration-200 origin-top-right
              ${settingsOpen
                ? "opacity-100 scale-100 translate-y-0"
                : "opacity-0 scale-95 -translate-y-2 pointer-events-none"}
            `}
          >
            <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer">
              Profile Settings
            </button>
            <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer">
              Account
            </button>
            <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer">
              Help Center
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex flex-1 mt-16">
        {/* SIDEBAR */}
        <aside
          className={`
            fixed top-16 left-0 h-[calc(100vh-4rem)]
            bg-gray-800 dark:bg-gray-950 border-r border-gray-700 dark:border-gray-900
            flex flex-col justify-between z-20 transition-all duration-300
            ${sidebarOpen ? "w-64 p-4" : "w-16 p-2"}
          `}
        >
          <div className="flex flex-col gap-1">
            <SidebarButton icon={<Menu />} text="Toggle" sidebarOpen={sidebarOpen} onClick={() => setSidebarOpen(!sidebarOpen)} hidden={true} />
            <SidebarButton icon={<ArrowLeft />} text="Back to Feed" sidebarOpen={sidebarOpen} onClick={() => navigate("/feed")} />
            <SidebarButton icon={<Users />} text="Friends" sidebarOpen={sidebarOpen} />
            <SidebarButton icon={<Mail />} text="Chats" sidebarOpen={sidebarOpen} onClick={() => navigate("/chat")} />
            <SidebarButton icon={<Bell />} text="Status" sidebarOpen={sidebarOpen} />
          </div>

          <div className="flex flex-col gap-1">
            <SidebarButton
              icon={<LogOut />}
              text="Logout"
              sidebarOpen={sidebarOpen}
              onClick={() => navigate("/login")}
            />
          </div>
        </aside>

        {/* CHAT LIST */}
        <aside
          className={`fixed top-16 h-[calc(100vh-4rem)] w-96 bg-gray-900 dark:bg-gray-900 border-r border-gray-700 dark:border-gray-800 overflow-y-auto transition-all duration-300 z-10
            ${sidebarOpen ? "left-64" : "left-16"}`}
        >
          <div className="p-3">
            <h2 className="text-xl font-bold mb-3 text-white px-2">Chats</h2>
            <div className="space-y-0">
              {loading ? (
                <div className="p-4 text-center text-gray-400">Loading conversations...</div>
              ) : getChatDisplayList().length === 0 ? (
                <div className="p-4 text-center text-gray-400">No conversations yet</div>
              ) : (
                getChatDisplayList().map((chat) => (
                  <div
                    key={chat.user_id}
                    onClick={() => handleSelectChat(chat)}
                    className={`p-3 cursor-pointer transition-colors border-b border-gray-800 dark:border-gray-800 ${
                      selectedChat === chat.user_id
                        ? "bg-gray-800 dark:bg-gray-800"
                        : "hover:bg-gray-800 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={chat.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.full_name || chat.username)}&background=10b981&color=fff`}
                        alt={chat.username}
                        className="w-12 h-12 rounded-full"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-sm text-white">{chat.full_name || chat.username}</h3>
                          <span className="text-xs text-gray-400">{chat.last_message_time || "now"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-400 truncate flex-1">{chat.last_message || "No messages yet"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* CHAT WINDOW */}
        <main
          className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? "ml-160" : "ml-112"} mr-0`}
        >
          {selectedChat !== null ? (
            <>
              {/* Chat Header */}
              {(() => {
                const selectedChatData = chats.find(c => c.user_id === selectedChat) || friendsMap[selectedChat];
                return selectedChatData ? (
                  <div className="h-16 bg-emerald-700 dark:bg-gray-800 border-b border-gray-700 dark:border-gray-700 px-6 flex items-center gap-4">
                    <img
                      src={selectedChatData.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedChatData.full_name || selectedChatData.username)}&background=10b981&color=fff`}
                      alt={selectedChatData.username}
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <h3 className="font-semibold text-white">{selectedChatData.full_name || selectedChatData.username}</h3>
                      <span className="text-xs text-gray-400">Active now</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-16 bg-emerald-700 dark:bg-gray-800 border-b border-gray-700 dark:border-gray-700 px-6 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-600"></div>
                    <div>
                      <h3 className="font-semibold text-white">Loading...</h3>
                      <span className="text-xs text-gray-400">Active now</span>
                    </div>
                  </div>
                );
              })()}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-gray-900 dark:bg-gray-950">
                {loading ? (
                  <div className="flex items-center justify-center h-full text-gray-400">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400">No messages yet. Start the conversation!</div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_id === currentUser?.id ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-md px-4 py-2 rounded-lg ${
                          message.sender_id === currentUser?.id
                            ? "bg-emerald-600 text-white rounded-br-none"
                            : "bg-gray-800 text-white rounded-bl-none"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <span className={`text-xs block text-right mt-1 ${message.sender_id === currentUser?.id ? "text-emerald-100" : "text-gray-400"}`}>
                          {new Date(message.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          {message.read_at && <span> ✓✓</span>}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Message Input */}
              <div className="h-16 bg-gray-800 dark:bg-gray-800 border-t border-gray-700 dark:border-gray-700 px-6 flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1 rounded-lg border-0 bg-gray-700 dark:bg-gray-900 text-white placeholder-gray-400 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={handleSendMessage}
                  className="p-2 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer"
                >
                  <Send size={20} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-900 dark:bg-gray-950">
              <div className="text-center">
                <Mail size={64} className="mx-auto mb-4 text-gray-600 dark:text-gray-700" />
                <h2 className="text-2xl font-bold mb-2 text-white">Select a conversation</h2>
                <p className="text-gray-400">Choose a chat from the list to start messaging</p>
              </div>
            </div>
          )}
        </main>
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
        hover:bg-gray-700 dark:hover:bg-gray-800 cursor-pointer text-gray-300
        ${sidebarOpen ? "gap-4 px-4" : "justify-center"}
      `}
    >
      {icon}
      {sidebarOpen && <span className="font-medium">{text}</span>}
    </button>
  );
}
