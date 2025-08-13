import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/server/db";

const Item = z.object({
  imageCid: z.string(),
  metadataCid: z.string(),
  imageUri: z.string().url(),
  metadataUri: z.string().url(),
});

const Body = z.object({
  prompt: z.string().min(1),
  items: z.array(Item).min(1),
  payment: z.object({
    signature: z.string().min(10),
    totalLamports: z.number().int().positive(),
    treasury: z.string().min(10).optional(),
  }),
});

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  try {
    const json = await req.json().catch(() => ({}));
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      console.error("[collections.POST] bad_body", parsed.error.flatten());
      return NextResponse.json({ ok: false, error: "bad_body", issues: parsed.error.flatten() }, { status: 400 });
    }
    const { prompt, items, payment } = parsed.data;
    const db = await getDb();
    const doc = { createdAt: new Date(), prompt, items, payment, status: "draft" };
    const res = await db.collection("collections").insertOne(doc as any);
    console.log("[collections.POST] saved", { id: res.insertedId, ms: Date.now() - startedAt });
    return NextResponse.json({ ok: true, id: String(res.insertedId) }, { status: 201 });
  } catch (err: any) {
    console.error("[collections.POST] error", { err: err?.message, stack: err?.stack });
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = await getDb();
    const items = await db.collection("collections").find().sort({ _id: -1 }).limit(5).toArray();
    return NextResponse.json({ ok: true, items });
  } catch (err: any) {
    console.error("[collections.GET] error", err?.message);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}


