'use client';

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, SendHorizonal, Settings2, X } from "lucide-react";
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
  const [showTypingBubble, setShowTypingBubble] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = (smooth = true) => {
    requestAnimationFrame(() => {
      const container = scrollRef.current;
      if (!container) return;

      const start = container.scrollTop;
      const end = container.scrollHeight - container.clientHeight;

      if (!smooth || Math.abs(end - start) < 50) {
        container.scrollTo({ top: end, behavior: "auto" });
        return;
      }

      const duration = 300;
      const startTime = performance.now();

      const animate = (time: number) => {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        container.scrollTop = start + (end - start) * ease;
        if (progress < 1) requestAnimationFrame(animate);
      };

      requestAnimationFrame(animate);
    });
  };

  useEffect(() => {
    if (open && messages.length === 0) {
      const welcome =
        "Hello! I'm your Nestlé Assistant. Ask me anything about recipes, products, ingredients, or anything Nestlé-related.";

      setMessages([{ role: "assistant", content: "" }]);
      setShowTypingBubble(false);
      setIsTyping(true);

      let tempContent = "";

      typeOutText(
        welcome,
        (chunk) => {
          tempContent = chunk;
          setMessages([{ role: "assistant", content: chunk }]);
          scrollToBottom(true);
        },
        () => {
          setMessages([{ role: "assistant", content: tempContent }]);
          setIsTyping(false);
          setShowTypingBubble(true);
          scrollToBottom(true);
        }
      );
    } else if (open) {
      setTimeout(() => scrollToBottom(true), 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const sendMessage = async (content: string) => {
    setMessages((prev) => [...prev, { role: "user", content }]);
    setIsTyping(true);
    scrollToBottom();

    try {
      const res = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: content }),
      });

      const data = await res.json();

      if (data?.answer) {
        type Source = { sourceUrl: string };
        const sourceUrls = Array.isArray(data.sources)
          ? [...new Set((data.sources as Source[]).map((s) => String(s.sourceUrl)))]
          : [];

        let tempContent = "";
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        typeOutText(
          data.answer,
          (chunk) => {
            tempContent = chunk;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              return [...prev.slice(0, -1), { ...last, content: chunk }];
            });
            scrollToBottom();
          },
          () => {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              return [...prev.slice(0, -1), { ...last, content: tempContent, sources: sourceUrls }];
            });
            setIsTyping(false);
            scrollToBottom();
          }
        );
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Sorry, I couldn't find an answer." },
        ]);
        scrollToBottom();
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong." },
      ]);
    } finally {
      setIsTyping(false);
    }
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
          className="fixed bottom-24 right-6 z-50 w-[350px] sm:w-[450px] bg-card text-card-foreground border border-border rounded-xl shadow-lg p-4 flex flex-col"
        >
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold text-base flex items-center gap-2">
              <span>{icon}</span> {name}
              <button
                onClick={onOpenSettings}
                className="ml-2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="text-muted-foreground cursor-pointer border border-muted-foreground bg-transparent rounded-md p-1  hover:bg-foreground hover:text-background transition"
                aria-label="Minimize"
              >
                <Minus className="w-4 h-4" />
              </button>

              <button
                onClick={() => setConfirmEnd(true)}
                className="text-xs cursor-pointer border border-muted-foreground bg-transparent rounded-md p-1  hover:bg-destructive hover:text-background hover:border-destructive transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="h-92 scrollbar-thin overflow-y-auto rounded border border-muted bg-muted p-2 mb-3 space-y-2 scroll-smooth"
          >
            {messages.map((msg, idx) => (
              <div
              key={idx}
              className={`w-fit max-w-[85%] px-3 py-2 rounded-md text-sm mb-3 ${
                msg.role === "user"
                  ? "ml-auto bg-accent text-accent-foreground"
                  : "bg-background text-foreground"
              }`}
            >
                <div className="markdown-message text-sm leading-normal">
                <ReactMarkdown
                  components={{
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    a: ({ node, ...props }) => (
                      <a
                        {...props}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline hover:text-primary/80 transition-colors"
                      />
                    ),
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
                </div>
                {msg.role === "assistant" && Array.isArray(msg.sources) && msg.sources.length > 0 && (
                  <ExpandableSources sources={msg.sources} />
                )}
              </div>
            ))}
            {isTyping && showTypingBubble && (
              <div className="w-fit bg-background text-muted-foreground text-xs px-3 py-2 rounded-md animate-pulse">
                <span className="animate-pulse">● ● ●</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask somethingto me"
              className="flex-1 bg-input text-foreground text-[10px] text-xs border border-muted-foreground rounded-[6px] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-muted-foreground focus:outline-none focus:ring-0"
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
