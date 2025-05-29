"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
    <Button
      type={type}
      onClick={onClick}
      className={cn(
        "text-foreground border border-muted-foreground bg-transparent hover:bg-foreground hover:text-background cursor-pointer transition-all duration-200 ease-in-out text-[13px] sm:text-[14px] px-3 py-1.5 rounded-md",
        className
      )}
    >
      {children}
    </Button>
  );
}
