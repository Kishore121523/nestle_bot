/**
 * GraphRAG Hybrid Search API
 * This API route performs hybrid retrieval-augmented generation (RAG) using:
 *
 * 1.Intent Classification:
 *    - Classifies query as "total", "category", or "search" using heuristic rules.
 *    - If "total" or "category", retrieves product counts from Neo4j and returns a structured response.
 *
 * 2.Vector Search (RAG):
 *    - For "search" intent, generates an embedding for the query using Azure OpenAI (`text-embedding-ada-002`).
 *    - Performs a top-K vector similarity search using Azure Cognitive Search over pre-embedded content chunks.
 *
 * 3.Graph Enrichment:
 *    - For each matched chunk, retrieves associated entities (products, categories, ingredients, topics) from Neo4j.
 *    - Computes an entity match score using keyword overlap and entity type weights.
 *    - Combines this score with vector similarity to prioritize semantically relevant + entity-aligned results.
 *
 * 4. **Response Format**:
 *    - Returns a list of enriched matches sorted by finalScore = vector score + entityScore * weight.
 *    - Can be passed to an LLM for grounded answer generation using context + graph-enhanced relevance.
 **/

import { NextRequest, NextResponse } from "next/server";
import {
  SearchClient,
  AzureKeyCredential,
  SearchResult,
} from "@azure/search-documents";
import { AzureOpenAI } from "openai";
import { NestleDocument } from "@/lib/embedding/uploadToSearch";
import { getEntitiesForChunk } from "@/lib/graph/getEntitiesForChunk";
import { getProductCountsFromGraph } from "@/lib/graph/getEntityCounts";
import { stopwords, stopWordsForNeo4j, synonymMap } from "@/lib/utils";

export const dynamic = "force-dynamic";

// -------------------- Azure OpenAI (text-embedding-ada-002) Setup --------------------
const openai = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY!,
  endpoint: process.env.AZURE_OPENAI_API_BASE!,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION! || "2023-05-15",
});

const searchClient = new SearchClient<NestleDocument>(
  process.env.AZURE_SEARCH_ENDPOINT!,
  process.env.AZURE_SEARCH_INDEX!,
  new AzureKeyCredential(process.env.AZURE_SEARCH_KEY!)
);

// -------------------- Utility Functions --------------------
function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .trim();
}

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
          score += 2 * (typeWeights[type] || 1);
        } else if (normalized.includes(kw)) {
          score += 1 * (typeWeights[type] || 1);
        }
      }
    }
  }
  return score;
}

// -------------------- Count Handling --------------------
async function handleCountQuery(query: string, intent: "total" | "category") {
  const counts = await getProductCountsFromGraph();
  const lowerQuery = query.toLowerCase();

  if (intent === "total") {
    return {
      success: true,
      type: "count",
      count: counts.totalProducts,
      message: `There are approximately ${counts.totalProducts} Nestle products listed.`,
    };
  }

  const queryWords = lowerQuery
    .split(/\W+/)
    .filter((w) => w.length > 2 && !stopWordsForNeo4j.has(w));

  const { categories } = counts;

  const matchedCategories = Object.entries(categories).filter(([cat]) => {
    const catNorm = normalize(cat);
    return queryWords.some((word) => {
      const normWord = normalize(word);
      return (
        synonymMap[normWord]?.includes(cat) ||
        catNorm === normWord ||
        catNorm.startsWith(normWord + " ") ||
        catNorm.endsWith(" " + normWord)
      );
    });
  });

  if (matchedCategories.length > 0) {
    const total = matchedCategories.reduce((sum, [, count]) => sum + count, 0);
    const catLabels = matchedCategories
      .slice(0, 3)
      .map(([cat]) => `"${cat}"`)
      .join(", ");
    return {
      success: true,
      type: "count",
      count: total,
      message: `There are ${total} products across ${
        matchedCategories.length
      } categories related to ${catLabels}${
        matchedCategories.length > 3 ? " and more" : ""
      }.`,
    };
  }

  return {
    success: true,
    type: "count",
    message: `Sorry, I couldn't find that category, but there are ${counts.totalProducts} total products.`,
  };
}

// -------------------- Main Route Handler --------------------
export async function POST(req: NextRequest) {
  // console.time("total");
  try {
    const { query, top, countIntent } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid query" },
        { status: 400 }
      );
    }

    if (countIntent === "total" || countIntent === "category") {
      const countResponse = await handleCountQuery(query, countIntent);
      return NextResponse.json(countResponse);
    }

    // Info intent - Performs a hybrid search in both vector DB and Neo4j to calculate the finalScore
    const baseKeywords = query
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 2 && !stopwords.has(w));

    const keywords = expandKeywords(baseKeywords);

    // console.time("embedding");
    const embeddingResponse = await openai.embeddings.create({
      model: process.env.AZURE_OPENAI_EMBEDDING_MODEL!,
      input: query,
    });
    // console.timeEnd("embedding");

    const queryEmbedding = embeddingResponse.data[0]?.embedding;

    if (!queryEmbedding)
      throw new Error("Failed to generate embedding from Azure OpenAI.");
    // console.time("search");
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
    // console.timeEnd("search");

    // console.time("entities");

    const matches: SearchResult<
      Pick<NestleDocument, "id" | "content" | "sourceUrl" | "chunkIndex">
    >[] = [];

    for await (const result of results.results) {
      matches.push(result);
    }

    const enrichedMatches = await Promise.all(
      matches.map(async (result) => {
        const { id, content, sourceUrl, chunkIndex } = result.document;
        const entities = await getEntitiesForChunk(id);
        const entityScore = getEntityMatchScore(entities, keywords);
        const finalScore = result.score + entityScore * 0.1;

        return {
          id,
          content,
          sourceUrl,
          chunkIndex,
          score: result.score,
          entityScore,
          finalScore,
          entities,
        };
      })
    );
    // console.timeEnd("entities");
    // console.timeEnd("total");
    return NextResponse.json({ success: true, matches: enrichedMatches });
  } catch (err) {
    // console.timeEnd("total");

    console.error("Search API Error:", err);
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
