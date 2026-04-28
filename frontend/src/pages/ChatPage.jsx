import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";

const API_BASE = "http://127.0.0.1:8000";

function ChatPage() {
  const [admins, setAdmins] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeMode, setActiveMode] = useState("ai"); // "ai" or "admin"
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const aiEndRef = useRef(null);
  const token = localStorage.getItem("smartaid_token");
  const role = localStorage.getItem("smartaid_role");

  useEffect(() => {
    if (!token) return;
    axios
      .get(`${API_BASE}/api/chat/admin-list`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setAdmins(res.data || []);
        if (res.data.length > 0) setSelectedAdmin(res.data[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  // Load AI chat history
  useEffect(() => {
    if (!token) return;
    axios
      .get(`${API_BASE}/api/chat/ai/history`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setAiMessages(res.data || []);
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!selectedAdmin || !token || activeMode !== "admin") return;
    const fetchMessages = () => {
      axios
        .get(`${API_BASE}/api/chat/messages/${selectedAdmin.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => setMessages(res.data || []))
        .catch(() => {});
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [selectedAdmin, token, activeMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedAdmin) return;

    try {
      await axios.post(
        `${API_BASE}/api/chat/send`,
        { receiver_id: selectedAdmin.id, message: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewMessage("");
      const res = await axios.get(
        `${API_BASE}/api/chat/messages/${selectedAdmin.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(res.data || []);
    } catch (err) {
      console.error("Send failed:", err);
    }
  };

  const sendAiMessage = async (e) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    const userMsg = aiInput.trim();
    setAiMessages((prev) => [...prev, { id: Date.now(), message: `[USER] ${userMsg}`, is_ai: false }]);
    setAiInput("");
    setAiLoading(true);

    try {
      const res = await axios.post(
        `${API_BASE}/api/chat/ai`,
        { message: userMsg },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAiMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, message: `[SRA AI] ${res.data.ai_response}`, is_ai: true },
      ]);
    } catch (err) {
      setAiMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, message: "[SRA AI] Sorry, I couldn't process your request. Please try again.", is_ai: true },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-3xl py-16 text-center">
        <div className="animate-pulse text-[#800020]">Loading chat...</div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl py-4 sm:py-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-2xl border border-[#e9dce1] bg-white shadow-[0_18px_48px_rgba(0,0,0,0.08)] overflow-hidden"
      >
        {/* Header */}
        <div className="border-b border-[#f2e8eb] bg-gradient-to-r from-[#800020] to-[#9B0026] p-4">
          <h1 className="text-lg font-semibold text-white">💬 Chat SRA</h1>
          <p className="text-xs text-white/80">Chat with SRA AI or contact an admin directly</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex border-b border-[#f2e8eb]">
          <button
            onClick={() => setActiveMode("ai")}
            className={`flex-1 py-2.5 text-sm font-semibold transition ${
              activeMode === "ai" ? "bg-[#fff7ed] text-[#92400e] border-b-2 border-[#f59e0b]" : "text-[#6b7280] hover:bg-[#fafafa]"
            }`}
          >
            🤖 SRA AI
          </button>
          <button
            onClick={() => setActiveMode("admin")}
            className={`flex-1 py-2.5 text-sm font-semibold transition ${
              activeMode === "admin" ? "bg-[#fff0f3] text-[#800020] border-b-2 border-[#800020]" : "text-[#6b7280] hover:bg-[#fafafa]"
            }`}
          >
            👤 Admin Chat
          </button>
        </div>

        {/* AI Chat Mode */}
        {activeMode === "ai" && (
          <div className="flex flex-col" style={{ minHeight: "400px" }}>
            <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ maxHeight: "340px" }}>
              {aiMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <div className="text-4xl mb-3">🤖</div>
                  <p className="text-sm font-semibold text-[#1a1a1a]">SRA AI Assistant</p>
                  <p className="text-xs text-[#6b7280] mt-1">
                    Ask me anything about SmartAid, volunteering, or your application status.
                  </p>
                </div>
              )}
              {aiMessages.map((msg) => {
                const isAi = msg.is_ai || msg.message.startsWith("[SRA AI]");
                const displayText = msg.message.replace(/^\[(USER|SRA AI)\]\s*/, "");
                return (
                  <div key={msg.id} className={`flex ${isAi ? "justify-start" : "justify-end"}`}>
                    <div
                      className={[
                        "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                        isAi
                          ? "bg-[#fff7ed] text-[#78350f] rounded-bl-sm border border-[#fef3c7]"
                          : "bg-[#800020] text-white rounded-br-sm",
                      ].join(" ")}
                    >
                      {isAi && <p className="text-[10px] font-semibold text-[#f59e0b] mb-1">🤖 SRA AI</p>}
                      <p className="whitespace-pre-wrap">{displayText}</p>
                    </div>
                  </div>
                );
              })}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-[#fff7ed] border border-[#fef3c7] px-4 py-2 text-sm text-[#78350f] animate-pulse">
                    🤖 SRA AI is thinking...
                  </div>
                </div>
              )}
              <div ref={aiEndRef} />
            </div>

            <form onSubmit={sendAiMessage} className="border-t border-[#f2e8eb] p-3 flex gap-2">
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Ask SRA AI anything..."
                disabled={aiLoading}
                className="flex-1 min-h-10 rounded-xl border border-[#dfcdd3] bg-white px-3 text-sm text-[#1a1a1a] outline-none transition focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/20 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!aiInput.trim() || aiLoading}
                className="min-h-10 rounded-xl bg-[#f59e0b] px-4 text-sm font-semibold text-white transition hover:bg-[#d97706] disabled:opacity-50"
              >
                Ask
              </button>
            </form>
          </div>
        )}

        {/* Admin Chat Mode */}
        {activeMode === "admin" && (
          <div className="flex" style={{ minHeight: "400px" }}>
            {/* Admin List */}
            <div className="w-48 shrink-0 border-r border-[#f2e8eb] bg-[#fdf9fa] p-2">
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-[#800020]">Admins</p>
              {admins.map((admin) => (
                <button
                  key={admin.id}
                  onClick={() => setSelectedAdmin(admin)}
                  className={[
                    "mb-1 w-full rounded-lg px-3 py-2 text-left text-sm transition",
                    selectedAdmin?.id === admin.id
                      ? "bg-[#800020] text-white"
                      : "text-[#4a4a4a] hover:bg-[#fff0f3]",
                  ].join(" ")}
                >
                  <p className="font-medium truncate">{admin.name}</p>
                  <p className="text-xs opacity-75 truncate">{admin.email}</p>
                </button>
              ))}
              {admins.length === 0 && (
                <p className="px-2 text-xs text-[#6b7280]">No admins available</p>
              )}
            </div>

            {/* Messages */}
            <div className="flex flex-1 flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ maxHeight: "340px" }}>
                {messages.length === 0 && (
                  <div className="flex h-full items-center justify-center text-sm text-[#6b7280]">
                    No messages yet. Start the conversation!
                  </div>
                )}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.is_mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={[
                        "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                        msg.is_mine
                          ? "bg-[#800020] text-white rounded-br-sm"
                          : "bg-[#f3ebee] text-[#1a1a1a] rounded-bl-sm",
                      ].join(" ")}
                    >
                      <p>{msg.message}</p>
                      <p className={`mt-1 text-xs ${msg.is_mine ? "text-white/60" : "text-[#6b7280]"}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={sendMessage} className="border-t border-[#f2e8eb] p-3 flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 min-h-10 rounded-xl border border-[#dfcdd3] bg-white px-3 text-sm text-[#1a1a1a] outline-none transition focus:border-[#7a1731] focus:ring-2 focus:ring-[#7a1731]/20"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="min-h-10 rounded-xl bg-[#800020] px-4 text-sm font-semibold text-white transition hover:bg-[#9B0026] disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        )}
      </motion.div>
    </section>
  );
}

export default ChatPage;
