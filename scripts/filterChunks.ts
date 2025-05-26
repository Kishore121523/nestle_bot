import fs from "fs/promises";
import path from "path";

const INPUT_PATH = path.join(__dirname, "scrapedOutput.json");
const OUTPUT_PATH = path.join(__dirname, "filteredOutput.json");

const MIN_LENGTH = 10;
const MAX_LENGTH = 1000;
const MAX_CHUNKS = 2450;

const NOISY_PATTERNS = [
  /contest/i,
  /enter to win/i,
  /follow us/i,
  /terms-and-conditions/i,
  /promotion/i,
  /facebook\.com/i,
  /instagram\.com/i,
  /#|@/,
];

const isNoisy = (chunk: string) => NOISY_PATTERNS.some((re) => re.test(chunk));

type ScrapedData = {
  success: boolean;
  chunkCount?: number;
  textChunks?: string[];
  links?: { href: string; text: string }[];
  images?: { src: string; alt: string }[];
  crawledPages?: { url: string; chunks: string[] }[];
  failedPages?: { url: string; error: string }[];
};

async function main() {
  const raw = await fs.readFile(INPUT_PATH, "utf-8");
  const original: ScrapedData = JSON.parse(raw);

  if (!original.success) {
    console.error("Input file not marked as success.");
    return;
  }

  const seen = new Set<string>();

  const filteredTextChunks =
    original.textChunks?.filter((chunk) => {
      const norm = chunk.trim().replace(/\s+/g, " ");
      const isValid =
        norm.length >= MIN_LENGTH &&
        norm.length <= MAX_LENGTH &&
        !seen.has(norm) &&
        !isNoisy(norm);
      if (isValid) seen.add(norm);
      return isValid;
    }) ?? [];

  const filteredCrawledPages =
    original.crawledPages
      ?.map((page) => {
        const filteredChunks = page.chunks.filter((chunk) => {
          const norm = chunk.trim().replace(/\s+/g, " ");
          const isValid =
            norm.length >= MIN_LENGTH &&
            norm.length <= MAX_LENGTH &&
            !seen.has(norm) &&
            !isNoisy(norm);
          if (isValid) seen.add(norm);
          return isValid;
        });

        return {
          url: page.url,
          chunks: filteredChunks,
        };
      })
      .filter((p) => p.chunks.length > 0) ?? [];

  // Truncate to MAX_CHUNKS without flattening
  let remaining = MAX_CHUNKS;
  const truncatedTextChunks = filteredTextChunks.slice(0, remaining);
  remaining -= truncatedTextChunks.length;

  const truncatedCrawledPages = [];
  for (const page of filteredCrawledPages) {
    if (remaining <= 0) break;
    const limitedChunks = page.chunks.slice(0, remaining);
    if (limitedChunks.length > 0) {
      truncatedCrawledPages.push({
        url: page.url,
        chunks: limitedChunks,
      });
      remaining -= limitedChunks.length;
    }
  }

  const totalChunkCount =
    truncatedTextChunks.length +
    truncatedCrawledPages.reduce((acc, p) => acc + p.chunks.length, 0);

  const output: ScrapedData = {
    success: true,
    chunkCount: totalChunkCount,
    textChunks: truncatedTextChunks,
    links: original.links,
    images: original.images,
    crawledPages: truncatedCrawledPages,
    failedPages: original.failedPages ?? [],
  };

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Filtered output saved to ${OUTPUT_PATH}`);
  console.log(`Total chunks: ${totalChunkCount}`);
}

main().catch((err) => {
  console.error("Script failed:", err);
});
