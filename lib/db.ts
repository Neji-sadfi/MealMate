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

  const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/mealmate_local";
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Copy .env.example to .env and add your Atlas URI.");
  }

  cache.promise ??= mongoose.connect(uri, { bufferCommands: false }).catch((error) => {
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
