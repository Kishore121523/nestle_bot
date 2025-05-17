'use client';

import { useState, KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { Settings2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatWindowProps {
  open: boolean;
  onClose: () => void;
  onEndChat: () => void;
  onSendMessage: (content: string) => void;
  messages: Message[];
  isTyping: boolean;
  name?: string;
  icon?: React.ReactNode;
  onOpenSettings: () => void;
}

export default function ChatWindow({
  open,
  onClose,
  onEndChat,
  onSendMessage,
  messages,
  isTyping,
  name = "Nestlé Assistant",
  icon = "💬",
  onOpenSettings,
}: ChatWindowProps) {
  const [input, setInput] = useState("");

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        onSendMessage(input.trim());
        setInput("");
      }
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-24 right-6 z-50 w-[350px] sm:w-[400px] bg-card text-card-foreground border border-border rounded-xl shadow-lg p-4 flex flex-col"
      >

        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold text-base flex items-center gap-2">
            <span>{icon}</span> {name}
            <button
              onClick={onOpenSettings}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Open settings"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={onEndChat}
              className="text-xs hover:underline text-destructive cursor-pointer"
            >
              End Chat
            </button>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground text-sm cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={4}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        
        <ScrollArea className="h-92 rounded border border-muted bg-muted p-2 mb-3 space-y-2">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`max-w-[85%] px-3 py-2 rounded-md text-sm mb-3 ${
                msg.role === "user"
                  ? "ml-auto bg-accent text-accent-foreground"
                  : "bg-background text-foreground"
              }`}
            >
              {msg.content}
            </div>
          ))}
          {isTyping && (
            <div className="w-fit bg-background text-muted-foreground text-xs px-3 py-2 rounded-md animate-pulse">
              <span className="animate-pulse">● ● ●</span>
            </div>
          )}
        </ScrollArea>

        
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask something..."
          className="resize-none bg-input text-foreground placeholder-muted-foreground"
          rows={2}
        />
      </motion.div>
    </AnimatePresence>
  );
}
