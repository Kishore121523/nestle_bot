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

// Synonyms - could be expanded or loaded from a file
// This is a simple synonym map for demonstration purposes
export const synonymMap: Record<string, string[]> = {
  boost: [
    "boost®",
    "boost® kids",
    "boost® kids essentials",
    "boost® kids essentials chocolate",
    "boost® kids essentials vanilla",
  ],
  aero: [
    "aero",
    "aero brownies",
    "aero bubbly hot chocolate",
    "aero chocolate - feel the bubbles melt",
    "aero duo",
  ],
  nutritional: [
    "nutritional benefits of milk",
    "nutritional beverages",
    "nutritional drinks",
    "nutritional enrichment",
    "nutritional information (1 serving = 35 calories or less)",
  ],
  cocoa: [
    "cocoa",
    "cocoa butter",
    "cocoa farming",
    "cocoa farming support",
    "cocoa powder",
  ],
  sustainable: [
    "sustainable agriculture",
    "sustainable cocoa farming practices",
    "sustainable coffee farming",
    "sustainable cuisine",
    "sustainable cultivation",
  ],
  global: ["global", "global connectivity", "global recipes"],
  food: [
    "food banks canada partnership",
    "food communications",
    "food factory",
    "food network canada",
    "food preservation",
  ],
  nestle: [
    "nestlé",
    "nestlé aero novelty bunny 94g",
    "nestlé aero truffle brownie 105 g bar",
    "nestlé baby & me",
    "nestlé brands",
  ],
  hot: [
    "hot and iced chocolate",
    "hot chocolate",
    "hot chocolate recipe",
    "hot chocolate recipes",
  ],
  vanilla: [
    "vanilla",
    "vanilla bean",
    "vanilla bean ice cream",
    "vanilla beans",
    "vanilla caramel half dipped frozen dessert bars",
  ],
};

// Type out text
export function typeOutText(
  fullText: string,
  callback: (chunk: string) => void,
  done: () => void,
  delay = 10
) {
  let i = 0;
  function type() {
    if (i < fullText.length) {
      callback(fullText.slice(0, i + 1));
      i++;
      setTimeout(type, delay);
    } else {
      done();
    }
  }
  type();
}

export const productKeywords = [
  "kitkat",
  "smarties",
  "coffee crisp",
  "aero",
  "nescafe",
  "boost",
  "haagen-dazs",
  "turtles",
  "nesquik",
  "delissio",
  "purina",
  "gerber",
];
