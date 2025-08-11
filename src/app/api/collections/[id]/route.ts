import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/server/db/mongo";
import { Collection } from "@/server/db/models";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  const hasMongo = Boolean(process.env.MONGODB_URI);

  if (hasMongo) {
    try {
      await connectMongo();
      const collection = await Collection.findById(id).lean();
      if (!collection) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      return NextResponse.json(collection);
    } catch (_err) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
  }

  // Demo-only fallback when Mongo is not configured
  return NextResponse.json({ _id: id, title: "Demo Collection", description: "Mock data", metadataCIDs: [] });
}


