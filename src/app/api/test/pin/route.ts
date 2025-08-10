import { NextRequest, NextResponse } from "next/server";
import { PNG } from "pngjs";

async function uploadToPinataFile(buffer: Buffer, filename: string): Promise<string> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error("Missing PINATA_JWT env");
  const form = new FormData();
  form.append("file", new Blob([buffer]), filename);
  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: form as any,
  });
  if (!res.ok) throw new Error(`Pinata file error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { IpfsHash: string };
  return data.IpfsHash;
}

async function uploadToPinataJSON(content: any): Promise<string> {
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

export async function POST(_req: NextRequest) {
  try {
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
  } catch (e: any) {
    console.error("/api/test/pin error:", e);
    return NextResponse.json({ error: e?.message || "pin_failed" }, { status: 500 });
  }
}

export const GET = POST;


