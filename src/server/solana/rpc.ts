import { Connection } from "@solana/web3.js";

export function getRpcUrl(): string {
  const url = (process.env.NEXT_PUBLIC_RPC_URL || "").trim();
  if (!url || !url.startsWith("http")) {
    throw new Error("RPC_URL_INVALID: set NEXT_PUBLIC_RPC_URL in .env.local");
  }
  return url;
}

export function getConnection(commitment: "confirmed" | "finalized" = "confirmed") {
  return new Connection(getRpcUrl(), commitment);
}


