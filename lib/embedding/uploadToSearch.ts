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

const BATCH_SIZE = 500;
const RETRY_LIMIT = 2;

async function uploadBatch(
  docs: NestleDocument[],
  batchIndex: number
): Promise<void> {
  const client = getSearchClient();
  console.log(`Uploading batch ${batchIndex} with ${docs.length} documents...`);
  try {
    const result = await client.uploadDocuments(docs);
    const failed = result.results.filter((r) => !r.succeeded);
    if (failed.length > 0) {
      console.warn(`Batch ${batchIndex} had ${failed.length} failed docs.`);
    } else {
      console.log(`Batch ${batchIndex} uploaded successfully.`);
    }
  } catch (err) {
    console.error(`Upload failed for batch ${batchIndex}:`, err);
    throw err;
  }
}

export async function uploadChunksWithEmbeddings(chunks: ChunkInput[]) {
  const allDocs: NestleDocument[] = [];

  for (const chunk of chunks) {
    try {
      const embedding = await generateEmbedding(chunk.content);
      allDocs.push({
        id: uuidv4(),
        content: chunk.content,
        vector: embedding,
        sourceUrl: String(chunk.sourceUrl),
        chunkIndex: String(chunk.chunkIndex),
        scrapedAt: String(chunk.scrapedAt),
      });
    } catch (err) {
      console.error(`Failed to embed chunk from ${chunk.sourceUrl}:`, err);
    }
  }

  console.log(`Prepared ${allDocs.length} documents for Azure upload.`);

  const batches: NestleDocument[][] = [];
  for (let i = 0; i < allDocs.length; i += BATCH_SIZE) {
    batches.push(allDocs.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < batches.length; i++) {
    let attempt = 0;
    while (attempt <= RETRY_LIMIT) {
      try {
        await uploadBatch(batches[i], i + 1);
        break;
      } catch {
        attempt++;
        if (attempt > RETRY_LIMIT) {
          console.error(
            `Batch ${i + 1} failed after ${RETRY_LIMIT + 1} attempts.`
          );
        } else {
          console.log(`Retrying batch ${i + 1} (attempt ${attempt + 1})...`);
          await new Promise((res) => setTimeout(res, 1000));
        }
      }
    }
  }

  console.log("All uploads completed.");
}
