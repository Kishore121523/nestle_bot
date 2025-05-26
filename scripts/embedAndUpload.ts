// scripts/embedAndUpload.ts
import fs from "fs/promises";
import path from "path";
import {
  uploadChunksWithEmbeddings,
  ChunkInput,
} from "../lib/embedding/uploadToSearch";
import "dotenv/config";

const INPUT_PATH = path.join(__dirname, "filteredOutput.json");

interface ScrapedData {
  success: boolean;
  textChunks?: string[];
  crawledPages?: { url: string; chunks: string[] }[];
}

async function main() {
  console.log("Reading scraped content from file...");

  const raw = await fs.readFile(INPUT_PATH, "utf-8");
  const data: ScrapedData = JSON.parse(raw);

  if (!data.success) {
    console.error("Invalid scraped file: success=false");
    return;
  }

  const allChunks: ChunkInput[] = [];

  data.textChunks?.forEach((chunk, i) => {
    allChunks.push({
      content: chunk,
      sourceUrl: "https://www.madewithnestle.ca",
      chunkIndex: i,
      scrapedAt: new Date().toISOString(),
    });
  });

  data.crawledPages?.forEach((page) => {
    page.chunks?.forEach((chunk, i) => {
      allChunks.push({
        content: chunk,
        sourceUrl: page.url,
        chunkIndex: i,
        scrapedAt: new Date().toISOString(),
      });
    });
  });

  console.log(`Total chunks to upload: ${allChunks.length}`);
  await uploadChunksWithEmbeddings(allChunks);
}

main().catch((err) => {
  console.error("Script failed:", err);
});
