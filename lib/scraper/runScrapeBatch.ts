import pLimit from "p-limit";
import { crawlAndScrapePage } from "./crawl";

// Function to scrape a batch of internal link URLs concurrently
export async function runScrapeBatch(urls: string[], concurrency = 3) {
  // Limiting the number of concurrent requests
  const limit = pLimit(concurrency);

  // Function to crawl and scrape a page
  const crawlPromises = urls.map((url) => limit(() => crawlAndScrapePage(url)));

  const results = await Promise.allSettled(crawlPromises);

  const successful: unknown[] = [];
  const failed: { url: string; error: string }[] = [];

  // Separating successful and failed results
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      successful.push(result.value);
    } else {
      failed.push({ url: urls[i], error: result.reason.message || "Unknown" });
    }
  });

  return { successful, failed };
}
