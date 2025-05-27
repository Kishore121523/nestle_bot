/**
  GRAPH-RAG: Hybrid Retrieval + Graph-Aware Reranking

  This API route handles search queries by:
  1. Generating an embedding from the user's query via OpenAI - ada-002 model.
  2. Performing a vector search on Azure Cognitive Search (Azure AI Search) to retrieve relevant content chunks.
  3. Expanding query keywords using synonym maps (to simulate NLU).
  4. Looking up associated entities from Neo4j for each chunk (products, categories, etc.).
  5. Scoring results based on both vector similarity and graph-entity overlap.
  6. Returning the most relevant results sorted by final hybrid score.
 */

import { NextRequest, NextResponse } from "next/server";
import { SearchClient, AzureKeyCredential } from "@azure/search-documents";
import { OpenAI } from "openai";
import { NestleDocument } from "@/lib/embedding/uploadToSearch";
import { getEntitiesForChunk } from "@/lib/graph/getEntitiesForChunk";
import { stopwords, synonymMap } from "@/lib/utils";

// Setup OpenAI - ada-002 model client for embedding generation
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  baseURL: process.env.OPENAI_API_BASE!,
  defaultHeaders: { "api-key": process.env.OPENAI_API_KEY! },
  defaultQuery: { "api-version": process.env.OPENAI_API_VERSION! },
});

// Azure Search client to query the indexed document chunks
const searchClient = new SearchClient<NestleDocument>(
  process.env.AZURE_SEARCH_ENDPOINT!,
  process.env.AZURE_SEARCH_INDEX!,
  new AzureKeyCredential(process.env.AZURE_SEARCH_KEY!)
);

// This function compares keywords against chunk entities and returns a numeric score
function getEntityMatchScore(
  entities: Record<string, string[]>,
  keywords: string[]
): number {
  let score = 0;
  for (const type in entities) {
    for (const entity of entities[type]) {
      const normalized = entity.toLowerCase();
      if (keywords.some((kw) => normalized.includes(kw))) {
        score += 1;
      }
    }
  }
  return score;
}

// Expands input keywords using a fixed synonym map (acts as a lightweight NLU layer)
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

// Main route handler
export async function POST(req: NextRequest) {
  try {
    const { query, top = 5 } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid query" },
        { status: 400 }
      );
    }

    // Extract + clean keywords
    const baseKeywords = query
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 2 && !stopwords.has(w));

    const keywords = expandKeywords(baseKeywords);

    // Generate embedding from OpenAI
    const embeddingResponse = await openai.embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL!,
      input: query,
    });

    if (!embeddingResponse?.data?.[0]?.embedding) {
      throw new Error("Failed to fetch embedding from OpenAI.");
    }

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Perform vector search in Azure AI Search
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

    // For each result, fetch Neo4j entities and rerank
    const matches = [];

    for await (const result of results.results) {
      const { id, content, sourceUrl, chunkIndex } = result.document;

      // Get graph-linked entities for this chunk
      const entities = await getEntitiesForChunk(id);

      // Rerank using graph entity match
      const entityScore = getEntityMatchScore(entities, keywords);
      const finalScore = result.score + entityScore * 0.1;

      matches.push({
        id,
        score: result.score,
        entityScore,
        finalScore,
        content,
        sourceUrl,
        chunkIndex,
        entities,
      });
    }

    // Debug logs for dev
    // console.log("QUERY:", query);
    // console.log("KEYWORDS:", keywords);
    // console.log(
    //   "RANKED:",
    //   matches.map((m) => ({
    //     id: m.id,
    //     score: m.score,
    //     entityScore: m.entityScore,
    //     finalScore: m.finalScore,
    //   }))
    // );

    return NextResponse.json({ success: true, matches: matches });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
