// src/lib/ipfs.ts
const IPFS_GATEWAYS = [
  (cid: string) => `https://gateway.pinata.cloud/ipfs/${cid}`,
  (cid: string) => `https://ipfs.io/ipfs/${cid}`,
  (cid: string) => `https://cloudflare-ipfs.com/ipfs/${cid}`,
];

export function extractCidFromIpfsUri(uri: string): string | null {
  if (!uri) return null;
  if (uri.startsWith("ipfs://")) {
    const rest = uri.slice("ipfs://".length);
    const parts = rest.split("/");
    return parts[0] || null;
  }
  if (/^[A-Za-z0-9]+$/.test(uri) && uri.length > 30) return uri;
  try {
    const u = new URL(uri);
    const idx = u.pathname.indexOf("/ipfs/");
    if (idx >= 0) {
      const after = u.pathname.slice(idx + "/ipfs/".length);
      const parts = after.split("/");
      return parts[0] || null;
    }
  } catch {}
  return null;
}

export function ipfsToHttpCandidates(uriOrCid: string): string[] {
  const cid = extractCidFromIpfsUri(uriOrCid) ?? uriOrCid;
  if (!cid) return [];
  return IPFS_GATEWAYS.map((build) => build(cid));
}

export function ipfsToHttp(
  uri: string,
  gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://ipfs.io/ipfs"
) {
  if (!uri) return "";
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
  if (uri.startsWith("ipfs://")) {
    const rest = uri.slice("ipfs://".length);
    return `${gateway}/${rest}`;
  }
  return `${gateway}/${uri}`;
}


