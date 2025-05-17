'use client';

import { useEffect, useState } from "react";
import ChatButton from "./ChatButton";
import ChatWindow from "./ChatWindow";
import ChatSettings from "./ChatSettings";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [chatbotName, setChatbotName] = useState("Nestlé Assistant");
  const [chatbotIcon, setChatbotIcon] = useState("💬");

  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem("chatbotName");
    const savedIcon = localStorage.getItem("chatbotIcon");
    if (savedName) setChatbotName(savedName);
    if (savedIcon) setChatbotIcon(savedIcon);
  }, []);

  const handleSendMessage = async (content: string) => {
    setMessages((prev) => [...prev, { role: "user", content }]);
    setIsTyping(true);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "This is a placeholder response from Nestlé AI Assistant." }
      ]);
      setIsTyping(false);
    }, 1500);
  };

  const handleEndChat = () => {
    setMessages([]);
    setOpen(false);
  };

  const handleUpdateSettings = (name: string, icon: string) => {
    setChatbotName(name);
    setChatbotIcon(icon);
    localStorage.setItem("chatbotName", name);
    localStorage.setItem("chatbotIcon", icon);
  };

  return (
    <>
      <ChatWindow
        open={open}
        onClose={() => setOpen(false)}
        onSendMessage={handleSendMessage}
        onEndChat={handleEndChat}
        messages={messages}
        isTyping={isTyping}
        name={chatbotName}
        icon={chatbotIcon}
        onOpenSettings={() => setShowSettings(true)}
      />

      <ChatButton onClick={() => setOpen(true)} />

      <ChatSettings
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleUpdateSettings}
      />
    </>
  );
}
