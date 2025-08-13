import { headers } from "next/headers";

export async function getBaseUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function apiUrl(path: string) {
  if (!path.startsWith("/")) path = `/${path}`;
  const base = await getBaseUrl();
  return `${base}${path}`;
}


