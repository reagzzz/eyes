export function getBaseUrlFromHeaders(h: Headers) {
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "";
  return `${proto}://${host}`;
}

export function getAbsoluteUrl(h: Headers, path: string) {
  const base = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (base) return new URL(path, base).toString();
  const inferred = getBaseUrlFromHeaders(h);
  return new URL(path, inferred || "http://localhost:3000").toString();
}


