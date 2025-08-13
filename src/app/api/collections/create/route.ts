import { NextResponse } from "next/server";
import { readCollections, writeCollections, type DbCollection } from "@/server/db";

function uuid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? (crypto as any).randomUUID()
    : Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { id: idIn, title, prompt = null, items, payment } = body || {};
    if (!title || !Array.isArray(items)) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }
    const id = idIn || uuid();
    const createdAt = new Date().toISOString();
    const record: DbCollection = { id, title, prompt, items, payment, createdAt };

    const list = await readCollections();
    const idx = list.findIndex((c) => c.id === id);
    if (idx >= 0) list[idx] = record; else list.push(record);
    await writeCollections(list);

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (e: any) {
    console.error("collections/create POST error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "server_error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;


