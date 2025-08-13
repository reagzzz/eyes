import { headers } from "next/headers";

/**
 * Renvoie une base URL absolue sûre côté server (http://localhost:3000 en dev)
 * et utilisable en prod derrière proxy (x-forwarded-*).
 */
export async function getBaseUrl() {
  // En dev, on force localhost pour éviter d'appeler headers() côté client.
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  // En prod (Server Component), on peut lire les en-têtes.
  const h = await headers();
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

/** Convertit ipfs://CID[/path] -> https://<gateway>/ipfs/CID[/path] */
export function ipfsToHttp(uri: string, gateway?: string) {
  if (!uri) return uri as unknown as string;
  if (!uri.startsWith("ipfs://")) return uri;
  const gw = gateway?.replace(/\/+$/, "") || "https://gateway.pinata.cloud";
  const path = uri.replace(/^ipfs:\/\//, "");
  return `${gw}/ipfs/${path}`;
}


