import neo4j from "neo4j-driver";

const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!)
);

// Count total products and per-category product counts
export async function getProductCountsFromGraph() {
  const session = driver.session();

  try {
    const totalRes = await session.run(`
      MATCH (p:Product)
      RETURN count(p) AS totalProducts;
    `);

    const totalProducts = totalRes.records[0].get("totalProducts").toInt();

    const categoryRes = await session.run(`
      MATCH (c:Category)<-[:BELONGS_TO]-(p:Product)
      RETURN toLower(c.name) AS category, count(DISTINCT p) AS count
    `);

    const categoryCounts: Record<string, number> = {};

    for (const record of categoryRes.records) {
      const category = record.get("category");
      const count = record.get("count").toInt();

      if (category && typeof count === "number") {
        categoryCounts[category] = count;
      }
    }

    return {
      totalProducts,
      categories: categoryCounts,
    };
  } finally {
    await session.close();
  }
}
