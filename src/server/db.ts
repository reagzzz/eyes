import { MongoClient, Db } from "mongodb";

let _db: Db | null = null;
export async function getDb(): Promise<Db> {
  if (_db) return _db;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing");
  const client = new MongoClient(uri);
  await client.connect();
  _db = client.db(process.env.MONGODB_DB || "nftgen");
  return _db;
}


