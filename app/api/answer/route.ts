import { NextRequest, NextResponse } from "next/server";
import { AzureOpenAI } from "openai";
import "dotenv/config";

// Setup OpenAI
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

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid query" },
        { status: 400 }
      );
    }

    // Step 1: Call /api/search
    const searchRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/search`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, top: 5 }),
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

    // Step 2: Construct prompt
    const context = matches
      .map(
        (m: { content: string }, i: number) =>
          `Chunk ${i + 1}:\n${m.content.trim()}`
      )
      .join("\n\n");

    const prompt = `You are a helpful assistant answering questions based on information from the Nestlé Canada website.

      Context:
      ${context}

      Question:
      ${query}

      Answer in a clear, helpful way:`;

    // Step 3: Ask OpenAI
    const completion = await client.chat.completions.create({
      model: deployment,
      messages: [
        { role: "system", content: "You answer based on given context only." },
        { role: "user", content: prompt },
      ],
      max_completion_tokens: 100000,
    });

    const answer = completion.choices[0]?.message?.content?.trim();

    return NextResponse.json({ success: true, answer });
  } catch (err) {
    console.error("Answer generation error:", err);
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
