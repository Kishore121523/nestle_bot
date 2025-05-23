import { NextRequest, NextResponse } from "next/server";
import { SearchClient, AzureKeyCredential } from "@azure/search-documents";
import { OpenAI } from "openai";
import { NestleDocument } from "@/lib/embedding/uploadToSearch";
import { getEntitiesForChunk } from "@/lib/graph/getEntitiesForChunk";
import { stopwords } from "@/lib/utils";

// Setup OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  baseURL: process.env.OPENAI_API_BASE!,
  defaultHeaders: {
    "api-key": process.env.OPENAI_API_KEY!,
  },
  defaultQuery: {
    "api-version": process.env.OPENAI_API_VERSION!,
  },
});

// Azure Search client
const searchClient = new SearchClient<NestleDocument>(
  process.env.AZURE_SEARCH_ENDPOINT!,
  process.env.AZURE_SEARCH_INDEX!,
  new AzureKeyCredential(process.env.AZURE_SEARCH_KEY!)
);

// Keyword overlap scoring
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

// Expand static synonyms
function expandKeywords(keywords: string[]): string[] {
  const synonymMap: Record<string, string[]> = {
    kids: ["children", "youth", "toddlers"],
    drink: ["beverage", "shake", "smoothie"],
    healthy: ["nutritious", "balanced", "immune"],
    mother: ["mom", "parent", "maternity", "prenatal"],
  };

  const expanded = new Set(keywords);
  for (const word of keywords) {
    const synonyms = synonymMap[word];
    if (synonyms) {
      for (const alt of synonyms) expanded.add(alt);
    }
  }
  return Array.from(expanded);
}

// Helper to remove junk results
function isCleanSourceUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return !lower.includes("/search") && !lower.includes("page=");
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

    const baseKeywords = query
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 2 && !stopwords.has(w));

    const keywords = expandKeywords(baseKeywords);

    // Step 2: Generate embedding
    const embeddingResponse = await openai.embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL!,
      input: query,
    });

    if (!embeddingResponse?.data?.[0]?.embedding) {
      throw new Error("Failed to fetch embedding from OpenAI.");
    }

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Step 3: Hybrid search (no filter here — we'll clean manually)
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

    // Step 4: Enrich with entities and rerank
    const matches = [];

    for await (const result of results.results) {
      const { id, content, sourceUrl, chunkIndex } = result.document;
      const entities = await getEntitiesForChunk(id);
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

    // Step 5: Filter out junk sourceUrls + low scores
    const filtered = matches.filter(
      (m) => isCleanSourceUrl(m.sourceUrl) && m.finalScore >= 0.1
    );

    const dropped = matches.length - filtered.length;

    // Logging
    console.log("QUERY:", query);
    console.log("KEYWORDS:", keywords);
    console.log("DROPPED:", dropped);
    console.log(
      "RANKED:",
      filtered.map((m) => ({
        id: m.id,
        score: m.score,
        entityScore: m.entityScore,
        finalScore: m.finalScore,
      }))
    );

    return NextResponse.json({ success: true, matches: filtered });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
