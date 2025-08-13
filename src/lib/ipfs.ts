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


