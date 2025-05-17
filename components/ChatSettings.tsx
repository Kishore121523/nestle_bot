"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import CustomBtn from "./CustomBtn";

const iconOptions = ["🤖", "💬", "😊", "💡", "🍫", "🥛", "🍪", "🔍", "📢"];

interface ChatSettingsProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, icon: string) => void;
}

export default function ChatSettings({ open, onClose, onSave }: ChatSettingsProps) {
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
      <DialogContent className="max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle>Customize Your Assistant</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input className="bg-input text-[10px] text-xs border border-muted-foreground rounded-[6px] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-muted-foreground focus:outline-none focus:ring-0" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium">Icon</label>
            <div className="flex gap-2 flex-wrap mt-2">
              {iconOptions.map((ic) => (
                <button
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className={`p-2 text-xl rounded border cursor-pointer ${
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

          <CustomBtn onClick={handleSave} className="w-full mt-4">
            Save Changes
          </CustomBtn>
        </div>
      </DialogContent>
    </Dialog>
  );
}
