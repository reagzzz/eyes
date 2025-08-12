import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/server/db/mongo";
import { Collection } from "@/server/db/models";

export async function POST(req: NextRequest) {
  try {
    await connectMongo();
    const body = await req.json().catch(() => ({} as any));
    const { title, imageCIDs = [], metadataURIs = [] } = body as { title?: string; imageCIDs: string[]; metadataURIs: string[] };
    if (!Array.isArray(imageCIDs) || imageCIDs.length === 0) {
      return NextResponse.json({ ok: false, error: "missing_images" }, { status: 400 });
    }
    // Map metadataURIs (ipfs://CID) to stored metadataCIDs
    const metadataCIDs: string[] = Array.isArray(metadataURIs)
      ? metadataURIs.map((u: string) => (u?.startsWith("ipfs://") ? u.slice(7) : u)).filter(Boolean)
      : [];

    const doc = await Collection.create({
      title: title || "New AI Collection",
      imageCIDs,
      metadataCIDs,
      status: "live",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    return NextResponse.json({ ok: true, id: String(doc._id) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db_error" }, { status: 500 });
  }
}


