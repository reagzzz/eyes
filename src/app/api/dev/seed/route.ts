import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";

export async function POST(_req: NextRequest) {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) return NextResponse.json({ error: "no_mongo" }, { status: 500 });
    const { MongoClient } = await import("mongodb");
    const client = await MongoClient.connect(uri);
    const db = client.db(process.env.MONGODB_DB || "nftgen");
    const col = db.collection("collections");

    const doc = {
      _id: nanoid(12),
      title: "Demo Cyber Cats",
      description: "Collection de test",
      cover: "https://picsum.photos/seed/cover/800/800",
      supply: 1000,
      minted: 0,
      mintPriceSol: 0.02,
      // pour le mint test via /api/mint/start :
      metadataUri: "ipfs://placeholder-json-cid",
      name: "Demo NFT",
      symbol: "DEMO",
      status: "live",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as const;

    const r = await col.insertOne(doc as any);
    await client.close();
    return NextResponse.json({ ok: true, id: String(r.insertedId) });
  } catch (e: any) {
    console.error("/api/dev/seed error", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}


