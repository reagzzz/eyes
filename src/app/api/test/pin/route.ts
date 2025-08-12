import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/server/rate-limit";
import { PNG } from "pngjs";
import { captureError } from "@/server/monitoring";
import { pinFileToIPFS, pinJSONToIPFS } from "@/server/pinata";

// Factorized into '@/server/pinata'

export async function POST(req: NextRequest) {
  try {
    // Basic rate-limit: 5 req/min per IP
    try {
      const ip = req.headers.get("x-forwarded-for") || "unknown";
      const resIp = await enforceRateLimit(`rl:pin:ip:${ip}`, 5, 60);
      if (resIp && !resIp.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    } catch {}

    // 1) Generate 500x500 PNG (solid color)
    const png = new PNG({ width: 500, height: 500 });
    for (let y = 0; y < png.height; y++) {
      for (let x = 0; x < png.width; x++) {
        const idx = (png.width * y + x) << 2;
        png.data[idx] = 99; // R
        png.data[idx + 1] = 102; // G
        png.data[idx + 2] = 241; // B
        png.data[idx + 3] = 255; // A
      }
    }
    const imgBuffer: Buffer = PNG.sync.write(png);

    // 2) Upload image
    const imageCid = await uploadToPinataFile(imgBuffer, `test-${Date.now()}.png`);

    // 3) Create and upload metadata JSON
    const meta = {
      name: "Test NFT",
      symbol: "TST",
      image: `ipfs://${imageCid}`,
      attributes: [] as { trait_type: string; value: string }[],
    };
    const jsonCid = await uploadToPinataJSON(meta);

    return NextResponse.json({ metadataUri: `ipfs://${jsonCid}`, imageCid, jsonCid });
  } catch (e: unknown) {
    console.error("/api/test/pin error:", e);
    try { captureError(e, { route: "/api/test/pin" }); } catch {}
    const message = e instanceof Error ? e.message : "pin_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = POST;


