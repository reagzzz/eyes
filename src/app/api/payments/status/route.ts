import { NextRequest, NextResponse } from "next/server";
import { Connection } from "@solana/web3.js";

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
  const sig = req.nextUrl.searchParams.get("sig")?.trim();
  if (!sig) return NextResponse.json({ ok: false, error: "missing_sig" }, { status: 400 });

  const rpc = (process.env.NEXT_PUBLIC_RPC_URL || "").trim();
  const connection = new Connection(rpc, "confirmed");
  const st = await getSignatureStatus(connection, sig);
  const explorerUrl = `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
  const maskedRpc = maskRpc(rpc);
  console.log(`[status] rpc=${maskedRpc} sig=${sig.slice(0,6)}... status=${st.status}`);
  return NextResponse.json({ ok: true, signature: sig, status: st.status, explorerUrl, rpc: maskedRpc });
}


