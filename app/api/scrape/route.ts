import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { chromium } from "playwright";
import { runScrapeBatch } from "@/lib/scraper/runScrapeBatch";
import { extractChunks } from "@/lib/scraper/scraperUtils";

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

    // Extract chunks from homepage
    const homepageChunks = extractChunks(
      $,
      ["main", "article", "section", ".container", ".content", ".wrapper"],
      [
        "[id*='cookie']",
        "[class*='cookie']",
        "[class*='consent']",
        "[class*='privacy']",
        "[class*='footer']",
        "[id*='footer']",
      ]
    );

    // Collect links
    const links: { href: string; text: string }[] = [];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      const text = $(el).text().trim();
      if (href && text) links.push({ href, text });
    });

    // Filter internal links
    const internalLinks = Array.from(
      new Set(
        links
          .map((l) => (l.href.startsWith("/") ? BASE_URL + l.href : l.href))
          .filter(
            (url) => url.startsWith(BASE_URL) && !/\/legal|\/privacy/.test(url)
          )
      )
    );

    // Collect images
    const images: { src: string; alt: string }[] = [];
    $("img[src]").each((_, el) => {
      const src = $(el).attr("src");
      const alt = $(el).attr("alt") || "";
      if (src) images.push({ src, alt });
    });

    // Crawl sub-pages
    const { successful: crawledPages, failed: failedPages } =
      await runScrapeBatch(internalLinks, 3);

    await browser.close();

    return NextResponse.json({
      success: true,
      chunkCount: homepageChunks.length,
      textChunks: homepageChunks,
      links,
      images,
      crawledPages,
      failedPages,
    });
  } catch (err) {
    await browser.close();
    return NextResponse.json({ success: false, error: (err as Error).message });
  }
}
