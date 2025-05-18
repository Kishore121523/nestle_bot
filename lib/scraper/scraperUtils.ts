import { CheerioAPI } from "cheerio";
import { cleanAndChunkText } from "@/lib/utils";

export function extractChunks(
  $: CheerioAPI,
  scopeSelectors: string[],
  blacklistSelectors: string[]
): string[] {
  let $scope = $(scopeSelectors.join(",")).first();
  if (!$scope.length) {
    $scope = $("body");
  }

  // Remove unwanted elements
  blacklistSelectors.forEach((sel) => $scope.find(sel).remove());

  // Remove script and style tags
  const textContent: string[] = [];
  $scope.find("p, h1, h2, h3, h4, h5, h6, li, span").each((_, el) => {
    const raw = $(el).text().replace(/\s+/g, " ").trim();
    if (
      raw.length > 0 &&
      !raw.toLowerCase().includes("cookie") &&
      !raw.toLowerCase().includes("privacy") &&
      !raw.includes("{")
    ) {
      textContent.push(raw);
    }
  });

  return cleanAndChunkText(textContent);
}
