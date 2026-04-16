import mongoose from "mongoose";
import { config } from "./env.js";

let databaseMode = "memory";

export async function connectDatabase() {
  if (!config.mongodbUri) {
    console.log("No MONGODB_URI configured. Running with in-memory persistence.");
    databaseMode = "memory";
    return databaseMode;
  }

  try {
    await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 4000
    });
    databaseMode = "mongo";
    console.log("Connected to MongoDB.");
  } catch (error) {
    databaseMode = "memory";
    console.warn(
      `MongoDB connection failed (${error.message}). Falling back to in-memory persistence.`
    );
  }

  return databaseMode;
}

export function getDatabaseMode() {
  return databaseMode;
}
