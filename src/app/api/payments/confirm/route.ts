import { NextRequest, NextResponse } from "next/server";
import { Payment } from "@/server/db/models";
import { connectMongo } from "@/server/db/mongo";
import { Connection, PublicKey } from "@solana/web3.js";

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
  const maskedRpc = maskRpc(rpc);
  console.log(`[confirm] rpc=${maskedRpc}`);
  console.log(`[confirm] signature=${signature.slice(0, 6)}...${signature.slice(-6)} start=${new Date(startedAt).toISOString()}`);
  
  // Short wait (<= 25s) then respond immediately
  const shortDeadlineMs = 25000;
  let status: "pending" | "confirmed" | "finalized" | "err" = "pending";
  let lastSlot: number | null = null;
  const started = Date.now();
  while (Date.now() - started < shortDeadlineMs) {
    try {
      const res = await connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
      const st = res.value[0];
      lastSlot = st?.slot ?? null;
      const conf = st?.confirmationStatus ?? null;
      console.log(`[confirm] tick: slot=${lastSlot} status=${conf}`);
      if (st?.err) {
        return NextResponse.json({ ok: false, error: "tx_err", err: st.err }, { status: 400 });
      }
      if (conf === "confirmed") { status = "confirmed"; break; }
      if (conf === "finalized") { status = "finalized"; break; }
    } catch (e) {
      console.warn("[confirm] getSignatureStatuses error:", (e as Error)?.message || e);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
  if (status === "pending") {
    console.log(`[confirm] short-wait timeout -> pending; elapsedMs=${Date.now() - started}`);
    return NextResponse.json({ ok: true, pending: true, signature, explorerUrl, message: "still_pending" });
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

    return NextResponse.json({
      ok: true,
      pending: false,
      signature,
      explorerUrl,
      finalStatus: status,
      totalToTreasury,
      rpc: maskedRpc,
    });
}

