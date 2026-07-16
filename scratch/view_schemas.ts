import { MongoClient } from "mongodb";
import { env } from "../src/config/env.js";

async function main() {
  const client = new MongoClient(env.mongodbUri);
  try {
    await client.connect();
    const db = client.db("wireframe-to-layout");
    
    const meta = await db.collection("section-metadata").findOne({});
    console.log("--- section-metadata sample ---");
    console.log(JSON.stringify(meta, null, 2));

    const elem = await db.collection("section-elements").findOne({});
    console.log("--- section-elements sample ---");
    console.log(JSON.stringify(elem, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

main();
