import { NextResponse } from "next/server";
import { generateImagesStability } from "@/server/ai/stability";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prompt = String(body?.prompt || "");
    const count = Number(body?.count || 1);
    const model = body?.model ? String(body.model) : undefined;
    const width = body?.width ? Number(body.width) : undefined;
    const height = body?.height ? Number(body.height) : undefined;

    if (!prompt) {
      return NextResponse.json({ ok: false, error: "missing_prompt" }, { status: 400 });
    }

    const items = await generateImagesStability({ prompt, model, width, height });

    console.log("[/api/generate] ok items:", items);
    return NextResponse.json({ ok: true, items }, { status: 200 });
  } catch (e:any) {
    console.error("[/api/generate] error:", e?.message || e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}


