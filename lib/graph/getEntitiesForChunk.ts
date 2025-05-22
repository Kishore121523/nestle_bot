import neo4j from "neo4j-driver";

const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!)
);

export async function getEntitiesForChunk(chunkId: string) {
  const session = driver.session();

  const query = `
    MATCH (c:Chunk {id: $id})-[r]->(e)
    RETURN labels(e)[0] AS type, collect(e.displayName) AS entities
  `;

  const result = await session.run(query, { id: chunkId });

  const entityMap: Record<string, string[]> = {};
  result.records.forEach((record) => {
    const type = record.get("type");
    const entities = record.get("entities");
    entityMap[type] = entities;
  });

  await session.close();
  return entityMap;
}
