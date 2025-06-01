'use client';

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link as LinkIcon } from "lucide-react";

export function ExpandableSources({ sources }: { sources: string[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="text-xs text-muted-foreground text-right w-full max-w-full mt-2">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="hover:underline hover:text-primary cursor-pointer transition-colors text-[11px] flex items-center gap-1 ml-auto"
      >
        <LinkIcon className="h-[12px] w-[12px]" />
        {open ? "Hide Sources" : "Show Sources"}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="mt-2 text-left space-y-2 p-3 rounded-md bg-muted/40 text-muted-foreground text-[11px] sm:text-[13px] overflow-hidden"
        >
          <ul className="space-y-1">
            {sources.map((url, i) => {
              const displayUrl = url.length > 42 ? url.slice(0, 42) + "..." : url;
              return (
                <li className="flex items-start gap-1 leading-tight break-words" key={i}>
                  <span>-</span>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 underline opacity-80 hover:opacity-100 transition-opacity break-all max-w-full"
                    title={url}
                  >
                    {displayUrl}
                  </a>
                </li>
              );
            })}
          </ul>
        </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
