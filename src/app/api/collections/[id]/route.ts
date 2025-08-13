import { NextResponse } from "next/server";
import { readCollections } from "@/server/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = params?.id;
  if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  try {
    const list = await readCollections();
    const item = list.find((c) => c.id === id);
    if (!item) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, item });
  } catch (e: any) {
    console.error("collections/[id] GET error:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;


