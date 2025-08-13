import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

const DB_PATH = path.join(process.cwd(), "data", "collections.json");

function uuid() {
  return typeof crypto !== "undefined" && (crypto as any).randomUUID
    ? (crypto as any).randomUUID()
    : Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export async function POST(req: Request) {
  try {
    const payload = await req.json().catch(() => ({} as any));
    if (!payload || !payload.title || !Array.isArray(payload.items)) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }
    const id = payload.id || uuid();
    const createdAt = payload.createdAt || new Date().toISOString();
    const record = { id, createdAt, ...payload };

    let list: any[] = [];
    try {
      const raw = await fs.readFile(DB_PATH, "utf8");
      list = JSON.parse(raw || "[]");
    } catch {}

    const idx = list.findIndex((x: any) => x?.id === id);
    if (idx >= 0) list[idx] = record;
    else list.push(record);

    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify(list, null, 2), "utf8");
    return NextResponse.json({ ok: true, id }, { status: 201, headers: { "cache-control": "no-store" } });
  } catch (err: any) {
    console.error("[collections/create] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "server_error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;


