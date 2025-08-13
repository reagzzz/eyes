import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/server/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = (params?.id || "").trim();
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
    }

    const db = await getDb();
    const doc = await db.collection("collections").findOne({ _id: new ObjectId(id) });

    if (!doc) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    const item = {
      id: doc._id.toString(),
      prompt: (doc as any).prompt ?? "",
      items: Array.isArray((doc as any).items) ? (doc as any).items : [],
      payment: (doc as any).payment ?? null,
      createdAt: (doc as any).createdAt ?? null,
    };

    return NextResponse.json({ ok: true, item }, { status: 200 });
  } catch (err) {
    console.error("[collections/:id.GET]", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}


