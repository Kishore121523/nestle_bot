import { NextResponse } from "next/server";
import { chromium } from "playwright";
import * as cheerio from "cheerio";
import { cleanAndChunkText } from "@/lib/utils";
import { runScrapeBatch } from "@/lib/scraper/runScrapeBatch";

// URL of the home page of nestlté.ca
const BASE_URL = "https://www.madewithnestle.ca";

export async function GET() {
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();

  try {
    await page.goto(BASE_URL, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.waitForSelector("body", { timeout: 10000 });

    const html = await page.content();
    const $ = cheerio.load(html);

    // Defining the scope of scraping to visible content areas
    const $scope = $(
      "main, article, section, .container, .content, .wrapper"
    ).first();

    // Remove common non-content elements
    const blacklist = [
      "style",
      "script",
      "noscript",
      "svg",
      "form",
      "input",
      "button",
      "footer",
      "header",
      '[class*="cookie"]',
      '[class*="footer"]',
      '[id*="cookie"]',
      '[id*="footer"]',
      '[class*="consent"]',
      '[class*="nav"]',
      '[class*="social"]',
    ];

    blacklist.forEach((sel) => $scope.find(sel).remove());

    // Extracting text content from the page
    const textContent: string[] = [];

    $scope.find("p, h1, h2, h3, h4, h5, h6, li, span").each((_, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();

      if (
        text.length > 0 &&
        !text.toLowerCase().includes("cookie") &&
        !text.toLowerCase().includes("privacy") &&
        !text.toLowerCase().includes("{") // skip CSS
      ) {
        textContent.push(text);
      }
    });

    // Extracting links from the page
    const links: { href: string; text: string }[] = [];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      const text = $(el).text().trim();
      if (href && text) links.push({ href, text });
    });

    // Extracting internal links from the home page and removing duplicates
    const internalLinks = Array.from(
      new Set(
        links
          .map((l) => (l.href.startsWith("/") ? BASE_URL + l.href : l.href))
          .filter(
            (url) =>
              url.startsWith(BASE_URL) &&
              !url.includes("/legal") &&
              !url.includes("/privacy")
          )
      )
    );

    // Extracting images from the page
    const images: { src: string; alt: string }[] = [];
    $("img[src]").each((_, el) => {
      const src = $(el).attr("src");
      const alt = $(el).attr("alt") || "";
      if (src) images.push({ src, alt });
    });

    // Cleaning and converting the text content into meaningful chunks
    const textChunks = cleanAndChunkText(textContent);

    // Crawling all internal links concurrently and scraping their content
    const { successful: crawledPages, failed: failedPages } =
      await runScrapeBatch(internalLinks, 3);

    await browser.close();

    return NextResponse.json({
      success: true,
      chunkCount: textChunks.length,
      textChunks,
      links,
      images,
      crawledPages,
      failedPages,
    });
  } catch (err) {
    await browser.close();
    return NextResponse.json({
      success: false,
      error: (err as Error).message || "Unknown error",
    });
  }
}
