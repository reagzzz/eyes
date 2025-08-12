import { NextRequest, NextResponse } from "next/server";
import { Connection } from "@solana/web3.js";

export async function GET(_req: NextRequest, { params }: { params: { sig: string } }) {
  const sig = params.sig;
  const rpc = (process.env.NEXT_PUBLIC_RPC_URL || "").trim();
  try {
    if (!sig) return NextResponse.json({ ok: false, error: "missing_sig" }, { status: 400 });
    if (!rpc || !rpc.startsWith("http")) {
      return NextResponse.json({ ok: false, error: "RPC env invalid", rpc }, { status: 500 });
    }
    const connection = new Connection(rpc, "confirmed");
    const statuses = await connection.getSignatureStatuses([sig], { searchTransactionHistory: true });
    const status = statuses.value[0];
    const parsed = await connection.getParsedTransaction(sig, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });
    return NextResponse.json({
      ok: true,
      sig,
      status,
      parsed,
      explorerUrl: `https://explorer.solana.com/tx/${sig}?cluster=devnet`,
    });
  } catch (e: unknown) {
    const msg = (e as Error)?.message || String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}


