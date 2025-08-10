import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/server/rate-limit";
import { PNG } from "pngjs";
import { captureError } from "@/server/monitoring";

async function uploadToPinataFile(buffer: Buffer, filename: string): Promise<string> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error("Missing PINATA_JWT env");
  const form = new FormData();
  // Convert Node Buffer to plain ArrayBuffer (avoid SharedArrayBuffer)
  // Create a fresh ArrayBuffer and copy the data to avoid SharedArrayBuffer types
  const ab = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(ab).set(new Uint8Array(buffer));
  const blob = new Blob([ab], { type: "image/png" });
  form.append("file", blob, filename);
  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: form as unknown as BodyInit,
  });
  if (!res.ok) throw new Error(`Pinata file error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { IpfsHash: string };
  return data.IpfsHash;
}

async function uploadToPinataJSON(content: Record<string, unknown>): Promise<string> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error("Missing PINATA_JWT env");
  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ pinataContent: content }),
  });
  if (!res.ok) throw new Error(`Pinata json error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { IpfsHash: string };
  return data.IpfsHash;
}

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


