// Run using - npx ts-node -P tsconfig.script.json scripts/ingest.ts

import fs from "fs/promises";
import neo4j from "neo4j-driver";
import "dotenv/config";

// Neo4j connection setup
const NEO4J_URI = process.env.NEO4J_URI!;
const NEO4J_USER = process.env.NEO4J_USER!;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD!;

const driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
);
const session = driver.session();

// Normalize and lowercase names, keep display names
function normalizeArray(
  arr: string[]
): { name: string; displayName: string }[] {
  return arr.map((n) => ({
    name: n.trim().toLowerCase(),
    displayName: n.trim(),
  }));
}

async function ingestData() {
  const raw = await fs.readFile(
    "./scripts/nestle_extracted_entities.json",
    "utf-8"
  );
  const data = JSON.parse(raw);

  for (const chunk of data) {
    const { id, entities } = chunk;

    if (!entities || typeof entities !== "object") {
      console.warn(`Skipped chunk: ${id} due to missing or invalid entities`);
      continue;
    }

    // Normalize all entity types
    const products = normalizeArray(entities.products || []);
    const categories = normalizeArray(entities.categories || []);
    const ingredients = normalizeArray(entities.ingredients || []);
    const topics = normalizeArray(entities.topics || []);

    // Create Product nodes and relate them to the chunk
    const query = `
      MERGE (chunk:Chunk {id: $id})

      FOREACH (entry IN $products |
        MERGE (p:Product {name: entry.name})
        ON CREATE SET p.displayName = entry.displayName
        MERGE (chunk)-[:MENTIONS]->(p)
      )

      FOREACH (cat IN $categories |
        MERGE (c:Category {name: cat.name})
        ON CREATE SET c.displayName = cat.displayName
        FOREACH (p IN $products |
          MERGE (prod:Product {name: p.name})
          MERGE (prod)-[:BELONGS_TO]->(c)
        )
      )

      FOREACH (ing IN $ingredients |
        MERGE (i:Ingredient {name: ing.name})
        ON CREATE SET i.displayName = ing.displayName
        FOREACH (p IN $products |
          MERGE (prod:Product {name: p.name})
          MERGE (prod)-[:HAS_INGREDIENT]->(i)
        )
      )

      FOREACH (top IN $topics |
        MERGE (t:Topic {name: top.name})
        ON CREATE SET t.displayName = top.displayName
        FOREACH (p IN $products |
          MERGE (prod:Product {name: p.name})
          MERGE (prod)-[:RELATED_TO_TOPIC]->(t)
        )
      )
    `;

    try {
      await session.run(query, {
        id,
        products,
        categories,
        ingredients,
        topics,
      });
      console.log(`Ingested chunk: ${id}`);
    } catch (err) {
      console.error(`Failed to ingest chunk: ${id}`, err);
    }
  }

  await session.close();
  await driver.close();
  console.log("Ingestion complete!");
}

ingestData().catch((err) => {
  console.error("Error during ingestion:", err);
});
