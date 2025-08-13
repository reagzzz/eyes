import { NextResponse } from "next/server";
import { saveCollection, type Collection } from "@/server/db";
import { randomUUID } from "node:crypto";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Partial<Collection> | null;
    if (!body) return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });

    const id = (body.id as string) ?? randomUUID();
    const title = (body.title ?? "Untitled").toString().trim() || "Untitled";
    const prompt = (body.prompt ?? null) as string | null;
    const items = Array.isArray(body.items) ? (body.items as Collection["items"]) : [];
    const payment = (body.payment as Collection["payment"]) ?? { signature: "", totalLamports: 0, treasury: "" };
    const createdAt = (body.createdAt as string) ?? new Date().toISOString();

    const col: Collection = { id, title, prompt, items, payment, createdAt };
    await saveCollection(col);
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    console.error("[collections/create] error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;


