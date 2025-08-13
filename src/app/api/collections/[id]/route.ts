import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = (params?.id || "").trim();
    if (!id) {
      return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), "data", "collections.json");
    let raw = "";
    try {
      raw = await readFile(filePath, "utf8");
    } catch {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ ok: false, error: "db_corrupted" }, { status: 500, headers: { "Cache-Control": "no-store" } });
    }

    let item: any = null;
    if (Array.isArray(parsed)) {
      item = parsed.find((it: any) => String(it?.id || it?._id) === id) || null;
    } else if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, any>;
      if (obj[id]) item = obj[id];
    }

    if (!item) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    // Normalize shape
    const normalized = {
      id: String(item.id || item._id || id),
      prompt: String(item.prompt || item.title || ""),
      items: Array.isArray(item.items) ? item.items : [],
      createdAt: item.createdAt ?? null,
    };

    return NextResponse.json(
      { ok: true, item: normalized },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[collections/:id.GET]", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}


