'use client';

import { useState, KeyboardEvent } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, SendHorizonal, Settings2 } from "lucide-react";
import { Input } from "./ui/input";
import CustomBtn from "./CustomBtn";
import ConfirmDialog from "./ConfirmDialog";
import { ExpandableSources } from "./ExpandableSources";
import { typeOutText } from "@/lib/utils";
import ReactMarkdown from "react-markdown";


interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

interface ChatWindowProps {
  open: boolean;
  onClose: () => void;
  onSendMessage?: (content: string) => Promise<void>;
  onEndChat: () => void;
  messages: Message[];
  isTyping: boolean;
  name: string;
  icon: string;
  onOpenSettings: () => void;
}

export default function ChatWindow({
  open,
  onClose,
  onEndChat,
  name = "Nestlé Assistant",
  icon = "💬",
  onOpenSettings,
}: ChatWindowProps) {

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const sendMessage = async (content: string) => {
    setMessages((prev) => [...prev, { role: "user", content }]);
    setIsTyping(true);
  
    const placeholderAnswer = `Here are some gift ideas from Nestlé:
  
  1. **KITKAT Advent Calendar**  
     A festive countdown filled with KITKAT treats — perfect for kids and adults alike. [Buy in Store](https://example.com)
  
  2. **TURTLES Holiday Gift Box**  
     Classic chocolate clusters with a seasonal touch. A perfect gift for those who love caramel and pecans. [See all products](https://example.com)
  
  3. **QUALITY STREET Holiday Tin**  
     A colorful mix of chocolate varieties in a reusable tin. Ideal for sharing with guests or family. [Shop now](https://example.com)
  
  These options offer a delicious way to spread joy this holiday season.`;
  
    // Simulate typing animation
    let tempContent = "";
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
  
    typeOutText(
      placeholderAnswer,
      (chunk) => {
        tempContent = chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          return [...prev.slice(0, -1), { ...last, content: chunk }];
        });
      },
      () => {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          return [...prev.slice(0, -1), { ...last, content: tempContent }];
        });
        setIsTyping(false);
      }
    );
  };
  

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        sendMessage(input.trim());
        setInput("");
      }
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="chat-window"
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-24 right-6 z-50 w-[350px] sm:w-[400px] bg-card text-card-foreground border border-border rounded-xl shadow-lg p-4 flex flex-col"
        >
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold text-base flex items-center gap-2">
              <span>{icon}</span> {name}
              <button
                onClick={onOpenSettings}
                className="ml-2 text-muted-foreground hover:text-foreground"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setConfirmEnd(true)}
                className="text-xs hover:underline text-destructive"
              >
                End Chat
              </button>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Minimize"
              >
                <Minus className="w-4 h-4" />
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
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>
                    {msg.content}
                  </ReactMarkdown>
                </div>

                {msg.role === "assistant" && Array.isArray(msg.sources) && msg.sources.length > 0 && (
                  <ExpandableSources sources={msg.sources} />
                )}
              </div>
            ))}

            {isTyping && (
              <div className="w-fit bg-background text-muted-foreground text-xs px-3 py-2 rounded-md animate-pulse">
                <span className="animate-pulse">● ● ●</span>
              </div>
            )}
          </ScrollArea>

          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask something..."
              className="flex-1 bg-input text-foreground"
            />
            <CustomBtn
              onClick={() => {
                if (input.trim()) {
                  sendMessage(input.trim());
                  setInput("");
                }
              }}
              className="p-2 rounded-md"
            >
              <SendHorizonal className="h-4 w-4" />
            </CustomBtn>
          </div>

          {confirmEnd && (
            <ConfirmDialog
              onCancel={() => setConfirmEnd(false)}
              onConfirm={() => {
                setConfirmEnd(false);
                setMessages([]);
                onEndChat();
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
