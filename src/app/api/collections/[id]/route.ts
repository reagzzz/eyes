import { NextResponse } from "next/server";
import { getCollection } from "@/server/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = await getCollection(id);
  if (!item) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, item }, { status: 200 });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;


