/*
 * GRAPH-RAG: Answer Generation API

  1. Accepts a query from user.
  2. Calls the GraphRAG-based `/api/search` endpoint to retrieve top relevant chunks.
  3. Constructs a contextual prompt using those chunks.
  4. Uses Azure OpenAI o3-mini to generate a natural language answer grounded in the context.
*/

import { NextRequest, NextResponse } from "next/server";
import { AzureOpenAI } from "openai";
import "dotenv/config";

// Configure Azure OpenAI client
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

    // Retrieve top-k context chunks using GraphRAG search
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

    // Build context from retrieved chunks
    const contextLines: string[] = [];

    for (let i = 0; i < matches.length; i++) {
      const content = matches[i].content;
      if (typeof content === "string") {
        contextLines.push(`Chunk ${i + 1}:\n${content}`);
      }
    }

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

    // Send prompt to o3-mini and generate response
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
      sources: matches.map(
        (m: {
          id: string;
          sourceUrl: string;
          chunkIndex: number;
          entities: string[];
          score: number;
          content: string;
        }) => ({
          id: m.id,
          sourceUrl: m.sourceUrl,
          chunkIndex: m.chunkIndex,
          entities: m.entities,
          score: m.score,
        })
      ),
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
