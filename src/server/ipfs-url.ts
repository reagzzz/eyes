// Convertit ipfs://<cid> ou "<cid>" en URL web (gateway pinata par défaut)
const DEFAULT_GATEWAY = "https://gateway.pinata.cloud/ipfs";

export function toGatewayUrl(input?: string): string | null {
  if (!input) return null;
  const v = input.trim();
  if (!v) return null;
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  if (v.startsWith("ipfs://")) {
    const cid = v.slice("ipfs://".length);
    return `${DEFAULT_GATEWAY}/${cid}`;
  }
  return `${DEFAULT_GATEWAY}/${v}`;
}


