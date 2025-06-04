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

// Strict check using Regex
export const storeRegex =
  /\b((where|nearby)\s+(can i|do i)?\s*(buy|get|purchase|find)\b|\b(find|shop)\s+(a|the)?\s*(store|place)\b|\bstore\s+(near me|nearby|closest|close by)\b|\bplaces?\s+to\s+(buy|get)\b)/;

export const totalRegex = new RegExp(
  String.raw`^(what is|how many|what's|give me|show me)?\s*(the\s*)?(total|number of|count of|list of)?\s*(nestl[eé]?|all)?\s*(products?|items?)\s*(available|listed)?\s*(in\s+canada)?\s*[\?]?$`,
  "i"
);

export const categoryRegex = new RegExp(
  String.raw`^\s*(how many|what is|what's|give me|show me)?\s*(the\s*)?(total|number of|count of|list of)?\s+([a-z\s\-]+)?\s+(products?|items?)\s+(in|under|related to)\s+(category|categories|type|group)\s*\?*$`,
  "i"
);

// PROMPTS
export const classifyIntentPrompt = (query: string) => `
You are a strict classification system. Your job is to analyze the user query and return a machine-readable JSON object with two fields:

{
  "mainIntent": "store" | "info",
  "countIntent": "total" | "category" | "search"
}

## INTENT RULES

- "mainIntent":
  - "store" → The user wants to find, buy, locate, or shop for a product (e.g., "Where can I buy KitKat?", "Stores near me").
  - "info" → The user is asking about product details like ingredients, nutrition, flavor, usage, comparisons, or general facts.

- "countIntent":
  - "total" → The user is asking for the **total number of Nestlé products** (e.g., "How many Nestlé products exist?", "Total items listed").
  - "category" → The user is asking for a count in a **specific product group** like chocolate, drinks, snacks, etc. (e.g., "How many chocolate items?", "Products in cereal category").
  - "search" → Any other request that is not a clear count (e.g., recipes, benefits, nutrition, how to use, product facts).

---

## OUTPUT RULES

- Return only a valid **JSON object**.
- Use **lowercase values** exactly as specified.
- Do not add explanation or any extra text.
- Do not return ambiguous or mixed categories.
- If unclear, default "countIntent" to "search".

---

## EXAMPLES

Query: "Where can I buy KitKat?"  
→ { "mainIntent": "store", "countIntent": "search" }

Query: "How many Nestlé chocolates are there?"  
→ { "mainIntent": "info", "countIntent": "category" }

Query: "How many Nestlé products exist in total?"  
→ { "mainIntent": "info", "countIntent": "total" }

Query: "What are the ingredients in Coffee Crisp?"  
→ { "mainIntent": "info", "countIntent": "search" }

Query: "Is Boost good for kids?"  
→ { "mainIntent": "info", "countIntent": "search" }

Query: "Shop for Smarties near me"  
→ { "mainIntent": "store", "countIntent": "search" }

Query: "Where to buy chocolate?"  
→ { "mainIntent": "store", "countIntent": "search" }

Query: "How many Nestlé snacks are available?"  
→ { "mainIntent": "info", "countIntent": "category" }

Query: "How to make brownies with Nestlé products?"  
→ { "mainIntent": "info", "countIntent": "search" }

---

Now classify the following query **strictly following the rules above**:

Query: "${query}"

Return ONLY the JSON object on a single line.
`;

// Generate answer prompt

export const generateAnswerPrompt = (context: string, query: string) => `
You are a helpful assistant that answers questions using only the provided context from the Nestlé Canada website.

Your response must follow this strict formatting in **Markdown**:

- Start with a clear, short introductory paragraph.
- Use **numbered or bulleted lists** where relevant.
- Each list item should have:
  - A **bolded title** (e.g., product name, recipe, or concept)
  - A new line with its short description underneath.
- For instructions, nutrition facts, or extra details, use a italic font one- or two-word sub-heading like **Tips**, **Instructions**, or **Nutrition**, followed by ':' and write the content after that.
- Add line breaks ('\\n\\n') between items and sections for clarity.
- End with a summary or call-to-action if appropriate.
- Do NOT add external or unrelated content.

Context:
${context}

Question:
${query}

Respond in clean Markdown with clear paragraph spacing.
`;
