import fs from "fs/promises";
import neo4j from "neo4j-driver";

const NEO4J_URI = process.env.NEO4J_URI!;
const NEO4J_USER = process.env.NEO4J_USER!;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD!;

const driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
);
const session = driver.session();

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
    const products = normalizeArray(entities.products || []);
    const categories = normalizeArray(entities.categories || []);
    const ingredients = normalizeArray(entities.ingredients || []);
    const topics = normalizeArray(entities.topics || []);

    const query = `
      MERGE (c:Chunk {id: $id})
      FOREACH (entry IN $products |
        MERGE (p:Product {name: entry.name})
        ON CREATE SET p.displayName = entry.displayName
        MERGE (c)-[:MENTIONS_PRODUCT]->(p)
      )
      FOREACH (entry IN $categories |
        MERGE (cat:Category {name: entry.name})
        ON CREATE SET cat.displayName = entry.displayName
        MERGE (c)-[:MENTIONS_CATEGORY]->(cat)
      )
      FOREACH (entry IN $ingredients |
        MERGE (i:Ingredient {name: entry.name})
        ON CREATE SET i.displayName = entry.displayName
        MERGE (c)-[:MENTIONS_INGREDIENT]->(i)
      )
      FOREACH (entry IN $topics |
        MERGE (t:Topic {name: entry.name})
        ON CREATE SET t.displayName = entry.displayName
        MERGE (c)-[:MENTIONS_TOPIC]->(t)
      )
    `;

    await session.run(query, {
      id,
      products,
      categories,
      ingredients,
      topics,
    });

    console.log(`Ingested chunk: ${id}`);
  }

  await session.close();
  await driver.close();
  console.log("✅ Ingestion complete!");
}

ingestData().catch((err) => {
  console.error("❌ Error during ingestion:", err);
});
