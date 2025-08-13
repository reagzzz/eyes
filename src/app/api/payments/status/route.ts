import { NextRequest, NextResponse } from "next/server";
import { Connection } from "@solana/web3.js";
import { getRpcUrl } from "@/server/solana/rpc";
import { waitForConfirmation } from "@/server/solana/confirm";

function maskRpc(url: string) {
  return url.replace(/(api-key=)[^&]+/i, "$1***");
}

async function getSignatureStatus(connection: Connection, signature: string) {
  const st = (await connection.getSignatureStatuses([signature], { searchTransactionHistory: true })).value[0];
  if (!st) return { status: "pending" as const };
  if (st.err) return { status: "err" as const, err: typeof st.err === "string" ? st.err : "tx_err" };
  const cs = st.confirmationStatus as "processed" | "confirmed" | "finalized" | null | undefined;
  if (cs === "finalized") return { status: "finalized" as const };
  if (cs === "confirmed") return { status: "confirmed" as const };
  return { status: "pending" as const };
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const signature = (url.searchParams.get("signature") || url.searchParams.get("sig") || "").trim();
  if (!signature) return NextResponse.json({ ok: false, error: "missing_signature" }, { status: 400 });

  const rpc = getRpcUrl();
  const connection = new Connection(rpc, "confirmed");

  // Try lightweight status first
  const quick = await getSignatureStatus(connection, signature);
  let status = quick.status;
  if (status === "pending") {
    try {
      await waitForConfirmation(connection, signature, { timeoutMs: 60000, commitment: "confirmed", pollMs: 1000 });
      status = "confirmed";
    } catch {
      // keep pending on timeout
    }
  }

  const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
  const maskedRpc = maskRpc(rpc);
  console.log(`[status] rpc=${maskedRpc} sig=${signature.slice(0,6)}... status=${status}`);
  return NextResponse.json({ ok: true, signature, status, explorerUrl, rpc: maskedRpc });
}


