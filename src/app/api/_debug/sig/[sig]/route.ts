import { NextRequest, NextResponse } from "next/server";
import { Connection } from "@solana/web3.js";

export async function GET(_req: NextRequest, { params }: { params: { sig: string } }) {
  try {
    const { sig } = params as { sig: string };
    const rpc = (process.env.NEXT_PUBLIC_RPC_URL || "").trim();
    if (!sig) return NextResponse.json({ ok: false, error: "missing_sig" }, { status: 400 });
    if (!rpc || !rpc.startsWith("http")) {
      return NextResponse.json({ ok: false, error: "RPC env invalid", rpc }, { status: 500 });
    }
    const connection = new Connection(rpc, "confirmed");
    const [st] = (await connection.getSignatureStatuses([sig], { searchTransactionHistory: true })).value;
    const tx = await connection.getParsedTransaction(sig, { maxSupportedTransactionVersion: 0 });
    return NextResponse.json({
      ok: true,
      rpc,
      status: st?.confirmationStatus ?? null,
      confirmations: st?.confirmations ?? null,
      slot: st?.slot ?? null,
      err: st?.err ?? null,
      tx,
    });
  } catch (e: unknown) {
    const msg = (e as Error)?.message || String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}


