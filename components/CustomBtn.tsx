"use client";
import { Button } from "@/components/ui/button";

export default function CustomBtn({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Button
      onClick={onClick}
      className="text-foreground border border-muted-foreground bg-transparent hover:bg-foreground hover:text-background cursor-pointer transition text-[14px]"
    >
      {children}
    </Button>
  );
}

