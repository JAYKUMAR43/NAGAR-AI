"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Bot, User, HelpCircle, GripHorizontal } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I am Nagar AI, your smart civic assistant. How can I help you today? Ask me about reported issues or municipal guidelines." }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const dragRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Scroll to bottom
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    try {
      // Map history to server payload format
      // Serves user content as 'user' and assistant content as 'assistant'
      const history = [...messages, userMessage].map(m => ({
        role: m.role,
        parts: m.content
      }));

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history })
      });

      const resData = await response.json();
      if (resData.success) {
        setMessages(prev => [...prev, resData.message]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I had trouble answering that. Error: " + resData.error }]);
      }
    } catch (error) {
      console.error("Chat widget error:", error);
      setMessages(prev => [...prev, { role: "assistant", content: "Network error. Please verify your connection." }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  return (
    <div ref={dragRef} className="fixed bottom-6 right-6 z-50 pointer-events-none flex flex-col items-end">
      
      {/* Expanded Chat Dialog */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            drag
            dragListener={false} // Only drag using drag handle
            dragConstraints={dragRef}
            dragMomentum={false}
            className="w-[330px] sm:w-[360px] h-[480px] bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto mb-4 backdrop-blur-xl relative"
          >
            {/* Header / Drag Handle */}
            <div className="bg-gray-950 border-b border-gray-800 p-4 flex items-center justify-between cursor-grab active:cursor-grabbing select-none">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center text-white">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs">Nagar AI Companion</h3>
                  <span className="text-[9px] text-cyan-400 flex items-center gap-1 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    ONLINE
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Visual drag grip indicator */}
                <div className="text-gray-600 hover:text-gray-400 p-1">
                  <GripHorizontal className="w-4 h-4" />
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors hover:bg-gray-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 scrollbar-thin">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2.5 max-w-[85%] ${
                    m.role === "user" ? "self-end flex-row-reverse" : "self-start"
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white ${
                    m.role === "user" ? "bg-cyan-600" : "bg-gray-800 border border-gray-700"
                  }`}>
                    {m.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>

                  {/* Bubble */}
                  <div className={`rounded-xl p-3 text-xs leading-relaxed ${
                    m.role === "user" 
                      ? "bg-cyan-500 text-gray-950 rounded-tr-none font-medium" 
                      : "bg-gray-950 border border-gray-800 text-gray-200 rounded-tl-none font-sans"
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}

              {/* Typing Loader */}
              {isLoading && (
                <div className="flex gap-2.5 self-start items-center">
                  <div className="w-6 h-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-white">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="bg-gray-950 border border-gray-800 rounded-xl rounded-tl-none p-3 flex gap-1 items-center justify-center w-12 h-8">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-600 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-gray-800 bg-gray-950 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about water leaks, waste codes..."
                className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs focus:border-cyan-500 focus:outline-none placeholder-gray-500 text-white transition-colors"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-800 text-gray-950 disabled:text-gray-500 p-2 rounded-xl transition-all shadow-md active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Bubble */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-500 via-teal-500 to-indigo-600 border border-cyan-400/20 text-white flex items-center justify-center shadow-xl shadow-cyan-500/20 pointer-events-auto hover:cursor-pointer relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/5 opacity-0 hover:opacity-100 transition-opacity" />
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6 animate-pulse" />}
      </motion.button>
    </div>
  );
}
