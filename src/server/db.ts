import { promises as fs } from "fs";
import path from "path";

export type DbCollection = {
  id: string;
  title: string;
  prompt: string | null;
  items: Array<{
    imageCid?: string;
    metadataCid?: string;
    imageUri?: string;
    metadataUri?: string;
  }>;
  payment?: {
    signature: string;
    totalLamports: number;
    treasury: string;
  };
  createdAt: string;
};

const DB_PATH = path.join(process.cwd(), "data", "collections.json");

async function ensureDir() {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
}

export async function readCollections(): Promise<DbCollection[]> {
  await ensureDir();
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    if (!raw.trim()) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as DbCollection[];
    if (parsed && Array.isArray((parsed as any).collections)) return (parsed as any).collections as DbCollection[];
    return [];
  } catch {
    return [];
  }
}

export async function writeCollections(list: DbCollection[]) {
  await ensureDir();
  const tmp = DB_PATH + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(list, null, 2), "utf8");
  await fs.rename(tmp, DB_PATH);
}

import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type Item = {
  imageCid: string;
  metadataCid: string;
  imageUri: string;
  metadataUri: string;
};

export type Collection = {
  id: string;
  title: string;
  prompt: string | null;
  items: Item[];
  payment: {
    signature: string;
    totalLamports: number;
    treasury: string;
  } | null;
  createdAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const COLLECTIONS_FILE = path.join(DATA_DIR, "collections.json");

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(COLLECTIONS_FILE);
  } catch {
    await fs.writeFile(COLLECTIONS_FILE, "{}", "utf8");
  }
}

async function readAll(): Promise<Record<string, any>> {
  await ensureStore();
  const raw = await fs.readFile(COLLECTIONS_FILE, "utf8");
  try { return raw?.trim() ? JSON.parse(raw) : {}; } catch { return {}; }
}

async function writeAll(db: Record<string, any>) {
  await ensureStore();
  await fs.writeFile(COLLECTIONS_FILE, JSON.stringify(db, null, 2), "utf8");
}

export async function saveCollection(input: any) {
  const db = await readAll();
  const id = input?.id || crypto.randomUUID();
  const item = {
    id,
    title: String(input?.title ?? ""),
    prompt: input?.prompt ?? null,
    items: Array.isArray(input?.items) ? input.items : [],
    payment: input?.payment ?? null,
    createdAt: new Date().toISOString(),
  };
  db[id] = item;
  await writeAll(db);
  return item;
}

export async function getCollection(id: string) {
  const db = await readAll();
  return db[id] ?? null;
}

export async function listCollections() {
  const db = await readAll();
  return Object.values(db);
}

export async function getAllCollections() {
  const items = await listCollections();
  return items.sort((a: any, b: any) => {
    const ta = Date.parse(a?.createdAt || "");
    const tb = Date.parse(b?.createdAt || "");
    return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta);
  });
}

// Optional: keep Mongo helper available if used elsewhere
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


