// scripts/testEntityExtraction.ts
import { extractEntitiesFromText } from "../lib/graph/extractEntities";

const sampleText = `
Introducing BOOST® Kids – a line of nutritional supplements formulated for kids aged 4-12!
BOOST® Kids Fruit Essentials contain 8g protein, 2g fibre and 26 vitamins & minerals.
Their ready-to-drink format makes them a great, nutritious option.
`;

async function test() {
  const entities = await extractEntitiesFromText(sampleText);
  console.log("✅ Extracted Entities:\n", JSON.stringify(entities, null, 2));
}

test();
