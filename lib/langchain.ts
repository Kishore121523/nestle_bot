// This file sets up the LangChain LLM and prompt templates for the Nestle Canada project.
// Useful for future extensions where API routes may require more complex or chainable logic.

import { AzureChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";

export const llm = new AzureChatOpenAI({
  azureOpenAIApiKey: process.env.AZURE_O3_MINI_KEY!,
  azureOpenAIApiInstanceName: process.env.AZURE_O3_MINI_INSTANCE!,
  azureOpenAIApiDeploymentName: process.env.AZURE_O3_MINI_DEPLOYMENT_NAME!,
  azureOpenAIApiVersion: process.env.AZURE_O3_MINI_API_VERSION,
  modelName: process.env.AZURE_O3_MINI_DEPLOYMENT_NAME,
  maxCompletionTokens: 10000,
});

// For API-answer/route.ts API
export const nestlePrompt = PromptTemplate.fromTemplate(
  `You are a helpful assistant that answers questions using only the provided context from the Nestlé Canada website.

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
    {context}

    Question:
    {question}

    Respond in clean Markdown with clear paragraph spacing.
    `
);

// For extracting entities
export const extractEntityPrompt = PromptTemplate.fromTemplate(
  ` You are an entity extraction agent.
    From the given text, extract named entities relevant to the Nestlé website domain.
    Return a JSON object with keys like 'products', 'categories', 'ingredients', and 'topics'.

    Example output:
    {{
      "products": ["BOOST Kids Essentials"],
      "categories": ["nutritional supplements"],
      "ingredients": ["protein", "fibre", "vitamins", "minerals"]
      "topics": ["nutrition", "health", "wellness"]
    {{
      
    Text:
    {text}
    `
);
