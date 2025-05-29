"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import CustomBtn from "./CustomBtn";

const iconOptions = ["🤖", "💬", "😊", "💡", "🍫", "🥛", "🍪", "🔍", "📢"];

interface ChatSettingsProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, icon: string) => void;
}

export default function ChatSettings({
  open,
  onClose,
  onSave,
}: ChatSettingsProps) {
  const [name, setName] = useState("Nestlé Assistant");
  const [icon, setIcon] = useState("💬");

  useEffect(() => {
    const savedName = localStorage.getItem("chatbotName");
    const savedIcon = localStorage.getItem("chatbotIcon");
    if (savedName) setName(savedName);
    if (savedIcon) setIcon(savedIcon);
  }, []);

  const handleSave = () => {
    localStorage.setItem("chatbotName", name);
    localStorage.setItem("chatbotIcon", icon);
    onSave(name, icon);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[85vw] max-w-md sm:max-w-lg [&>button]:hidden px-4 sm:px-6 py-6">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Customize Your Assistant</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <Input
              className="w-full text-xs bg-input border border-muted-foreground rounded-md focus-visible:outline-none focus-visible:ring-0"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-sm font-medium mb-1">Icon</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {iconOptions.map((ic) => (
                <button
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className={`p-2 text-xl rounded-md border w-10 h-10 flex items-center justify-center ${
                    icon === ic
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-muted hover:bg-muted/70 text-muted-foreground border border-border"
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <CustomBtn onClick={handleSave} className="w-full mt-2 text-xs sm:text-sm">
            Save Changes
          </CustomBtn>
        </div>
      </DialogContent>
    </Dialog>
  );
}
