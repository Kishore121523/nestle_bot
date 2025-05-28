import { AzureOpenAI } from "openai";

let openai: AzureOpenAI | null = null;

// This function generates an embedding for a given input string using Azure OpenAI's ada-002 model.
export async function generateEmbedding(input: string): Promise<number[]> {
  if (!openai) {
    openai = new AzureOpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY!,
      endpoint: process.env.AZURE_OPENAI_API_BASE!,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION!,
    });
  }

  const res = await openai.embeddings.create({
    model: process.env.AZURE_OPENAI_EMBEDDING_MODEL || "text-embedding-ada-002",
    input,
  });

  return res.data[0].embedding;
}
