import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;
const DB = process.env.MONGODB_DB || "nftgen";

type MongoCache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

declare global {
  // eslint-disable-next-line no-var
  var _mongo: MongoCache | undefined;
}

const cached: MongoCache = globalThis._mongo ?? { conn: null, promise: null };
if (!globalThis._mongo) globalThis._mongo = cached;

export async function connectMongo() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { dbName: DB }).then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}


