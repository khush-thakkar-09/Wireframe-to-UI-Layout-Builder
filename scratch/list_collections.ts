import { MongoClient } from "mongodb";
import { env } from "../src/config/env.js";

async function main() {
  const client = new MongoClient(env.mongodbUri);
  try {
    await client.connect();
    console.log("Connected successfully to server");
    
    // List databases
    const adminDb = client.db().admin();
    const dbs = await adminDb.listDatabases();
    console.log("Databases:");
    console.log(JSON.stringify(dbs, null, 2));

    // For each database, list collections
    for (const dbInfo of dbs.databases) {
      if (dbInfo.name === "admin" || dbInfo.name === "local" || dbInfo.name === "config") continue;
      const db = client.db(dbInfo.name);
      const collections = await db.listCollections().toArray();
      console.log(`Database: ${dbInfo.name}`);
      console.log("Collections:", collections.map(c => c.name));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

main();
