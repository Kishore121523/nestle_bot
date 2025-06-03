import neo4j from "neo4j-driver";

const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!)
);

export async function getEntitiesForChunk(chunkId: string) {
  const session = driver.session();

  const query = `
    MATCH (c:Chunk {id: $id})

    OPTIONAL MATCH (c)-[:MENTIONS]->(p:Product)
    OPTIONAL MATCH (p)-[:BELONGS_TO]->(cat:Category)
    OPTIONAL MATCH (p)-[:HAS_INGREDIENT]->(i:Ingredient)
    OPTIONAL MATCH (p)-[:RELATED_TO_TOPIC]->(t:Topic)

    RETURN 
      collect(DISTINCT COALESCE(p.displayName, p.name)) AS products,
      collect(DISTINCT COALESCE(cat.displayName, cat.name)) AS categories,
      collect(DISTINCT COALESCE(i.displayName, i.name)) AS ingredients,
      collect(DISTINCT COALESCE(t.displayName, t.name)) AS topics
  `;

  try {
    const result = await session.run(query, { id: chunkId });

    if (result.records.length === 0) {
      return {};
    }

    const record = result.records[0];

    const entityMap: Record<string, string[]> = {
      product: record.get("products") || [],
      category: record.get("categories") || [],
      ingredient: record.get("ingredients") || [],
      topic: record.get("topics") || [],
    };

    return entityMap;
  } finally {
    await session.close();
  }
}
