import { NextRequest, NextResponse } from "next/server";
import { SearchClient, AzureKeyCredential } from "@azure/search-documents";
import { AzureOpenAI } from "openai";
import { NestleDocument } from "@/lib/embedding/uploadToSearch";
import { getEntitiesForChunk } from "@/lib/graph/getEntitiesForChunk";
import { stopwords, synonymMap } from "@/lib/utils";
import { getProductCountsFromGraph } from "@/lib/graph/getEntityCounts";

export const dynamic = "force-dynamic";

// Azure OpenAI client
const openai = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY!,
  endpoint: process.env.AZURE_OPENAI_API_BASE!,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION! || "2023-05-15",
});

// Azure Search client
const searchClient = new SearchClient<NestleDocument>(
  process.env.AZURE_SEARCH_ENDPOINT!,
  process.env.AZURE_SEARCH_INDEX!,
  new AzureKeyCredential(process.env.AZURE_SEARCH_KEY!)
);

// Entity scoring (for reranking)
function getEntityMatchScore(
  entities: Record<string, string[]>,
  keywords: string[]
): number {
  const typeWeights: Record<string, number> = {
    product: 3,
    category: 2,
    ingredient: 1,
    topic: 1,
  };

  let score = 0;
  for (const type in entities) {
    for (const entity of entities[type]) {
      const normalized = entity.toLowerCase();
      for (const kw of keywords) {
        if (normalized === kw) {
          score += 2 * (typeWeights[type] || 1); // more weight for exact match
        } else if (normalized.includes(kw)) {
          score += 1 * (typeWeights[type] || 1); // less weight for partial match
        }
      }
    }
  }
  return score;
}

// Expand keyword set with synonyms
function expandKeywords(keywords: string[]): string[] {
  const expanded = new Set(keywords);
  for (const word of keywords) {
    const synonyms = synonymMap[word];
    if (synonyms) {
      for (const alt of synonyms) expanded.add(alt);
    }
  }
  return Array.from(expanded);
}

// Basic structured for count detector
function isCountQuery(text: string): boolean {
  const lowered = text.toLowerCase();
  return (
    /\b(how many|total|number of|count of|list of)\b/.test(lowered) &&
    /\b(nestl[eé]?|product|products|item|items|category|categories)\b/.test(
      lowered
    )
  );
}

export async function POST(req: NextRequest) {
  try {
    const { query, top = 5 } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid query" },
        { status: 400 }
      );
    }

    // Structured count logic
    if (isCountQuery(query)) {
      // Gets the information by querying Neo4j
      const counts = await getProductCountsFromGraph();
      const lowerQuery = query.toLowerCase();

      // Handling total product count queries
      if (
        /\b(total|all|overall|listed)\b.*\b(nestl[eé]|products?|items?)\b/.test(
          lowerQuery
        ) ||
        /\bhow many\b.*\b(nestl[eé]|products?|items?)\b/.test(lowerQuery) ||
        /\b(nestl[eé]|products?)\b.*\bavailable|listed\b/.test(lowerQuery)
      ) {
        return NextResponse.json({
          success: true,
          type: "count",
          count: counts.totalProducts,
          message: `There are approximately ${counts.totalProducts} Nestle products listed.`,
        });
      }

      // Filter out generic words
      const stopwords = new Set([
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

      const { categories } = await getProductCountsFromGraph();

      const normalize = (str: string) =>
        str
          .toLowerCase()
          .replace(/[^\w\s]/g, "")
          .trim();

      const queryWords = lowerQuery
        .split(/\W+/)
        .filter((w) => w.length > 2 && !stopwords.has(w));

      // Fuzzy match categories from the query
      const matchedCategories = Object.entries(categories).filter(([cat]) => {
        const catNorm = normalize(cat);
        return queryWords.some((word) => {
          const normWord = normalize(word);
          return (
            synonymMap[normWord]?.includes(cat) || // exact synonym match
            catNorm === normWord || // exact match
            catNorm.startsWith(normWord + " ") || // partial start match
            catNorm.endsWith(" " + normWord) // partial end match
          );
        });
      });

      if (matchedCategories.length > 0) {
        const total = matchedCategories.reduce(
          (sum, [, count]) => sum + count,
          0
        );

        const catLabels = matchedCategories
          .slice(0, 3)
          .map(([cat]) => `"${cat}"`)
          .join(", ");

        return NextResponse.json({
          success: true,
          type: "count",
          count: total,
          message: `There are ${total} products across ${
            matchedCategories.length
          } categories related to ${catLabels}${
            matchedCategories.length > 3 ? " and more" : ""
          }.`,
        });
      }

      return NextResponse.json({
        success: true,
        type: "count",
        message: `Sorry, I couldn't find that category, but there are ${counts.totalProducts} total products.`,
      });
    }

    // Searches Azure Cognitive Search and Neo4j - get combined score - generate response from top matching results
    const baseKeywords = query
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 2 && !stopwords.has(w));

    const keywords = expandKeywords(baseKeywords);

    const embeddingResponse = await openai.embeddings.create({
      model: process.env.AZURE_OPENAI_EMBEDDING_MODEL! || "embedding-model",
      input: query,
    });

    if (!embeddingResponse?.data?.[0]?.embedding) {
      throw new Error("Failed to generate embedding from Azure OpenAI.");
    }

    const queryEmbedding = embeddingResponse.data[0].embedding;

    const results = await searchClient.search(query, {
      top,
      vectorSearchOptions: {
        queries: [
          {
            kind: "vector",
            vector: queryEmbedding,
            fields: ["vector"],
            kNearestNeighborsCount: top,
          },
        ],
      },
      select: ["id", "content", "sourceUrl", "chunkIndex"],
    });

    const matches = [];

    for await (const result of results.results) {
      const { id, content, sourceUrl, chunkIndex } = result.document;

      const entities = await getEntitiesForChunk(id);
      const entityScore = getEntityMatchScore(entities, keywords);
      const finalScore = result.score + entityScore * 0.1;

      matches.push({
        id,
        content,
        sourceUrl,
        chunkIndex,
        score: result.score,
        entityScore,
        finalScore,
        entities,
      });
    }

    return NextResponse.json({ success: true, matches });
  } catch (err) {
    console.error("Search API Error:", err);
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
