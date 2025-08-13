export function ipfsToHttp(ipfsUri: string): string {
  if (!ipfsUri) return "";
  const cidPath = ipfsUri.replace(/^ipfs:\/\//, "");
  const base = process.env.PINATA_GATEWAY?.replace(/\/+$/, "");
  if (base) return `${base}/${cidPath}`;
  return `https://ipfs.io/ipfs/${cidPath}`;
}


