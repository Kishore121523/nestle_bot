// Run using - npx ts-node -P tsconfig.script.json scripts/extractAllEntities.ts

import fs from "fs/promises";
import { SearchClient, AzureKeyCredential } from "@azure/search-documents";
import { extractEntitiesFromText } from "../lib/graph/extractEntities";
import "dotenv/config";

const AZURE_SEARCH_ENDPOINT = process.env.AZURE_SEARCH_ENDPOINT!;
const AZURE_SEARCH_KEY = process.env.AZURE_SEARCH_KEY!;
const AZURE_SEARCH_INDEX = process.env.AZURE_SEARCH_INDEX!;
const OUTPUT_FILE = "./scripts/nestle_extracted_entities.json";

type ChunkDocument = {
  id: string;
  content: string;
  sourceUrl?: string;
  chunkIndex?: string;
  scrapedAt?: string;
};

type EntityResult = {
  id: string;
  entities: unknown;
};

const BATCH_SIZE = 5;

// This function fetches all chunks from Azure Search and downloads them into memory.
async function fetchAllChunks(): Promise<ChunkDocument[]> {
  const client = new SearchClient<ChunkDocument>(
    AZURE_SEARCH_ENDPOINT,
    AZURE_SEARCH_INDEX,
    new AzureKeyCredential(AZURE_SEARCH_KEY)
  );

  const results: ChunkDocument[] = [];

  // Fetch all chunks from Azure Search and it will return a async iterable called results
  const searchResults = await client.search("*", {
    select: ["id", "content"],
    top: 300,
  });

  for await (const result of searchResults.results) {
    if (result.document?.id && result.document?.content) {
      results.push(result.document);
    }
  }

  return results;
}

async function main() {
  console.log("Fetching all chunks from Azure Search");
  const chunks = await fetchAllChunks();
  console.log(`Loaded ${chunks.length} chunks`); // 293 chunks

  const output: EntityResult[] = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}...`);

    const promises = batch.map((chunk) =>
      extractEntitiesFromText(chunk.content).then((entities) => ({
        id: chunk.id,
        entities,
      }))
    );

    const results = await Promise.allSettled(promises);

    for (const result of results) {
      if (result.status === "fulfilled") {
        output.push(result.value);
        console.log(`Extracted for ID: ${result.value.id}`);
      } else {
        console.error("Entity extraction failed:", result.reason);
      }
    }

    // Add a delay to avoid hitting the rate limit (since I am in a free trial)
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Save the output to a file
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`Saved all extracted entities to ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error("Script failed:", err);
});
