import { headers } from "next/headers";

// Next 15 safe base URL helper
export async function getBaseUrl() {
  try {
    const h = await headers();
    const proto = h.get("x-forwarded-proto") || "http";
    const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
    return `${proto}://${host}`;
  } catch {
    return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  }
}

export async function apiUrl(path: string) {
  if (!path.startsWith("/")) path = `/${path}`;
  const base = await getBaseUrl();
  return `${base}${path}`;
}


