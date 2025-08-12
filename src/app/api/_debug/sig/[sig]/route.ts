import { NextResponse } from "next/server";
import { Connection } from "@solana/web3.js";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: { sig: string } }
) {
  try {
    const sig = (ctx?.params?.sig || "").trim();
    if (!sig || sig === "test") {
      return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 400 });
    }

    const rpc = (process.env.NEXT_PUBLIC_RPC_URL || "").trim();
    if (!rpc) {
      return NextResponse.json({ ok: false, error: "missing NEXT_PUBLIC_RPC_URL" }, { status: 500 });
    }

    const connection = new Connection(rpc, "confirmed");

    const [st] = (await connection.getSignatureStatuses([sig])).value;
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
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}


