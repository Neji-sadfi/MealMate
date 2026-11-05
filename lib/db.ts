import mongoose from "mongoose";

// Server-only (Node.js runtime). Never import this from proxy.ts or client components.

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

// Next.js hot reload re-evaluates modules in development; keeping the
// connection on globalThis avoids opening a new one on every change.
const globalForMongoose = globalThis as typeof globalThis & { mongooseCache?: MongooseCache };
const cache: MongooseCache = (globalForMongoose.mongooseCache ??= { conn: null, promise: null });

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  const configuredUri = process.env.MONGODB_URI?.trim();
  if (!configuredUri && process.env.NODE_ENV === "production") {
    throw new Error("MONGODB_URI must be configured in the production environment.");
  }
  const uri = configuredUri || "mongodb://127.0.0.1:27017/mealmate_local";

  // serverSelectionTimeoutMS: fail after 8 s instead of the default 30 s when Atlas is unreachable.
  cache.promise ??= mongoose
    .connect(uri, { bufferCommands: false, serverSelectionTimeoutMS: 8000 })
    .catch((error) => {
      cache.promise = null;
      throw error;
    });

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    cache.promise = null;
    throw error;
  }

  return cache.conn;
}
