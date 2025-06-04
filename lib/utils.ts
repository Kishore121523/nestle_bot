import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Chunks
const MAX_CHARS = 700;

//
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

export const stopWordsForNeo4j = new Set([
  "product",
  "products",
  "item",
  "items",
  "category",
  "categories",
  "food",
  "support",
  "tools",
  "prepared",
  "other",
  "total",
  "many",
  "under",
  "over",
  "less",
  "more",
  "around",
  "with",
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

// Type out text animation with mask
export function typeOutText(
  fullText: string,
  callback: (chunk: string) => void,
  done: () => void,
  delay = 10
) {
  let i = 0;

  // Mask all markdown links (e.g., [Label](URL)) → hide actual link during typing
  let maskedText = fullText.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_, label) => `[${label}](#hidden)`
  );

  // Mask custom Amazon buttons → hide them completely during typing
  maskedText = maskedText.replace(
    /\[\[amazon-button\|(.+?)\]\](.*?)\[\[\/amazon-button\]\]/g,
    ""
  );

  //Mask <span style="margin-bottom:..."></span> spacers → replace with invisible placeholder
  maskedText = maskedText.replace(
    /<span[^>]*style=['"][^'"]*margin-bottom:[^'"]*['"][^>]*>\s*<\/span>/gi,
    ""
  );
  function type() {
    if (i < maskedText.length) {
      callback(maskedText.slice(0, i + 1));
      i++;
      setTimeout(type, delay);
    } else {
      // After typing, show the real full content with all original tags
      callback(fullText);
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

// Determine query intent for search API:
// - Returns "total" for overall product count queries
// - Returns "category" for category-specific count queries
// - Returns "search" for general informational or lookup queries
export function classifyQueryIntent(
  text: string
): "total" | "category" | "search" {
  const lowered = text.toLowerCase().replace(/\s+/g, " ").trim();

  const isTotal =
    lowered === "total number of products available" ||
    lowered === "how many nestle products are listed" ||
    ([
      /\bhow many (nestl[eé]?)? ?(products|items)? (are )?(available|listed)?\b/,
      /\btotal number of (products|items)\b/,
      /\bwhat is the total (number|amount) of (products|items)\b/,
      /\b(how many|number of|count of|list of|total)\b.*\b(nestl[eé]?|products?|items?)\b/,
    ].some((r) => r.test(lowered)) &&
      !/\b(category|categories|under|related to|type)\b/.test(lowered));

  const isCount =
    /\b(how many|total|number of|count of|list of|available)\b/.test(lowered) &&
    /\b(nestl[eé]?|product|products|item|items|category|categories)\b/.test(
      lowered
    );

  if (isTotal) return "total";
  if (isCount) return "category";
  return "search";
}
