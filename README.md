
# Nestlé Canada AI Chatbot

This AI-powered chatbot is integrated with MadeWithNestle.ca to provide accurate, real-time answers to user queries using hybrid search and a Graph-based Retrieval-Augmented Generation (GraphRAG) system. This solution demonstrates a complete end-to-end pipeline for building and deploying a context-aware chatbot using modern AI, search, and graph technologies.

## Key Features:
- **Customizable chatbot interface** with support for a **pop-out feature**, **name**, and **icon customization**. A **custom landing page for Nestlé** was designed and developed specifically for this project, with the chatbot fully integrated into the user interface for a seamless experience.

- **Comprehensive website scraping** using **Playwright** and **Cheerio**, capturing all **text, links, images, and tables**.

- **Efficient storage and retrieval** of vectorized content using **Azure Cognitive Search** and **OpenAI embeddings**.

- **Entity extraction**: Products, ingredients, categories, and topics were extracted from each content chunk using the **Azure OpenAI o3-mini model** with an **optimized prompt** for efficiency and accuracy.

- **GraphRAG module** implemented using **Neo4j** to capture and query **relationships between entities** for deeper contextual understanding.

- **Deployed on Microsoft Azure** to ensure **scalable, real-time interactions** with the chatbot interface.

- **Backend Updates**: While all scraping, embedding, and entity ingestion logic is scripted, automated cron jobs can be easily implemented that will be used to periodically run these scripts, ensuring the chatbot stays up to date with the latest content from the source website.

- **Cold Start Latency on Azure Basic Plan**: Since the "Always On" feature is not available on the Basic App Service plan, the chatbot may experience slight delays when handling the first request after a period of inactivity.  
  ➤ **Workaround**: A lightweight ping script or an external cron job (UptimeRobot) is used to send a request to the app every 5 minutes to keep it warm.




## Demo

