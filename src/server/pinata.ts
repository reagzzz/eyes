export async function pinFileToIPFS(buffer: Buffer, filename: string): Promise<string> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error("Missing PINATA_JWT env");
  const form = new FormData();
  // Convert Node Buffer to plain ArrayBuffer (avoid SharedArrayBuffer)
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

export async function pinJSONToIPFS(content: any): Promise<string> {
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

import FormData from "form-data";

export async function uploadImageToPinata(buffer: Buffer): Promise<string> {
  const form = new FormData();
  form.append("file", buffer, { filename: `image-${Date.now()}.png` });

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.PINATA_JWT!}` } as unknown as HeadersInit,
    body: form as unknown as BodyInit
  });
  if(!res.ok) throw new Error(`Pinata file error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { IpfsHash: string };
  return data.IpfsHash;
}

export async function uploadJSONToPinata(obj: Record<string, unknown>): Promise<string> {
  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.PINATA_JWT!}` },
    body: JSON.stringify({ pinataContent: obj })
  });
  if(!res.ok) throw new Error(`Pinata json error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { IpfsHash: string };
  return data.IpfsHash;
}


