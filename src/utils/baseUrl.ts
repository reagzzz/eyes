import { headers } from "next/headers";

export async function getBaseUrlFromHeaders() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "";
  return `${proto}://${host}`;
}

export async function getAbsoluteUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (base) return new URL(path, base).toString();
  const inferred = await getBaseUrlFromHeaders();
  return new URL(path, inferred || "http://localhost:3000").toString();
}


