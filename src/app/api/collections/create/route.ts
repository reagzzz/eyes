import { NextResponse } from "next/server";
import { saveCollection } from "@/server/db";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const item = await saveCollection(body || {});
    return NextResponse.json({ ok: true, id: item.id, item }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;


