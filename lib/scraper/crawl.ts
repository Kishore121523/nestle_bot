import { chromium } from "playwright";
import * as cheerio from "cheerio";
import { extractChunks } from "@/lib/scraper/scraperUtils";

export async function crawlAndScrapePage(url: string) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  // Set a custom user agent to avoid bot detection
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2000);

    const html = await page.content();
    const $ = cheerio.load(html);

    const pageChunks = extractChunks(
      $,
      ["main", "article", "section", ".container", ".content", ".wrapper"],
      [
        "style",
        "script",
        "noscript",
        "svg",
        "form",
        "input",
        "button",
        "footer",
        "header",
        "[class*='cookie']",
        "[class*='footer']",
        "[id*='cookie']",
        "[id*='footer']",
        "[class*='consent']",
        "[class*='nav']",
        "[class*='social']",
      ]
    );

    await browser.close();
    return { url, chunks: pageChunks };
  } catch (error) {
    await browser.close();
    return { url, chunks: [], error: (error as Error).message };
  }
}
