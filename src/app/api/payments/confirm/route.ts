import { NextRequest, NextResponse } from "next/server";
import { Payment } from "@/server/db/models";
import { connectMongo } from "@/server/db/mongo";
import { Connection, PublicKey } from "@solana/web3.js";

export async function POST(req: NextRequest){
  await connectMongo();
  const { paymentId, txSig } = await req.json();
  if(!paymentId || !txSig){
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }

  const p = await Payment.findById(paymentId);
  if(!p) return NextResponse.json({ error: "payment_not_found" }, { status: 404 });

  // Build a connection (single source of truth)
  const rpc = process.env.NEXT_PUBLIC_RPC_URL!;
  const connection = new Connection(rpc, { commitment: "confirmed" });

  try {
    // Use parsed transaction to easily read transfer and memo
    const tx = await connection.getParsedTransaction(txSig, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });

    if(!tx) return NextResponse.json({ error: "tx_not_found" }, { status: 404 });

    const treasury = new PublicKey(process.env.NEXT_PUBLIC_PLATFORM_TREASURY_WALLET!);
    const expectedMemo = `nftgen:${p.reference}`;

    const instructions = tx.transaction.message.instructions ?? [];

    let hasValidTransfer = false;
    let hasValidMemo = false;

    type ParsedIx = { program?: string; parsed?: { type?: string; info?: Record<string, unknown>; memo?: string } };
    for (const ix of instructions as ParsedIx[]) {
      // System transfer check
      if (ix.program === "system" && ix.parsed?.type === "transfer") {
        const dest = ix.parsed.info?.destination;
        const lamports = Number(ix.parsed.info?.lamports || 0);
        if (dest === treasury.toBase58() && lamports >= p.lamports) {
          hasValidTransfer = true;
        }
      }

      // SPL Memo check
      if (ix.program === "spl-memo") {
        // Different RPCs may shape parsed memo slightly differently
        const memo = ix.parsed?.info?.memo ?? ix.parsed?.memo ?? ix.parsed?.info ?? null;
        if (typeof memo === "string" && memo === expectedMemo) {
          hasValidMemo = true;
        }
      }
    }

    if (!hasValidTransfer || !hasValidMemo) {
      return NextResponse.json({ error: "payment_not_verified", hasValidTransfer, hasValidMemo }, { status: 400 });
    }

    await Payment.updateOne({ _id: paymentId }, { $set: { txSig, status: "confirmed" } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "verification_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


