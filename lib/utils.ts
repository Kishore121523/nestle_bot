import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Chunks
const MAX_CHARS = 700;

export function cleanAndChunkText(
  paragraphs: string[],
  maxChars = MAX_CHARS
): string[] {
  const seen = new Set<string>();
  const filtered = paragraphs.filter((p) => {
    const key = p.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return key.length > 0;
  });

  const chunks: string[] = [];
  let currentChunk = "";

  for (const paragraph of filtered) {
    if ((currentChunk + paragraph).length <= maxChars) {
      currentChunk += paragraph + " ";
    } else {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = paragraph + " ";
    }
  }

  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}
