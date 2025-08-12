import { NextRequest, NextResponse } from "next/server";
import { Payment } from "@/server/db/models";
import { connectMongo } from "@/server/db/mongo";
import { PublicKey } from "@solana/web3.js";
import { getConnection, getRpcUrl } from "@/server/solana/rpc";
import { waitForConfirmation, fetchParsedTx } from "@/server/solana/confirm";

export async function POST(req: NextRequest){
  const startedAt = Date.now();
  const body = await req.json().catch(() => ({}));
  const signature: string | undefined = body?.signature || body?.txSig;
  const expectedLamportsRaw: unknown = body?.expectedLamports;
  const treasuryStr: string | undefined = body?.treasury || (process.env.NEXT_PUBLIC_PLATFORM_TREASURY_WALLET || "").trim();
  const paymentId: string | undefined = body?.paymentId; // optional legacy

  if (!signature) {
    return NextResponse.json({ ok:false, error: "missing_signature" }, { status: 400 });
  }
  const expectedLamports = Number(expectedLamportsRaw);
  if (!Number.isFinite(expectedLamports) || expectedLamports <= 0) {
    return NextResponse.json({ ok:false, error: "invalid_expectedLamports" }, { status: 400 });
  }
  if (!treasuryStr) {
    return NextResponse.json({ ok:false, error: "invalid_treasury" }, { status: 400 });
  }

  const rpc = getRpcUrl();
  const connection = getConnection("confirmed");
  const maskedRpc = rpc.replace(/(api-key=)[^&]+/i, "$1***");
  console.log(`[confirm] rpc=${maskedRpc}`);
  console.log(`[confirm] signature=${signature.slice(0,6)}...${signature.slice(-6)} start=${new Date(startedAt).toISOString()}`);

  try {
    const status = await waitForConfirmation(connection, signature, { timeoutMs: 120000, commitment: "confirmed" });
    const parsed = await fetchParsedTx(connection, signature);
    if (!parsed) {
      console.warn("[confirm] parsed tx not found after confirmation");
      return NextResponse.json({ ok:false, error: "tx_not_found" }, { status: 404 });
    }

    const treasury = new PublicKey(treasuryStr);

    // Sum all transfers to treasury (outer + inner)
    let totalToTreasury = 0;
    type ParsedIx = { program?: string; parsed?: { type?: string; info?: Record<string, unknown>; memo?: string } };
    const outerIxs = (parsed.transaction.message.instructions ?? []) as unknown as ParsedIx[];
    for (const ix of outerIxs) {
      if (ix.program === "system" && ix.parsed?.type === "transfer") {
        const dest = ix.parsed.info?.destination;
        const lamports = Number(ix.parsed.info?.lamports || 0);
        if (dest === treasury.toBase58()) totalToTreasury += lamports;
      }
    }
    const inner = parsed.meta?.innerInstructions ?? [];
    for (const group of inner) {
      for (const ix of (group.instructions ?? []) as unknown as ParsedIx[]) {
        if (ix.program === "system" && ix.parsed?.type === "transfer") {
          const dest = ix.parsed.info?.destination;
          const lamports = Number(ix.parsed.info?.lamports || 0);
          if (dest === treasury.toBase58()) totalToTreasury += lamports;
        }
      }
    }

    console.log(`[confirm] transfer summary: treasury=${treasury.toBase58()} totalLamports=${totalToTreasury}`);

    if (totalToTreasury < expectedLamports) {
      return NextResponse.json({ ok:false, error: "missing_or_wrong_transfer", totalToTreasury }, { status: 400 });
    }

    // Optional legacy DB update if provided
    if (paymentId) {
      await connectMongo();
      await Payment.updateOne({ _id: paymentId }, { $set: { txSig: signature, status: "confirmed" } });
    }

    const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
    const finishedAt = Date.now();
    console.log(`[confirm] verdict status=${status?.confirmationStatus ?? "unknown"} confirmations=${status?.confirmations ?? null} totalToTreasury=${totalToTreasury}`);
    console.log(`[confirm] done signature=${signature.slice(0,6)}...${signature.slice(-6)} end=${new Date(finishedAt).toISOString()} durationMs=${finishedAt-startedAt}`);
    return NextResponse.json({ ok:true, signature, explorerUrl, confirmations: status?.confirmations ?? null, finalStatus: status?.confirmationStatus ?? null, totalToTreasury, rpc: maskedRpc });
  } catch (e: unknown) {
    const msg = (e as Error)?.message || String(e);
    if (msg === "timeout") {
      return NextResponse.json({ ok:false, error: "timeout" }, { status: 504 });
    }
    console.error("[confirm] error:", msg);
    return NextResponse.json({ ok:false, error: msg }, { status: 500 });
  }
}


