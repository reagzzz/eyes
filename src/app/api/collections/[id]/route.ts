import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

type Item = {
  imageCid?: string;
  metadataCid?: string;
  imageUri?: string;
  metadataUri?: string;
};

type Payment = {
  signature: string;
  totalLamports: number;
  treasury: string;
};

type Collection = {
  id: string;
  title: string;
  prompt: string | null;
  items: Item[];
  payment?: Payment;
  createdAt: string;
};

const DB_PATH = path.join(process.cwd(), "data", "collections.json");

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params?.id;
    if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
    let raw = "[]";
    try { raw = await fs.readFile(DB_PATH, "utf8"); } catch {}
    const list: Collection[] = JSON.parse(raw || "[]");
    const item = list.find((c) => c?.id === id);
    if (!item) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, item }, { status: 200, headers: { "cache-control": "no-store" } });
  } catch (e: any) {
    console.error("[/api/collections/[id]] error", e);
    return NextResponse.json({ ok: false, error: e?.message || "server_error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;


