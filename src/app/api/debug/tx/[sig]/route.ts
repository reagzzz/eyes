import { NextRequest, NextResponse } from "next/server";
import { Connection } from "@solana/web3.js";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ sig?: string }> }
) {
  try {
    const { sig } = await ctx.params;
    if (!sig) {
      return NextResponse.json({ ok: false, error: "missing_sig" }, { status: 400 });
    }
    const rpc = (process.env.NEXT_PUBLIC_RPC_URL || "").trim();
    const connection = new Connection(rpc, "confirmed");
    const statuses = await connection.getSignatureStatuses([sig], { searchTransactionHistory: true });
    const status = statuses.value[0] ?? null;
    const slot = await connection.getSlot();
    return NextResponse.json({ ok: true, sig, status, slot, rpc });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}


