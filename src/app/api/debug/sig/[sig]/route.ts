import { NextResponse } from "next/server";

// Endpoint de debug: retourne simplement la signature passée dans l'URL.
// Exemple: /api/debug/sig/ABCD -> { ok:true, signature:"ABCD" }
export async function GET(
  _req: Request,
  ctx: { params: { sig?: string } }
) {
  const sig = ctx?.params?.sig;
  if (!sig || sig.toLowerCase() === "test") {
    return NextResponse.json({ ok: false, error: "missing_or_test_sig" }, { status: 400 });
  }
  return NextResponse.json({ ok: true, signature: sig });
}


