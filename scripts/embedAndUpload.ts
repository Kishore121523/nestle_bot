import {
  uploadChunksWithEmbeddings,
  ChunkInput,
} from "../lib/embedding/uploadToSearch";
import "dotenv/config";

async function main() {
  console.log("Fetching scraped data...");

  const res = await fetch("http://localhost:3000/api/scrape");
  const data = await res.json();

  if (!data.success) {
    console.error("Failed to get scraped data:", data.error);
    return;
  }

  const allChunks: ChunkInput[] = [];

  // Home page
  if (data.textChunks && data.textChunks.length) {
    data.textChunks.forEach((chunk: string, i: number) => {
      allChunks.push({
        content: chunk,
        sourceUrl: "https://www.madewithnestle.ca",
        chunkIndex: i,
        scrapedAt: new Date().toISOString(),
      });
    });
  }

  // Subpages
  if (data.crawledPages && Array.isArray(data.crawledPages)) {
    for (const page of data.crawledPages) {
      if (page.chunks && page.chunks.length) {
        page.chunks.forEach((chunk: string, i: number) => {
          allChunks.push({
            content: chunk,
            sourceUrl: page.url,
            chunkIndex: i,
            scrapedAt: new Date().toISOString(),
          });
        });
      }
    }
  }

  console.log(`Total chunks to embed: ${allChunks.length}`);
  await uploadChunksWithEmbeddings(allChunks);
}

main().catch((err) => {
  console.error("Script failed:", err);
});
