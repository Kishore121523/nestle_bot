import { OpenAI } from "openai";

let openai: OpenAI | null = null;

// This function generates an embedding for a given input string using OpenAI's ada-002 model.
export async function generateEmbedding(input: string): Promise<number[]> {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
      baseURL: process.env.OPENAI_API_BASE!,
      defaultHeaders: {
        "api-key": process.env.OPENAI_API_KEY!,
      },
      defaultQuery: {
        "api-version": process.env.OPENAI_API_VERSION!,
      },
    });
  }

  const res = await openai.embeddings.create({
    model: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-ada-002",
    input,
  });

  return res.data[0].embedding;
}
