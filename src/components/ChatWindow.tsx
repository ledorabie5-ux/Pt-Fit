import React, { useState, useEffect, useRef } from "react";
import { Message, UserDoc } from "../types";
import { subscribeToChatMessages, sendMessage, getUser, getChatId } from "../services/dbService";
import { Send, User, MessageSquare, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ChatWindowProps {
  currentUserId: string;
  recipientId: string;
  onClose?: () => void;
}

export default function ChatWindow({ currentUserId, recipientId, onClose }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [recipient, setRecipient] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatId = getChatId(currentUserId, recipientId);

  useEffect(() => {
    async function loadRecipient() {
      const u = await getUser(recipientId);
      setRecipient(u);
      setLoading(false);
    }
    loadRecipient();
  }, [recipientId]);

  useEffect(() => {
    const unsubscribe = subscribeToChatMessages(chatId, (msgs) => {
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const txt = inputText.trim();
    setInputText("");
    try {
      await sendMessage(chatId, currentUserId, txt);
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[500px] items-center justify-center bg-neutral-900/60 backdrop-blur-md rounded-2xl border border-neutral-800">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[520px] bg-neutral-950 rounded-2xl border border-neutral-800/80 overflow-hidden shadow-2xl transition-all">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-neutral-900 border-b border-neutral-800/60">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <div className="relative">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 shadow-inner">
              {recipient?.name ? (
                <span className="font-bold text-sm uppercase">{recipient.name[0]}</span>
              ) : (
                <User className="h-5 w-5" />
              )}
            </div>
            {/* Status dot */}
            <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-neutral-950" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white tracking-wide">{recipient?.name || "Chat Partner"}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-neutral-400 capitalize bg-neutral-800 px-1.5 py-0.2 rounded border border-neutral-700/50">
                {recipient?.role || "User"}
              </span>
              <span className="text-[9px] text-emerald-400 font-medium font-mono animate-pulse">● online</span>
            </div>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="flex items-center gap-1 text-neutral-400 hover:text-white text-[11px] font-bold bg-neutral-800/60 hover:bg-neutral-800 px-2.5 py-1.5 rounded-lg border border-neutral-700/30 transition-all cursor-pointer"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Close
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-neutral-950 to-neutral-950 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center h-full text-neutral-500 space-y-3"
            >
              <div className="p-3 bg-neutral-900/60 rounded-full border border-neutral-800">
                <MessageSquare className="h-8 w-8 text-neutral-600" />
              </div>
              <p className="text-xs font-mono text-neutral-400">No messages yet. Start the conversation!</p>
            </motion.div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUserId;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-md flex flex-col ${
                      isMe
                        ? "bg-emerald-600 text-neutral-950 rounded-tr-none font-medium"
                        : "bg-neutral-900/90 text-neutral-100 border border-neutral-800/80 rounded-tl-none"
                    }`}
                  >
                    <p className="text-xs leading-relaxed whitespace-pre-line break-words">{msg.text}</p>
                    <span 
                      className={`block text-[8px] mt-1.5 font-mono text-right font-medium opacity-65 ${
                        isMe ? "text-neutral-950" : "text-neutral-500"
                      }`}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-4 bg-neutral-900/80 border-t border-neutral-800/60 flex items-center space-x-2.5 rtl:space-x-reverse">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 bg-neutral-950 text-white text-xs rounded-xl border border-neutral-800 px-4 py-3 focus:outline-none focus:border-emerald-500 placeholder-neutral-500 transition-colors"
        />
        <button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-500 text-neutral-950 h-10 w-10 rounded-xl transition-all flex items-center justify-center font-bold shadow-lg shadow-emerald-600/10 hover:shadow-emerald-500/20 active:scale-95 cursor-pointer"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
