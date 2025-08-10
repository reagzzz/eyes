import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/server/db/mongo";
import { Collection } from "@/server/db/models";

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }){
  await connectMongo();
  const { id } = await context.params;
  const col = await Collection.findById(id).lean();
  if(!col) return NextResponse.json({ error:"not_found" }, { status:404 });
  return NextResponse.json(col);
}


