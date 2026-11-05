// MongoDB connection, shared across requests of one server instance.
import { MongoClient, type Db } from "mongodb";

const g = globalThis as unknown as { __mongo?: Promise<MongoClient> };

/** Live mode = a database is configured. Without one the app runs as the browser-only demo. */
export const isLive = () => !!process.env.MONGODB_URI;

export async function mongo(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (!g.__mongo) {
    g.__mongo = MongoClient.connect(uri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 8000,
    }).catch((e) => {
      g.__mongo = undefined; // retry on the next request
      throw e;
    });
  }
  return (await g.__mongo).db(process.env.MONGODB_DB || "arts_fashion");
}
