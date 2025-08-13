import { headers } from "next/headers";

/** Safe base URL usable on server (Next 15: headers() must be awaited) */
export async function getBaseUrl() {
  try {
    const h = await headers();
    const proto =
      h.get("x-forwarded-proto") ??
      (process.env.NODE_ENV === "production" ? "https" : "http");
    const host =
      h.get("x-forwarded-host") ??
      h.get("host") ??
      `localhost:${process.env.PORT ?? "3000"}`;
    return `${proto}://${host}`;
  } catch {
    return `http://localhost:${process.env.PORT ?? "3000"}`;
  }
}


