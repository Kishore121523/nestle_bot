import pLimit from "p-limit";
import { crawlAndScrapePage } from "./crawl";

export async function runScrapeBatch(urls: string[], concurrency = 3) {
  const limit = pLimit(concurrency);
  const crawlPromises = urls.map((url) => limit(() => crawlAndScrapePage(url)));
  const results = await Promise.allSettled(crawlPromises);

  const successful: unknown[] = [];
  const failed: { url: string; error: string }[] = [];

  // Separate successful and failed results
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      successful.push((result as PromiseFulfilledResult<unknown>).value);
    } else {
      failed.push({
        url: urls[i],
        error: (result as PromiseRejectedResult).reason.message || "Unknown",
      });
    }
  });

  return { successful, failed };
}
