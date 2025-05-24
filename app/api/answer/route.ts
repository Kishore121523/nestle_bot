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
import { autoFormat } from "@/lib/utils";

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

    // Build context from retrieved chunks
    const context = matches
      .map(
        (m: { content: string }, i: number) =>
          `Chunk ${i + 1}:\n${m.content.trim()}`
      )
      .join("\n\n");

    const prompt = `You are a helpful assistant answering questions based on information from the Nestlé Canada website. Also, Answer in well-structured, readable paragraphs. Use bullet points, headings, or line breaks for lists and recipes when appropriate.


    Context:
    ${context}

    Question:
    ${query}

    Answer in a clear, helpful way:`;

    // Send prompt to o3-mini and generate response
    const completion = await client.chat.completions.create({
      model: deployment,
      messages: [
        { role: "system", content: "You answer based on given context only." },
        { role: "user", content: prompt },
      ],
      max_completion_tokens: 100000,
    });

    const answer = autoFormat(completion.choices[0]?.message?.content?.trim());

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
    console.error("Answer generation error:", err);
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
