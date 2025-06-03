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
const apiVersion = process.env.AZURE_O3_MINI_API_VERSION!;
const deployment = process.env.AZURE_O3_MINI_DEPLOYMENT_NAME!;

const client = new AzureOpenAI({
  endpoint,
  apiKey,
  apiVersion,
  deployment,
});

// FALLBACK if Regex fails - Classify intent via LLM if uncertain
async function classifyIntentWithLLM(query: string): Promise<"store" | "info"> {
  const completion = await client.chat.completions.create({
    model: deployment,
    messages: [
      {
        role: "system",
        content: `You are a classification system that determines the user's intent.

          Classify the user's query strictly into one of these categories:
          - 'store': if the user wants to find or buy a product in a physical or online store
          - 'info': if the user is asking for product details, ingredients, nutrition, or general knowledge

          Respond with exactly one word: "store" or "info".

          Examples:
          "Where can I buy KitKat?" → store  
          "How many calories in KitKat?" → info  
          "Nearby stores that sell Smarties" → store  
          "What is in a Coffee Crisp?" → info  
          "Find a place to purchase Aero" → store  
          "Is Boost good for kids?" → info`,
      },
      { role: "user", content: `Query: "${query}"` },
    ],
    max_completion_tokens: 10000,
  });

  return completion.choices[0]?.message?.content
    ?.toLowerCase()
    .includes("store")
    ? "store"
    : "info";
}

export async function POST(req: NextRequest) {
  try {
    const { query, lat, lng } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid query" },
        { status: 400 }
      );
    }

    // Check for store intent and product keywords
    const lowered = query.toLowerCase();
    const storeRegex =
      /\b(\ where (can i|do i)? (buy|get|purchase|find|shop for)|\ find (a|the)? (store|place) (to )?(buy|get|shop)|\ buy|purchase|shop for|\ get (from|nearby|at)|\ store (near me|close by|nearby)|\ places? (to )?(buy|get)\ )\b/;

    let intent: "store" | "info" = "info";

    if (storeRegex.test(lowered)) {
      intent = "store";
    } else {
      intent = await classifyIntentWithLLM(query); // Go to LLM classification if regex misses
      // console.log(intent, "intent classified by LLM");
    }

    // If intent is "store", we need lat/lng
    if (intent === "store") {
      const storeRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/stores`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            lat,
            lng,
            radiusKm: 10,
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

    // GraphRAG fallback if the intent is not "info"
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
      max_completion_tokens: 20000,
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

/*  LangChain is significantly slower than direct API calls. Add commentMore actions
    Useful for complex chains, but may add latency for simpler tasks.
    Response time comparison:
    LangChain-based method:
        POST /api/search  → 200 OK in 2528ms
        POST /api/answer  → 200 OK in 82068ms
      Low-level API method:
        POST /api/search  → 200 OK in 2580ms
        POST /api/answer  → 200 OK in 17736ms
*/

// /* eslint-disable @typescript-eslint/no-explicit-any */
// import { NextRequest, NextResponse } from "next/server";
// import { llm, nestlePrompt } from "@/lib/langchain";
// import { RunnableSequence } from "@langchain/core/runnables";

// export const dynamic = "force-dynamic";

// const answerChain = RunnableSequence.from([
//   async (input: { query: string; context: string }) => ({
//     question: input.query,
//     context: input.context,
//   }),
//   nestlePrompt,
//   llm,
// ]);

// export async function POST(req: NextRequest) {
//   try {
//     const { query } = await req.json();

//     if (!query || typeof query !== "string") {
//       return NextResponse.json({ error: "Invalid query" }, { status: 400 });
//     }

//     // Step 1: Call /api/search
//     const searchRes = await fetch(
//       `${process.env.NEXT_PUBLIC_BASE_URL}/api/search`,
//       {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ query, top: 3 }),
//       }
//     );

//     const { matches } = await searchRes.json();

//     if (!matches || matches.length === 0) {
//       return NextResponse.json({
//         success: true,
//         answer: "Sorry, I couldn't find any relevant information.",
//       });
//     }

//     // Step 2: Build context
//     const contextLines = matches
//       .map((m: any, i: number) =>
//         typeof m.content === "string" ? `Chunk ${i + 1}:\n${m.content}` : null
//       )
//       .filter(Boolean)
//       .join("\n\n");

//     // Step 3: Run LangChain LLM chain
//     const result = await answerChain.invoke({ query, context: contextLines });
//     const answer = typeof result === "string" ? result : result.content;

//     return NextResponse.json({
//       success: true,
//       answer,
//       sources: matches.map((m: any) => ({
//         id: m.id,
//         sourceUrl: m.sourceUrl,
//         chunkIndex: m.chunkIndex,
//         entities: m.entities,
//         score: m.score,
//       })),
//     });
//   } catch (err) {
//     return NextResponse.json(
//       { success: false, error: (err as Error).message },
//       { status: 500 }
//     );
//   }
// }
