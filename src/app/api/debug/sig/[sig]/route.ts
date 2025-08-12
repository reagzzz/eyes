import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

// Endpoint de debug: retourne simplement la signature passée dans l'URL.
// Si query ?full=1, renvoie un debug complet avec tx parsée et transferts vers la treasury.
export async function GET(
  req: NextRequest,
  ctx: { params: { sig?: string } }
) {
  // Next.js 15: params peut être asynchrone dans certains cas; pattern robuste:
  const sig = ctx?.params?.sig;
  if (!sig) {
    return NextResponse.json({ ok: false, error: "missing_signature" }, { status: 400 });
  }
  const full = req.nextUrl.searchParams.get("full") === "1";
  if (!full) {
    if (sig.toLowerCase() === "test") {
      return NextResponse.json({ ok: false, error: "missing_or_test_sig" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, signature: sig });
  }

  const rpc = (process.env.NEXT_PUBLIC_RPC_URL || "").trim();
  const connection = new Connection(rpc, { commitment: "confirmed" });
  try {
    const [st] = (await connection.getSignatureStatuses([sig], { searchTransactionHistory: true })).value;
    const tx = await connection.getParsedTransaction(sig, { maxSupportedTransactionVersion: 0, commitment: "confirmed" });
    const treasury = (process.env.NEXT_PUBLIC_PLATFORM_TREASURY_WALLET || "").trim();
    let totalToTreasury = 0;
    if (tx && treasury) {
      const trePk = new PublicKey(treasury).toBase58();
      type ParsedIx = { program?: string; parsed?: { type?: string; info?: Record<string, unknown> } };
      const outerIxs = (tx.transaction.message.instructions ?? []) as unknown as ParsedIx[];
      for (const ix of outerIxs) {
        if (ix.program === "system" && ix.parsed?.type === "transfer") {
          const dest = ix.parsed.info?.destination as string | undefined;
          const lamports = Number(ix.parsed.info?.lamports || 0);
          if (dest === trePk) totalToTreasury += lamports;
        }
      }
      const inner = tx.meta?.innerInstructions ?? [];
      for (const group of inner) {
        for (const ix of (group.instructions ?? []) as unknown as ParsedIx[]) {
          if (ix.program === "system" && ix.parsed?.type === "transfer") {
            const dest = ix.parsed.info?.destination as string | undefined;
            const lamports = Number(ix.parsed.info?.lamports || 0);
            if (dest === trePk) totalToTreasury += lamports;
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      signature: sig,
      status: st?.confirmationStatus ?? null,
      slot: st?.slot ?? null,
      err: st?.err ?? null,
      preBalances: tx?.meta?.preBalances ?? null,
      postBalances: tx?.meta?.postBalances ?? null,
      tokenBalances: tx?.meta?.postTokenBalances ?? null,
      innerInstructions: tx?.meta?.innerInstructions ?? null,
      transfersToTreasury: totalToTreasury,
      rpc,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}


