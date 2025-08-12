import { NextRequest, NextResponse } from "next/server";
import { Payment } from "@/server/db/models";
import { connectMongo } from "@/server/db/mongo";
import { Connection, PublicKey } from "@solana/web3.js";

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const body = await req.json().catch(() => ({}));
  const signature: string | undefined = body?.signature || body?.txSig;
  const expectedLamports: number = Number(body?.expectedLamports || 0);
  const treasuryStr: string | undefined = body?.treasury || (process.env.NEXT_PUBLIC_PLATFORM_TREASURY_WALLET || "").trim();
  const paymentId: string | undefined = body?.paymentId; // optionnel

  if (!signature) return NextResponse.json({ ok: false, error: "missing_signature" }, { status: 400 });
  if (!treasuryStr) return NextResponse.json({ ok: false, error: "invalid_treasury" }, { status: 400 });

  const rpc = (process.env.NEXT_PUBLIC_RPC_URL || "").trim();
  if (!rpc) return NextResponse.json({ ok: false, error: "missing_rpc" }, { status: 500 });
  const connection = new Connection(rpc, "confirmed");
  const maskedRpc = rpc.replace(/(api-key=)[^&]+/i, "$1***");
  console.log(`[confirm] rpc=${maskedRpc}`);
  console.log(`[confirm] signature=${signature.slice(0, 6)}...${signature.slice(-6)} start=${new Date(startedAt).toISOString()}`);

  // Timeout global 95s pour éviter coupe côté Next
  let timedOut = false;
  const hardTimeout = setTimeout(() => {
    timedOut = true;
  }, 95000);

  let status: any = null;
  let tick = 0;
  try {
    while (!timedOut && Date.now() - startedAt < 90000) {
      try {
        const res = await connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
        status = res.value[0];
        const conf = status?.confirmationStatus ?? null;
        const slot = status?.slot ?? null;
        console.log(`[confirm] tick #${tick}: slot=${slot} status=${conf}`);
        if (status?.err) {
          return NextResponse.json({ ok: false, error: "tx_err", err: status.err }, { status: 400 });
        }
        if (conf === "confirmed" || conf === "finalized") break;
      } catch (e) {
        console.warn("[confirm] getSignatureStatuses error:", (e as Error)?.message || e);
      }
      tick += 1;
      await new Promise((r) => setTimeout(r, 1500));
    }

    if (timedOut || Date.now() - startedAt >= 90000) {
      return NextResponse.json({ ok: false, error: "timeout" }, { status: 504 });
    }

    const parsed = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
    if (!parsed) {
      console.warn("[confirm] parsed tx not found after confirmation");
      return NextResponse.json({ ok: false, error: "tx_not_found" }, { status: 404 });
    }

    const treasury = new PublicKey(treasuryStr);
    let totalToTreasury = 0;
    type ParsedIx = { program?: string; parsed?: { type?: string; info?: Record<string, unknown> } };
    const outerIxs = (parsed.transaction.message.instructions ?? []) as unknown as ParsedIx[];
    for (const ix of outerIxs) {
      if (ix.program === "system" && ix.parsed?.type === "transfer") {
        const dest = ix.parsed.info?.destination as string | undefined;
        const lamports = Number(ix.parsed.info?.lamports || 0);
        if (dest === treasury.toBase58()) totalToTreasury += lamports;
      }
    }
    const inner = parsed.meta?.innerInstructions ?? [];
    for (const group of inner) {
      for (const ix of (group.instructions ?? []) as unknown as ParsedIx[]) {
        if (ix.program === "system" && ix.parsed?.type === "transfer") {
          const dest = ix.parsed.info?.destination as string | undefined;
          const lamports = Number(ix.parsed.info?.lamports || 0);
          if (dest === treasury.toBase58()) totalToTreasury += lamports;
        }
      }
    }

    if (Number.isFinite(expectedLamports) && expectedLamports > 0 && totalToTreasury < expectedLamports) {
      return NextResponse.json(
        { ok: false, error: "missing_or_wrong_transfer", totalToTreasury, expectedLamports },
        { status: 400 }
      );
    }

    // Optionnel: persistance si paymentId fourni
    if (paymentId) {
      await connectMongo();
      await Payment.updateOne({ _id: paymentId }, { $set: { txSig: signature, status: "confirmed" } });
    }

    const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
    return NextResponse.json({
      ok: true,
      signature,
      explorerUrl,
      confirmationStatus: status?.confirmationStatus ?? null,
      slot: status?.slot ?? null,
      totalToTreasury,
      rpc: maskedRpc,
    });
  } finally {
    clearTimeout(hardTimeout);
  }
}

