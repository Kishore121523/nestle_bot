import { chromium } from "playwright";
import * as cheerio from "cheerio";
import { cleanAndChunkText } from "@/lib/utils";

// Function to scrape a single page
export async function crawlAndScrapePage(url: string) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  await context.addCookies([
    {
      name: "OptanonConsent",
      value: "your-extracted-value",
      domain: ".madewithnestle.ca",
      path: "/",
      httpOnly: false,
      secure: true,
      sameSite: "Lax",
    },
  ]);

  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    const html = await page.content();
    const $ = cheerio.load(html);

    // 1. Scope scraping only to visible content areas
    const $scope = $(
      "main, article, section, .container, .content, .wrapper"
    ).first();

    // 2. Remove common non-content elements
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

    // 3. Extract visible meaningful text
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

    const textChunks = cleanAndChunkText(textContent);

    await browser.close();

    return {
      url,
      chunks: textChunks,
    };
  } catch (error) {
    await browser.close();
    return {
      url,
      chunks: [],
      error: (error as Error).message,
    };
  }
}
