import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "lucide-react";

export function ExpandableSources({ sources }: { sources: string[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="text-xs text-muted-foreground text-right">
      <button
        onClick={() => setOpen(!open)}
        className="hover:underline hover:text-primary transition-colors text-[10px] flex ml-auto items-center justify-center cursor-pointer mt-1"
      >
        <Link className="h-[12px] mr-[-2px]" /> {open ? "Hide Sources" : "Show Sources"}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="mt-2 text-left space-y-1 p-2 rounded-[8px] bg-[#e9e9e9] text-xs"
          >
            <ul>
            {sources.map((url, i) => {
            const displayUrl = url.length > 34 ? url.slice(0, 34) + "..." : url;
            return (
              <li className="flex gap-1" key={i}>
                - 
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-blue-500 text-[12px] underline break-words opacity-80 hover:opacity-100 transition-opacity"
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
