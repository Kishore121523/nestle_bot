"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface AmazonBtnProps {
  productName: string;
  amazonUrl: string;
  className?: string;
}

export default function AmazonBtn({ productName, amazonUrl, className }: AmazonBtnProps) {
  if (!amazonUrl) return null;

  return (
    <button
      className={cn(
        "border border-muted-foreground bg-background hover:bg-muted hover:text-foreground transition-colors duration-200 ease-in-out text-[11px] sm:text-[12px] p-[6px] rounded-[6px] cursor-pointer", className
      )}   
      
    >
      <a href={amazonUrl} target="_blank" rel="noopener noreferrer"   className="!text-foreground !no-underline !decoration-transparent flex items-center justify-center gap-[6px]"

      >
        <Image
          src="/assets/amazon-logo.png"
          alt="Amazon"
          width={12}
          height={12}
          className="w-3 h-3 object-contain"
        />
        <span>
          Buy{" "}
          {productName
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ")}{" "}
          on Amazon
        </span>     
      </a>
    </button>
  );
}
