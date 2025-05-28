/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  env: {
    // Search API
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,

    // Azure OpenAI Embedding
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_API_BASE: process.env.OPENAI_API_BASE,
    OPENAI_API_VERSION: process.env.OPENAI_API_VERSION,
    OPENAI_EMBEDDING_MODEL: process.env.OPENAI_EMBEDDING_MODEL,

    // Azure AI Search
    AZURE_SEARCH_ENDPOINT: process.env.AZURE_SEARCH_ENDPOINT,
    AZURE_SEARCH_KEY: process.env.AZURE_SEARCH_KEY,
    AZURE_SEARCH_INDEX: process.env.AZURE_SEARCH_INDEX,
    AZURE_SEARCH_API_VERSION: process.env.AZURE_SEARCH_API_VERSION,

    // Azure OpenAI o3-mini
    AZURE_O3_MINI_ENDPOINT: process.env.AZURE_O3_MINI_ENDPOINT,
    AZURE_O3_MINI_KEY: process.env.AZURE_O3_MINI_KEY,
    AZURE_O3_MINI_API_VERSION: process.env.AZURE_O3_MINI_API_VERSION,
    AZURE_O3_MINI_DEPLOYMENT_NAME: process.env.AZURE_O3_MINI_DEPLOYMENT_NAME,

    // Neo4j
    NEO4J_URI: process.env.NEO4J_URI,
    NEO4J_USER: process.env.NEO4J_USER,
    NEO4J_PASSWORD: process.env.NEO4J_PASSWORD,
  },
};

export default nextConfig;
