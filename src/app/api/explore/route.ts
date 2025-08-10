import { NextResponse } from "next/server";
import { connectMongo } from "@/server/db/mongo";
import { Collection } from "@/server/db/models";

export async function GET(){
  await connectMongo();
  const items = await Collection.find({ status:"live" }).sort({ volumeSol24h:-1, createdAt:-1 }).limit(60).lean();
  return NextResponse.json({ items });
}


