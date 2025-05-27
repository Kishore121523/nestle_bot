import pLimit from "p-limit";
import { crawlAndScrapePage } from "./crawl";

export async function runScrapeBatch(
  startUrls: string[],
  concurrency: number,
  maxDepth: number
) {
  const visited = new Set(startUrls);
  const queue: { url: string; depth: number }[] = startUrls.map((url) => ({
    url,
    depth: 0,
  }));
  const limit = pLimit(concurrency);
  const results: { url: string; chunks: string[] }[] = [];
  const failed: { url: string; error: string }[] = [];

  console.log("Starting crawl");
  const start = Date.now();

  while (queue.length > 0) {
    const batch = queue.splice(0, concurrency);

    console.log(
      `\nCrawling batch of ${batch.length} URLs at depth ${
        batch[0]?.depth ?? "?"
      }...`
    );

    // Create promises for each URL in the batch with concurrency limit
    const crawlPromises = batch.map(({ url }) =>
      limit(() => crawlAndScrapePage(url))
    );

    const batchResults = await Promise.allSettled(crawlPromises);

    // Process results of the batch
    for (let i = 0; i < batchResults.length; i++) {
      const result = batchResults[i];
      const { url, depth } = batch[i];

      if (result.status === "fulfilled") {
        const { chunks, links } = result.value;

        // Check if the chunks are valid and not a 404 page
        const is404 =
          chunks.length === 1 &&
          chunks[0]
            .toLowerCase()
            .includes("404: the page you were looking for isn't here");

        if (chunks.length > 0 && !is404) {
          results.push({ url, chunks });
          console.log(`Success (${depth}): ${url}`);
        } else {
          const reason = is404 ? "404 page" : "empty chunk";
          console.log(`Skipped ${reason}: ${url}`);
        }

        // If we haven't reached the max depth, add new links to the queue
        if (depth < maxDepth && Array.isArray(links)) {
          for (const link of links) {
            if (!visited.has(link)) {
              visited.add(link);
              queue.push({ url: link, depth: depth + 1 });
            }
          }
        }
      } else {
        const errorMsg = result.reason?.message || "Unknown";
        console.warn(`Failed (${depth}): ${url} → ${errorMsg}`);
        failed.push({ url, error: errorMsg });
      }
    }
  }

  const end = Date.now();
  console.log(`Finished crawling in ${(end - start) / 1000}s`);
  console.log(`Total successful (non-empty): ${results.length}`);
  console.log(`Total failed: ${failed.length}`);
  console.log(`Total unique links discovered: ${visited.size}`);

  return { successful: results, failed };
}
