import { NextRequest, NextResponse } from "next/server";
import { Payment } from "@/server/db/models";
import { connectMongo } from "@/server/db/mongo";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const body = await req.json().catch(() => ({}));
  const signature: string | undefined = body?.signature || body?.txSig;
  const expectedLamportsRaw: unknown = body?.expectedLamports;
  const treasuryStr: string | undefined = body?.treasury || (process.env.NEXT_PUBLIC_PLATFORM_TREASURY_WALLET || "").trim();
  const paymentId: string | undefined = body?.paymentId; // optional legacy

  if (!signature) {
    return NextResponse.json({ ok: false, error: "missing_signature" }, { status: 400 });
  }
  const expectedLamports = Number(expectedLamportsRaw);
  if (!Number.isFinite(expectedLamports) || expectedLamports <= 0) {
    return NextResponse.json({ ok: false, error: "invalid_expectedLamports" }, { status: 400 });
  }
  if (!treasuryStr) {
    return NextResponse.json({ ok: false, error: "invalid_treasury" }, { status: 400 });
  }

  const rpc = (process.env.NEXT_PUBLIC_RPC_URL || "").trim();
  const connection = new Connection(rpc, { commitment: "confirmed" });
  const maskedRpc = rpc.replace(/(api-key=)[^&]+/i, "$1***");
  console.log(`[confirm] rpc=${maskedRpc}`);
  console.log(`[confirm] signature=${signature.slice(0, 6)}...${signature.slice(-6)} start=${new Date(startedAt).toISOString()}`);

  const controller = new AbortController();
  let aborted = false;
  const timeout = setTimeout(() => {
    aborted = true;
    controller.abort();
  }, 120000);

  let status: any = null;
  let tick = 0;
  try {
    while (!aborted) {
      try {
        const res = await connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
        status = res.value[0];
        const slot = status?.slot ?? null;
        const confirmations = status?.confirmations ?? null;
        const confirmationStatus = status?.confirmationStatus ?? null;
        console.log(`[confirm] tick #${tick}: slot=${slot} confirmations=${confirmations} status=${confirmationStatus}`);
        if (status?.err) {
          return NextResponse.json({ ok: false, error: "tx_error", details: status.err }, { status: 400 });
        }
        if (confirmationStatus === "confirmed" || confirmationStatus === "finalized") {
          break;
        }
      } catch (e) {
        console.warn("[confirm] getSignatureStatuses error:", (e as Error)?.message || e);
      }
      tick += 1;
      await new Promise((r) => setTimeout(r, 1500));
    }

    if (aborted) {
      return NextResponse.json({ ok: false, error: "timeout" }, { status: 504 });
    }

    const parsed = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });
    if (!parsed) {
      console.warn("[confirm] parsed tx not found after confirmation");
      return NextResponse.json({ ok: false, error: "tx_not_found" }, { status: 404 });
    }

    const treasury = new PublicKey(treasuryStr);
    let totalToTreasury = 0;

    // Sum transfers from parsed outer + inner instructions
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

    // Fallback using balance diff if needed
    if (totalToTreasury === 0 && parsed.meta?.preBalances && parsed.meta?.postBalances) {
      const accountKeys = parsed.transaction.message.accountKeys.map((k: any) => (typeof k === "string" ? k : k.pubkey?.toString?.() ?? String(k)));
      const treIdx = accountKeys.indexOf(treasury.toBase58());
      if (treIdx >= 0) {
        const delta = (parsed.meta.postBalances[treIdx] || 0) - (parsed.meta.preBalances[treIdx] || 0);
        if (delta > 0) totalToTreasury += delta;
      }
    }

    console.log(`[confirm] parsed: totalToTreasury=${totalToTreasury} expectedLamports=${expectedLamports}`);

    // Allow small tolerance
    const tolerance = 5000;
    if (totalToTreasury + tolerance < expectedLamports) {
      return NextResponse.json(
        { ok: false, error: "missing_or_wrong_transfer", totalToTreasury },
        { status: 400 }
      );
    }

    // Optional legacy DB update if provided
    if (paymentId) {
      await connectMongo();
      await Payment.updateOne({ _id: paymentId }, { $set: { txSig: signature, status: "confirmed" } });
    }

    const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
    const finalStatus = status?.confirmationStatus || "unknown";
    console.log(`[confirm] result: ok signature=${signature.slice(0, 6)}...${signature.slice(-6)} status=${finalStatus} totalToTreasury=${totalToTreasury}`);
    return NextResponse.json({ ok: true, signature, explorerUrl, finalStatus, totalToTreasury, rpc: maskedRpc });
  } finally {
    clearTimeout(timeout);
  }
}

