"use client";

import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import { ReactNode } from "react";

interface CustomBtnProps {
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  type?: "button" | "submit" | "reset";
}

export default function CustomBtn({
  onClick,
  children,
  className,
  type = "button",
}: CustomBtnProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        "text-foreground bg-transparent cursor-pointer transition-all duration-200 ease-in-out text-[13px] sm:text-[14px] rounded-md flex items-center",
        className
      )}
    >
      {children}
      <a
        href="https://example.com"
        target="_blank"
        rel="noopener noreferrer"
        className="ml-1 p-1 rounded-sm"
      >
        <ExternalLink size={14} />
      </a>
    </button>
  );
}
