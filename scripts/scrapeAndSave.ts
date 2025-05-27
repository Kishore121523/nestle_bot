// Run using - npx ts-node -P tsconfig.script.json scripts/scrapeAndSave.ts

import axios from "axios";
import fs from "fs/promises";
import path from "path";
import "dotenv/config";

const SCRAPE_URL = `${process.env.NEXT_PUBLIC_BASE_URL}/api/scrape`;
const OUT_PATH = path.join(__dirname, "scrapedOutput.json");
const TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes timeout

async function main() {
  console.log(`Fetching scraped data (timeout: ${TIMEOUT_MS / 1000}s)...`);

  const response = await axios.get(SCRAPE_URL, { timeout: TIMEOUT_MS });

  if (!response.data?.success) {
    console.error("Scrape failed:", response.data?.error);
    return;
  }

  await fs.writeFile(OUT_PATH, JSON.stringify(response.data, null, 2));
  console.log(`Scraped content saved to ${OUT_PATH}`);
}

main().catch((err) => {
  console.error("Script error:", err.message || err);
});
