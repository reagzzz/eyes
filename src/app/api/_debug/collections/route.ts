import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/server/db/mongo";
import { Collection } from "@/server/db/models";

export async function GET(_req: NextRequest) {
  try {
    await connectMongo();
    const docs = await Collection.find({}, { _id: 1, title: 1, status: 1, createdAt: 1, imageCIDs: 1 })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();
    const items = (docs || []).map((d: any) => ({
      _id: String(d._id),
      title: d.title || "",
      status: d.status || "",
      createdAt: d.createdAt,
      images: Array.isArray(d.imageCIDs) ? d.imageCIDs.length : 0,
    }));
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log("[_debug/collections] count=", items.length, items.map((i) => i._id).join(","));
    }
    return NextResponse.json({ ok: true, items });
  } catch (e: unknown) {
    const msg = (e as Error)?.message || String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}


