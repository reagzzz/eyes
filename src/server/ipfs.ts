import { NextResponse } from "next/server";

const PINATA = "https://api.pinata.cloud";
const JWT = process.env.PINATA_JWT!;

export async function uploadToPinataFile(buffer: Buffer, filename: string): Promise<string> {
  if (!JWT) throw new Error("Missing PINATA_JWT");
  const form = new FormData();
  // Convert Node Buffer to ArrayBuffer then Blob for fetch FormData
  const ab = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(ab).set(new Uint8Array(buffer));
  const blob = new Blob([ab], { type: "image/png" });
  form.append("file", blob, filename);
  const res = await fetch(`${PINATA}/pinning/pinFileToIPFS`, {
    method: "POST",
    headers: { Authorization: `Bearer ${JWT}` },
    body: form as unknown as BodyInit,
  });
  if (!res.ok) throw new Error(`pinFileToIPFS ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { IpfsHash: string };
  return json.IpfsHash;
}

export async function uploadToPinataJSON<T>(obj: T): Promise<string> {
  if (!JWT) throw new Error("Missing PINATA_JWT");
  const res = await fetch(`${PINATA}/pinning/pinJSONToIPFS`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${JWT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pinataContent: obj }),
  });
  if (!res.ok) throw new Error(`pinJSONToIPFS ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { IpfsHash: string };
  return json.IpfsHash;
}


