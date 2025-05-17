"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface CustomBtnProps {
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}

export default function CustomBtn({ onClick, children, className }: CustomBtnProps) {
  return (
    <Button
      onClick={onClick}
      className={cn(
        "text-foreground border border-muted-foreground bg-transparent hover:bg-foreground hover:text-background cursor-pointer transition text-[14px]",
        className
      )}
    >
      {children}
    </Button>
  );
}
