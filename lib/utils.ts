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

// stopwords
export const stopwords = new Set([
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
  "are",
  "was",
  "were",
  "but",
  "about",
  "from",
  "into",
  "when",
  "what",
  "which",
  "while",
  "where",
  "how",
  "have",
  "has",
  "had",
  "been",
  "will",
  "would",
  "should",
  "can",
  "could",
  "a",
  "an",
  "of",
  "in",
  "on",
  "to",
  "as",
  "is",
  "it",
  "by",
  "or",
  "at",
  "be",
  "not",
  "no",
  "so",
  "if",
  "do",
  "does",
  "did",
]);
