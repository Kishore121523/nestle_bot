import { NextRequest, NextResponse } from "next/server";
import { SearchClient, AzureKeyCredential } from "@azure/search-documents";
import { OpenAI } from "openai";
import { NestleDocument } from "@/lib/embedding/uploadToSearch";

// Setup client
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

const searchClient = new SearchClient<NestleDocument>(
  process.env.AZURE_SEARCH_ENDPOINT!,
  process.env.AZURE_SEARCH_INDEX!,
  new AzureKeyCredential(process.env.AZURE_SEARCH_KEY!)
);

export async function POST(req: NextRequest) {
  try {
    const { query, top = 5 } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid query" },
        { status: 400 }
      );
    }

    // Get embedding for query
    const embeddingResponse = await openai.embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL!,
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Perform (vector + keyword) search in our Azure Search index
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matches: any[] = [];
    for await (const result of results.results) {
      matches.push({
        id: result.document.id,
        score: result.score,
        content: result.document.content,
        sourceUrl: result.document.sourceUrl,
        chunkIndex: result.document.chunkIndex,
      });
    }

    return NextResponse.json({ success: true, matches });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
