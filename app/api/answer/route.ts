import { productKeywords } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { AzureOpenAI } from "openai";

export const dynamic = "force-dynamic";

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
  sourceUrl: string;
  chunkIndex: number;
  entities: string[];
  score: number;
  content: string;
};

const endpoint = process.env.AZURE_O3_MINI_ENDPOINT!;
const apiKey = process.env.AZURE_O3_MINI_KEY!;
const apiVersion = process.env.AZURE_O3_MINI_API_VERSION! || "2023-05-15";
const deployment = process.env.AZURE_O3_MINI_DEPLOYMENT_NAME!;

const client = new AzureOpenAI({
  endpoint,
  apiKey,
  apiVersion,
  deployment,
});

export async function POST(req: NextRequest) {
  try {
    const { query, lat, lng } = await req.json();
    console.log("QUERY:", query);

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid query" },
        { status: 400 }
      );
    }

    // Check for store intent and product keywords
    const lowered = query.toLowerCase();
    const storeIntent =
      /\b(where|buy|get|purchase|shop|store|near me|closest)\b/.test(lowered);
    const matchedProduct = productKeywords.find((p) =>
      lowered.includes(p.toLowerCase())
    );

    const cityMatch = query.match(/\bin\s+([a-zA-Z\s]+)$/);
    const city = cityMatch?.[1]?.trim();
    const hasGeo = typeof lat === "number" && typeof lng === "number";

    if (storeIntent && matchedProduct && (hasGeo || city)) {
      const storeRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/stores`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product: matchedProduct,
            ...(hasGeo ? { lat, lng, radius: 20 } : {}),
            ...(city ? { city } : {}),
          }),
        }
      );

      if (!storeRes.ok) {
        console.error("Store fetch failed:", await storeRes.text());
        return NextResponse.json(
          { success: false, error: "Failed to fetch store data" },
          { status: 500 }
        );
      }

      const storeData = await storeRes.json();

      if (!storeData?.stores?.length) {
        return NextResponse.json({
          success: true,
          answer:
            "I couldn’t find any stores near you selling that product. Try searching again later or expand your search radius.",
        });
      }

      const answer =
        `Here are some nearby stores where you can find **${matchedProduct}**:\n\n` +
        storeData.stores
          .map((s: Store, i: number) => {
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
              `**${i + 1}. ${s.name}**  \n` +
              `${s.city}  \n` +
              `*Distance*: ${
                typeof s.distance === "number"
                  ? `${s.distance.toFixed(1)} km`
                  : "N/A"
              }  \n` +
              `*Item Name*: ${productsFormatted}`
            );
          })
          .join("\n\n");

      return NextResponse.json({ success: true, answer });
    }

    // GraphRAG fallback if there is no store intent or product match or lat/lng
    const searchRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/search`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, top: 3 }),
      }
    );

    const { matches } = await searchRes.json();

    if (!matches || matches.length === 0) {
      return NextResponse.json({
        success: true,
        answer:
          "Sorry, I couldn't find any relevant information for your question.",
      });
    }

    const contextLines = matches
      .map((m: Match, i: number) =>
        typeof m.content === "string" ? `Chunk ${i + 1}:\n${m.content}` : null
      )
      .filter(Boolean);

    const context = contextLines.join("\n\n");

    const prompt = `You are a helpful assistant that answers questions using only the provided context from the Nestlé Canada website.

    Your response must follow this strict formatting in **Markdown**:

    - Start with a clear, short introductory paragraph.
    - Use **numbered or bulleted lists** where relevant.
    - Each list item should have:
      - A **bolded title** (e.g., product name, recipe, or concept)
      - A new line with its short description underneath.
    - For instructions, nutrition facts, or extra details, use a italic font one- or two-word sub-heading like **Tips**, **Instructions**, or **Nutrition**, followed by ':' and write the content after that.
    - Add line breaks ('\n\n') between items and sections for clarity.
    - End with a summary or call-to-action if appropriate.
    - Do NOT add external or unrelated content.

    Context:
    ${context}

    Question:
    ${query}

    Respond in clean Markdown with clear paragraph spacing.
    `;

    const completion = await client.chat.completions.create({
      model: deployment,
      messages: [
        { role: "system", content: "You answer based on given context." },
        { role: "user", content: prompt },
      ],
      max_completion_tokens: 15000,
    });

    const answer = completion.choices[0]?.message?.content?.trim() ?? "";

    return NextResponse.json({
      success: true,
      answer,
      sources: matches.map((m: Match) => ({
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
