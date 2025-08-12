import { NextRequest, NextResponse } from "next/server";
import { Payment } from "@/server/db/models";
import { connectMongo } from "@/server/db/mongo";
import { PublicKey } from "@solana/web3.js";
import { getConnection, getRpcUrl } from "@/server/solana/rpc";
import { waitForFinalized } from "@/server/solana/confirm";

export async function POST(req: NextRequest){
  // Accept both simple signature flow and legacy payment verification
  const body = await req.json();
  const signature: string | undefined = body?.signature || body?.txSig;
  const paymentId: string | undefined = body?.paymentId;
  if (!signature && !paymentId) {
    return NextResponse.json({ ok:false, error: "missing_signature" }, { status: 400 });
  }

  const rpc = getRpcUrl();
  const connection = getConnection("confirmed");
  console.log("[confirm] rpc=", rpc);
  if (signature) console.log("[confirm] signature=", signature);

  // Always wait for finalization first to avoid tx_not_found races
  if (signature) {
    const res = await waitForFinalized(connection, signature, 45000, 900);
    if (!res.ok) {
      console.warn("[confirm] not finalized:", res);
      return NextResponse.json({ ok:false, error: res.reason }, { status: 504 });
    }
  }

  // If no paymentId, stop here (smoke test path)
  if (!paymentId) {
    return NextResponse.json({ ok:true });
  }

  await connectMongo();
  const p = await Payment.findById(paymentId);
  if(!p) return NextResponse.json({ ok:false, error: "payment_not_found" }, { status: 404 });

  try {
    // After finalization, parse to verify transfer + memo
    const tx = await connection.getParsedTransaction(signature!, {
      maxSupportedTransactionVersion: 0,
      commitment: "finalized",
    });

    if(!tx) return NextResponse.json({ ok:false, error: "tx_not_found" }, { status: 404 });

    const treasury = new PublicKey(process.env.NEXT_PUBLIC_PLATFORM_TREASURY_WALLET!);
    const expectedMemo = `nftgen:${p.reference}`;

    const instructions = tx.transaction.message.instructions ?? [];

    let hasValidTransfer = false;
    let hasValidMemo = false;

    type ParsedIx = { program?: string; parsed?: { type?: string; info?: Record<string, unknown>; memo?: string } };
    for (const ix of instructions as ParsedIx[]) {
      if (ix.program === "system" && ix.parsed?.type === "transfer") {
        const dest = ix.parsed.info?.destination;
        const lamports = Number(ix.parsed.info?.lamports || 0);
        if (dest === treasury.toBase58() && lamports >= p.lamports) {
          hasValidTransfer = true;
        }
      }
      if (ix.program === "spl-memo") {
        const memo = ix.parsed?.info?.memo ?? ix.parsed?.memo ?? ix.parsed?.info ?? null;
        if (typeof memo === "string" && memo === expectedMemo) {
          hasValidMemo = true;
        }
      }
    }

    if (!hasValidTransfer || !hasValidMemo) {
      return NextResponse.json({ ok:false, error: "payment_not_verified", hasValidTransfer, hasValidMemo }, { status: 400 });
    }

    await Payment.updateOne({ _id: paymentId }, { $set: { txSig: signature, status: "confirmed" } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("[confirm] error:", (e as Error)?.message || e);
    const message = e instanceof Error ? e.message : "verification_failed";
    return NextResponse.json({ ok:false, error: message }, { status: 500 });
  }
}


