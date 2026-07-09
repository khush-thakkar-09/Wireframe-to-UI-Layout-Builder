import { MongoClient } from "mongodb";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const client = new MongoClient(env.mongodbUri);

export async function connectToMongoDB() {
  try {
    await client.connect();
    logger.success("MongoDB", "Successfully connected to MongoDB cluster!");
    return client;
  } catch (err) {
    logger.error("MongoDB", `Connection failed: ${(err as Error).message}`);
    throw err;
  }
}

// Call this only when your application terminates
export async function disconnectFromMongoDB() {
  try {
    await client.close();
    logger.info("MongoDB", "Closed MongoDB connection.");
  } catch (err) {
    logger.warn("MongoDB", `Error during close: ${(err as Error).message}`);
  }
}
