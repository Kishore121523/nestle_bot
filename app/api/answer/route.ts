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

// Classify intent via LLM - makes it more robust and reliable
async function classifyIntentWithLLM(query: string): Promise<"store" | "info"> {
  const completion = await client.chat.completions.create({
    model: deployment,
    messages: [
      {
        role: "system",
        content: `You are an intent classification system that only responds with one word: **"store"** or **"info"**. Your job is to determine if the user's query is about:

          - **store** → The user wants to find, buy, shop, or locate a product in a **physical or online store**.
          - **info** → The user is asking about **ingredients, nutrition, benefits, usage, product type, flavors, dietary info, or general product details**.

          ### Instructions:
          - Think step-by-step and be strict: pick only **one** of the two categories.
          - Ignore vague phrases unless they clearly imply **buying** or **shopping** intent.
          - If the query compares or describes a product, it's **info**.
          - If the query mentions where, how, or places to get a product, it's **store**.
          - Never answer with anything except **"store"** or **"info"**.

          ### Examples:
          - "Where can I buy KitKat?" → store  
          - "What are the ingredients in KitKat?" → info  
          - "Nearby stores that sell Smarties" → store  
          - "How many calories in Aero bar?" → info  
          - "Find a place to purchase Coffee Crisp" → store  
          - "Is Boost good for children?" → info  
          - "What flavors does Nescafé have?" → info  
          - "Can I get Smarties in Calgary?" → store  
          - "What is in a Coffee Crisp?" → info  
          - "Does KitKat contain nuts?" → info  
          - "Shop for Haagen-Dazs near me" → store  
          - "How to use Carnation condensed milk?" → info  
          - "Where is Nestlé Pure Life sold?" → store

          Classify this query:
          Query: "${query}"

          Respond with only: **store** or **info**
          `,
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

    const lowered = query.toLowerCase();

    // Strict check
    const storeRegex =
      /\b((where|nearby)\s+(can i|do i)?\s*(buy|get|purchase|find)\b|\b(find|shop)\s+(a|the)?\s*(store|place)\b|\bstore\s+(near me|nearby|closest|close by)\b|\bplaces?\s+to\s+(buy|get)\b)/;

    let intent: "store" | "info";

    // Start with LLM classifier
    intent = await classifyIntentWithLLM(query);

    // Fallback to make sure LLM is right
    const isLikelyStore = storeRegex.test(lowered);

    if (intent === "info" && isLikelyStore) {
      console.log(
        "LLM says info, but regex is very confident about store intent. Overriding."
      );
      intent = "store";
    }

    // "Store" intent branch - Calls stores API
    if (intent === "store") {
      const storeRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/stores`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, lat, lng, radiusKm: 10 }),
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

    // "Info" intent branch - Calls search API
    const searchRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/search`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, top: 3 }),
      }
    );

    const searchJson = await searchRes.json();

    // Count-based response
    if (searchJson.type === "count") {
      return NextResponse.json({
        success: true,
        answer: `**Product Count Result**\n\n${searchJson.message}`,
      });
    }

    const matches: Match[] = searchJson.matches;

    if (!matches || matches.length === 0) {
      return NextResponse.json({
        success: true,
        answer:
          "Sorry, I couldn't find any relevant information for your question.",
      });
    }

    const contextLines = matches
      .map((m, i) => `Chunk ${i + 1}:\n${m.content}`)
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
