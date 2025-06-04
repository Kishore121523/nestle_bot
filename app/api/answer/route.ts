import {
  categoryRegex,
  classifyIntentPrompt,
  generateAnswerPrompt,
  storeRegex,
  totalRegex,
} from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { AzureOpenAI } from "openai";

export const dynamic = "force-dynamic";

// -------------------- Types --------------------
type IntentClassification = {
  mainIntent: "store" | "info";
  countIntent: "total" | "category" | "search";
};

type StoreProduct = {
  name: string;
  price: number;
};

type Store = {
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  distance: number;
  products: StoreProduct[];
};

type Match = {
  id: string;
  content: string;
  sourceUrl: string;
  chunkIndex: number;
  score: number;
  entities: Record<string, string[]>;
  entityScore: number;
  finalScore: number;
};

// -------------------- Azure OpenAI (o3 mini) Setup --------------------
const endpoint = process.env.AZURE_O3_MINI_ENDPOINT!;
const apiKey = process.env.AZURE_O3_MINI_KEY!;
const apiVersion = process.env.AZURE_O3_MINI_API_VERSION!;
const deployment = process.env.AZURE_O3_MINI_DEPLOYMENT_NAME!;

const client = new AzureOpenAI({
  endpoint,
  apiKey,
  apiVersion,
  deployment,
});

// -------------------- Intent Classification --------------------
async function classifyIntentWithLLM(
  query: string
): Promise<IntentClassification> {
  const completion = await client.chat.completions.create({
    model: deployment,
    messages: [
      {
        role: "system",
        content: classifyIntentPrompt(query),
      },
      { role: "user", content: `Query: "${query}"` },
    ],
    max_completion_tokens: 2048,
  });

  try {
    const content = completion.choices[0]?.message?.content?.trim() ?? "";
    console.log(content);
    const parsed = JSON.parse(content);

    if (
      parsed &&
      (parsed.mainIntent === "store" || parsed.mainIntent === "info") &&
      ["total", "category", "search"].includes(parsed.countIntent)
    ) {
      return parsed as IntentClassification;
    }

    throw new Error("Invalid response format");
  } catch (err) {
    console.error("Failed to parse intent JSON:", err);
    return { mainIntent: "info", countIntent: "search" };
  }
}

// -------------------- Main Handler --------------------
export async function POST(req: NextRequest) {
  try {
    const { query, lat, lng } = await req.json();
    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid query" },
        { status: 400 }
      );
    }

    const lowered = query.toLowerCase();

    // Get the intent of the user query
    const { mainIntent: rawMainIntent, countIntent: rawCountIntent } =
      await classifyIntentWithLLM(query);

    let mainIntent = rawMainIntent;
    let countIntent = rawCountIntent;

    // Regex-based confidence correction for count intent
    const isLikelyTotal = totalRegex.test(lowered);
    const isLikelyCategory = categoryRegex.test(lowered);

    // Fallback check with strict check using regex (for count)
    if (countIntent === "search" && (isLikelyTotal || isLikelyCategory)) {
      console.log(
        `LLM says search, but regex suggests ${
          isLikelyTotal ? "total" : "category"
        }. Overriding.`
      );
      countIntent = isLikelyTotal ? "total" : "category";
    }

    // -------------------- Count Intent --------------------
    if (countIntent === "total" || countIntent === "category") {
      const countRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/search`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, countIntent }),
        }
      );

      const countJson = await countRes.json();
      return NextResponse.json({
        success: true,
        answer: `**Product Count Result**\n\n${countJson.message}`,
      });
    }

    // -------------------- Store Intent --------------------
    const isLikelyStore = storeRegex.test(lowered);

    // Fallback check with strict check using regex (for store)
    if (mainIntent === "info" && isLikelyStore) {
      console.log(
        "LLM says info, but regex is very confident about store intent. Overriding."
      );
      mainIntent = "store";
    }

    if (mainIntent === "store") {
      const storeRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/stores`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, lat, lng, radiusKm: 30 }),
        }
      );

      if (!storeRes.ok) {
        const errorText = await storeRes.text();
        console.error("Store fetch failed:", errorText);
        return NextResponse.json(
          { success: false, error: errorText },
          { status: 500 }
        );
      }

      const storeData = await storeRes.json();
      if (!storeData?.stores?.length) {
        return NextResponse.json({
          success: true,
          answer:
            "Sorry, I couldn't find any nearby stores offering that product. Please try searching again with a specific product name.",
        });
      }

      const productName =
        storeData?.matchedProduct ??
        storeData.stores?.[0]?.products?.[0]?.name ??
        "this product";

      const capitalizedProductName =
        productName.charAt(0).toUpperCase() + productName.slice(1);

      let answer =
        `Here are some nearby stores where you can find **${capitalizedProductName}**:\n\n<span style="margin-bottom: 8px; display: block;"></span>\n\n` +
        storeData.stores
          .map((s: Store) => {
            const productsFormatted = Array.isArray(s.products)
              ? s.products
                  .map((p) =>
                    p.name && typeof p.price === "number"
                      ? `**${p.name}** – **$${p.price.toFixed(2)}**`
                      : null
                  )
                  .filter(Boolean)
                  .join(", ")
              : "No product details available";

            return (
              `**📍[${s.name} – ${
                s.city
              }](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                s.address
              )})**  \n` +
              `Item Name: ${productsFormatted} \n` +
              `\n Distance: ${
                typeof s.distance === "number"
                  ? `${s.distance.toFixed(1)} km`
                  : "N/A"
              }  \n\n---\n\n`
            );
          })
          .join("\n\n\n");

      const amazonUrl = `https://www.amazon.ca/s?k=${encodeURIComponent(
        `Nestle ${productName}`
      )}`;
      if (amazonUrl) {
        answer += `\n\n[[amazon-button|${productName}]]${amazonUrl}[[/amazon-button]]`;
      }

      return NextResponse.json({ success: true, answer });
    }

    // -------------------- Info Intent --------------------
    const searchRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/search`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, top: 5 }),
      }
    );

    const searchJson = await searchRes.json();
    let matches: Match[] = searchJson.matches;

    if (!matches || matches.length === 0) {
      return NextResponse.json({
        success: true,
        answer:
          "Sorry, I couldn't find any relevant information for your question.",
      });
    }

    matches = matches.sort((a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0));

    const context = matches
      .map((m, i) => `Chunk ${i + 1}:\n${m.content}`)
      .join("\n\n");

    const completion = await client.chat.completions.create({
      model: deployment,
      messages: [
        { role: "system", content: "You answer based on given context." },
        { role: "user", content: generateAnswerPrompt(context, query) },
      ],
      max_completion_tokens: 2048,
    });

    const answer = completion.choices[0]?.message?.content?.trim() ?? "";

    return NextResponse.json({
      success: true,
      answer,
      sources: matches.map((m) => ({
        id: m.id,
        sourceUrl: m.sourceUrl,
        chunkIndex: m.chunkIndex,
        entities: m.entities,
        score: m.score,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
