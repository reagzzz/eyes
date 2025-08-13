import { NextResponse } from "next/server";
import { getAllCollections } from "@/server/db";

export async function GET() {
  try {
    const items = await getAllCollections();
    return NextResponse.json({ ok: true, items }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "list_error" }, { status: 500 });
  }
}


