import { AzureOpenAI } from "openai";
import "dotenv/config";

export type ExtractedEntities = {
  products?: string[];
  categories?: string[];
  ingredients?: string[];
  topics?: string[];
};

// Azure o3-mini client
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

export async function extractEntitiesFromText(
  text: string
): Promise<ExtractedEntities | null> {
  try {
    const systemPrompt = `
    You are an entity extraction agent.
    From the given text, extract named entities relevant to the Nestlé website domain.
    Return a JSON object with keys like 'products', 'categories', 'ingredients', and 'topics'.

    Example output:
    {
      "products": ["BOOST Kids Essentials"],
      "categories": ["nutritional supplements"],
      "ingredients": ["protein", "fibre", "vitamins", "minerals"]
      "topics": ["nutrition", "health", "wellness"]
    }`;

    const response = await client.chat.completions.create({
      model: deployment,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      max_completion_tokens: 100000,
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    return JSON.parse(content);
  } catch (error) {
    console.error("Failed to extract entities:", error);
    return null;
  }
}
