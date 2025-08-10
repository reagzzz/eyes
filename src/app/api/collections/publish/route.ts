import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/server/db/mongo";
import { Collection } from "@/server/db/models";

export async function POST(req: NextRequest){
  await connectMongo();
  const { collectionId, title, mintPriceSol, royaltyBps=0 } = await req.json();
  await Collection.updateOne({ _id: collectionId }, { $set: { title, mintPriceSol, royaltyBps, status: "live", updatedAt: new Date() }});
  return NextResponse.json({ ok:true });
}