- Live Azure Deployed Link: [Nestle Assistant](https://nestle-assistant-fnancbd7d7hzfxbm.canadacentral-01.azurewebsites.net/)

- Watch the full demo of the Nestle Assistant in action:
[Nestlé Assistant Screen Recording
](https://drive.google.com/file/d/1SosUPyeq0ZiIP6mS-jvtyd281xOLsAF3/view?usp=sharing)


## Tech Stack

| **Layer**                          | **Technology/Tool**                                               | **Purpose**                                                                 |
|-------------------------------|----------------------------------------------------------------|-------------------------------------------------------------------------|
| **Frontend**  | Next.js (App Router)                                      | Framework for building the landing page and chatbot UI          |
|                               | React                                                    | Manages chatbot state, routing, and UI logic                           |
|                               | Tailwind CSS                                              | Utility-first CSS for responsive and maintainable styling              |
|                               | ShadCN UI                                                 | Component library for buttons, modals, and form elements               |
|                               | Framer Motion                                             | Smooth animations for modals and UI transitions                        |
||||
| **AI & Retrieval**   | Azure OpenAI (o3-mini)                      | Entity extraction and GPT-based response generation                    |
|                               | OpenAI Embeddings (`text-embedding-ada-002`)               | Converts content into vector embeddings for similarity search          |
|                               | Azure Cognitive Search                                     | Hybrid retrieval using text and vector search                          |
||||
| **Data Collection & Pipeline**|    Playwright        | Crawls all accessible pages from MadeWithNestle.ca                     |
|                               | Cheerio                                                   | Parses HTML and extracts structured content                            |
|                               | Node.js Scripts                                           | Automates scraping, filtering, embedding, and entity extraction        |
||||
| **GraphRAG**    | Neo4j                                                     | Stores and queries structured entity relationships                     |
|                               | Cypher                                                    | Query language used to ingest and link graph nodes semantically        |
||||
| **Deployment**      | Microsoft Azure (App Service, ACR, CLI)                  | Dockerized chatbot deployed via Azure Container Registry (ACR) and Azure App Service using Azure CLI for real-time scalability |

                           

## Installation

Clone the repository and install dependencies using npm:

```bash
git clone https://github.com/Kishore121523/nestle_bot.git
cd nestle_bot
npm install
```

### Usage Instructions
- **Create a .env file in the root directory:**
    - **Important**: Never commit your .env file to version control. Replace your-openai-key, your-search-key, and other values with your actual credentials.   

    ```bash
    NEXT_PUBLIC_BASE_URL=http://localhost:3000 # when testing - development env
    #NEXT_PUBLIC_BASE_URL=http://localhost # when in production env

    # Azure OpenAI
    OPENAI_API_KEY=your-openai-key
    OPENAI_API_BASE=your-openai-api-base-url
    OPENAI_API_VERSION=2023-05-15
    OPENAI_EMBEDDING_MODEL=embedding-model

    # Azure Cognitive (AI) Search
    AZURE_SEARCH_ENDPOINT=your-azure-search-endpoint
    AZURE_SEARCH_KEY=your-search-key
    AZURE_SEARCH_INDEX=nestle-index
    AZURE_SEARCH_API_VERSION=2023-10-01-Preview

    # Azure OpenAI o3-mini Model
    AZURE_O3_MINI_ENDPOINT=your-o3-mini-endpoint
    AZURE_O3_MINI_KEY=your-o3-mini-key
    AZURE_O3_MINI_API_VERSION=2024-12-01-preview
    AZURE_O3_MINI_DEPLOYMENT_NAME=o3-mini

    # Neo4j
    NEO4J_URI=your-neo4j-uri
    NEO4J_USER=neo4j
    NEO4J_PASSWORD=your-neo4j-password
    ```

- Run the development server and open your browser and navigate to http://localhost:3000 to see the chatbot and landing page.

    ```bash
    npm run dev
    ```

- **Optional Scripts for Data Pipeline**
    - To support hybrid search and GraphRAG capabilities, the following scripts can be executed to scrape, process, embed, extract, and ingest content.
    - ####  `scrapeAndSave.ts`
        ```bash
        npx ts-node -P tsconfig.script.json scripts/scrapeAndSave.ts
        ```
        - This script uses Playwright and Cheerio to scrape the full content of MadeWithNestle.ca, including links, text, images, and tables. It saves the structured output to ```scrapedOutput.json```. 


    - ####  `filterChunks.ts (Optional)`
        ```bash
        npx ts-node -P tsconfig.script.json scripts/filterChunks.ts
        ```
        - If you are using the Azure AI Search Free Tier, this script helps reduce the number of chunks and the overall index size to stay within the 50MB limit. If you're using paid Azure Search resources, you can skip this step.
        - It filters out duplicates, very short/long chunks, and promotional noise (e.g., contests, hashtags). The filtered output is saved as ```filteredOutput.json```.


    - #### `embedAndUpload.ts`
        ```bash
        npx ts-node -P tsconfig.script.json scripts/embedAndUpload.ts
        ```
        - Generates vector embeddings for each chunk using Azure OpenAI’s embedding model and uploads the results to Azure Cognitive Search (Azure AI Search). This step powers the hybrid retrieval system (vector + keyword search).


    - ####  `extractAllEntities.ts`
        ```bash
        npx ts-node -P tsconfig.script.json scripts/extractAllEntities.ts
        ```
        - Uses Azure OpenAI o3-mini to extract entities (products, ingredients, categories, topics) from each chunk currently stored in the Azure AI Search index. The extracted entities are saved in ```nestle_extracted_entities.json```.


    - ####  `ingest.ts`
        ```bash
        npx ts-node -P tsconfig.script.json scripts/ingest.ts
        ```
        - This script ingests the extracted entities from ```nestle_extracted_entities.json``` into a Neo4j graph database. This step enables GraphRAG by representing relationships in a structured and queryable graph format.

        - For each chunk:
            - Creates a Chunk node.
            - Uses MERGE to create or re-use Product, Category, Ingredient, and Topic nodes.
            - Links the chunk to each of these using semantic relationships:
                - [:MENTIONS_PRODUCT]
                - [:MENTIONS_CATEGORY]
                - [:MENTIONS_INGREDIENT]
                - [:MENTIONS_TOPIC]

        - Uses ON CREATE SET to ensure display names are set only when nodes are created, preserving previously ingested data.

        



## Performance Optimizations

Several optimizations were implemented throughout the project to ensure performance, maintainability, and user experience:

- ### Code & Performance
    - **Batch Processing**: All embedding, entity extraction, and ingestion scripts process content in small batches (e.g., 5 chunks at a time) to avoid memory spikes and stay within OpenAI and Azure API rate limits.

    - **Streaming Search Results**: Azure Cognitive Search integration uses async iterators to stream results efficiently, ensuring low memory overhead when retrieving large index datasets.

    - **Duplicate Filtering**: During scraping and chunk filtering, duplicate text blocks are removed to reduce noise and storage redundancy, improving retrieval quality.

    - **Crawl Depth Management**: The scraper is configured with a configurable crawl depth (e.g., depth = 1) to ensure we gather nested and related internal pages without overloading the site or introducing unnecessary page bloat.

    - **URL Deduplication & 404 Handling**: Scraping logic includes deduplication of visited URLs and skips invalid or broken pages (e.g., 404s), optimizing crawl time and reducing error output.

    - **Configurable Filtering**: The `filterChunks.ts` script includes max length constraints and chunk count caps to control output size. This allows the project to remain compliant with Azure's 50MB index size limit on the free tier while preserving meaningful content.

    - **Text Normalization**: All text chunks are cleaned, whitespace-normalized, and validated against length thresholds before embedding, ensuring consistency and quality in vector search results.

    - **Flexible Chunk Structure**: Structured filtering preserves both `textChunks` and `crawledPages` depending on how the data is needed, making the output usable for both indexing and graph-based ingestion.


- ### Accessibility & UI
    - **Keyboard-Navigable Interface**: Chat UI and buttons follow proper focus states for accessibility compliance.
    - **Theme Consistency**: The design uses a unified Tailwind + ShadCN setup that respects both light and dark modes without visual inconsistencies.
    - **Semantic HTML Elements**: All interactive elements (e.g., buttons, modals) use proper semantic tags to support screen readers and accessibility tooling.

- ### Code Quality & Reusability
    - **Modular Script Design**: Data pipeline scripts are isolated, reusable, and parameter-driven—making the system easy to scale or modify.
    - **Environment-Based Config**: All keys and endpoints are abstracted into `.env` for cleaner code and easier deployment across environments.
    - **Reusable Components**: Shared UI components like dialogs, buttons, and loaders are abstracted for consistent styling and interaction across the app.

## Deployment

This project is deployed manually using Docker and Azure CLI throught Azure App Services.

### Prerequisites

- Docker installed and running
- Azure CLI (`az`) installed and logged in
- Azure App Service created for Linux containers
- Azure Container Registry (ACR) created and linked
- `.env.docker` file with all required environment variables

---

### Steps
-  Create a `.env.docker` File
    - Store sensitive API keys and config in a `.env.docker` file. Azure App Service will inject them as environment variables at runtime.

- Create a Dockerfile
    - IMPORTANT: Azure App Service expects your container to serve on port 80, not the default Next.js port 3000. This is why we set ENV PORT=80 and expose that port.
    ```
    # Build stage
    FROM node:20-alpine AS builder

    WORKDIR /app
    COPY package*.json ./
    RUN npm install
    COPY . .
    RUN npm run build

    # Production image
    FROM node:20-alpine
    WORKDIR /app

    # Copy necessary production files
    COPY --from=builder /app/.next ./.next
    COPY --from=builder /app/public ./public
    COPY --from=builder /app/package*.json ./
    COPY --from=builder /app/next.config.ts ./next.config.ts

    # Inject env file for production
    COPY .env.docker .env

    # Install only production dependencies
    RUN npm install --production

    # Set port and expose
    ENV PORT=80
    EXPOSE 80

    CMD ["npm", "start"]

    ```
- Create Azure Container Registry
    ```bash
    az acr create \
     --name kishorenestleacr \
     --resource-group kishore-project-nestle \
     --sku Basic \
     --location canadacentral\
    ```

-  Build Docker image

    ```bash
    docker build --platform=linux/amd64 -t kishorenestleacr.azurecr.io/nestle-chatbot:latest .
    ```

- Log in to Azure & ACR 
    ```
    az login
    az acr login --name kishorenestleacr
    ```

- Push Docker Image to ACR
    ``` 
    docker push kishorenestleacr.azurecr.io/nestle-chatbot:latest
    ```

- Deploy to Azure App Service
    ``` 
    az webapp config container set \
        --name nestle-assistant \
        --resource-group kishore-project-nestle \
        --container-image-name kishorenestleacr.azurecr.io/nestle-chatbot:v1 \
        --container-registry-url https://kishorenestleacr.azurecr.io \
        --container-registry-user $(az acr credential show --name kishorenestleacr --query username -o tsv) \
        --container-registry-password $(az acr credential show --name kishorenestleacr --query 'passwords[0].value' -o tsv)
    ```

- Restart the Web App
   ``` 
   az webapp restart \
    --name nestle-assistant \
    --resource-group kishore-project-nestle
   ```
## Known Limitations & Future Enhancements

- **Cold Start Latency**: Initial requests may experience a delay due to Azure App Service cold starts, especially on free-tier hosting.
- **Azure OpenAI Throughput Limits**: The deployment uses the lowest available paid tier for Azure OpenAI (to minimize cost), which can throttle requests and cause slower or queued responses during periods of high activity.
- **Limited Context Memory**: The chatbot currently handles only short-term context within a session and does not persist or recall multi-turn conversations across sessions.
- **No Admin Dashboard**: There is no visual interface yet for monitoring entities, managing scraped data, or inspecting graph structure—this is planned for future enhancement.
- **Single Language Support**: At the moment, only English content is supported. Internationalization and multilingual response support are on the roadmap.
