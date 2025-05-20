import { SearchClient, AzureKeyCredential } from "@azure/search-documents";
import { generateEmbedding } from "../embedding/embedding";
import { v4 as uuidv4 } from "uuid";

export interface NestleDocument {
  id: string;
  content: string;
  vector: number[];
  sourceUrl: string;
  chunkIndex: string;
  scrapedAt: string;
}

let searchClient: SearchClient<NestleDocument> | null = null;

function getSearchClient(): SearchClient<NestleDocument> {
  const endpoint = process.env.AZURE_SEARCH_ENDPOINT!;
  const indexName = process.env.AZURE_SEARCH_INDEX!;
  const apiKey = process.env.AZURE_SEARCH_KEY!;

  if (!endpoint || !indexName || !apiKey) {
    throw new Error("Missing Azure Search environment variables.");
  }

  if (!searchClient) {
    searchClient = new SearchClient<NestleDocument>(
      endpoint,
      indexName,
      new AzureKeyCredential(apiKey)
    );
  }

  return searchClient;
}

export type ChunkInput = {
  content: string;
  sourceUrl: string;
  chunkIndex: number;
  scrapedAt: string;
};

export async function uploadChunksWithEmbeddings(chunks: ChunkInput[]) {
  const client = getSearchClient();
  const docs: NestleDocument[] = [];

  for (const chunk of chunks) {
    try {
      const embedding = await generateEmbedding(chunk.content);

      docs.push({
        id: uuidv4(),
        content: chunk.content,
        vector: embedding,
        sourceUrl: String(chunk.sourceUrl),
        chunkIndex: String(chunk.chunkIndex ?? ""),
        scrapedAt: String(chunk.scrapedAt),
      });
    } catch (err) {
      console.error(`Failed to embed chunk from ${chunk.sourceUrl}:`, err);
    }
  }

  console.log(`Uploading ${docs.length} documents to Azure Search...`);
  const result = await client.uploadDocuments(docs);

  console.log(`Uploaded ${result.results.length} documents to Azure Search.`);
}
