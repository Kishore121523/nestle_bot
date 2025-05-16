"use client";

import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ChatWindow({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 w-[350px] sm:w-[400px] bg-card text-card-foreground border border-border rounded-xl shadow-lg p-4 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-semibold text-base">Nestlé Assistant</h2>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm">
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

      {/* Chat body */}
      <ScrollArea className="h-100 rounded border border-muted bg-muted p-2 mb-3">
        {/* Chat messages will go here */}
      </ScrollArea>

      {/* Input field */}
      <Textarea
        placeholder="Ask something..."
        className="resize-none bg-input text-foreground placeholder-muted-foreground"
        rows={2}
      />
    </div>
  );
}
