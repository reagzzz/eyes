import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { computeQuote } from "@/lib/pricing-server";
import { getConnection, getRpcUrl } from "@/server/solana/rpc";
import { waitForConfirmation, fetchParsedTx } from "@/server/solana/confirm";
import { generateImages } from "@/server/stability";
import { pinFileToIPFS, pinJSONToIPFS } from "@/server/pinata";
import { connectMongo } from "@/server/db/mongo";
import { Collection } from "@/server/db/models";

type Body = {
  prompt: string;
  count: number;
  model?: string;
  payer: string;
  signature: string;
  expectedLamports: number;
};

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const rpc = getRpcUrl();
  const maskedRpc = rpc.replace(/(api-key=)[^&]+/i, "$1***");

  try {
    const body: Body = await req.json();

    // Basic validation
    if (!body || typeof body.prompt !== "string" || !body.prompt.trim()) {
      return NextResponse.json({ ok: false, step: "validate", message: "invalid_prompt" }, { status: 400 });
    }
    const count = Number(body.count);
    if (!Number.isFinite(count) || count < 1 || count > 10000) {
      return NextResponse.json({ ok: false, step: "validate", message: "invalid_count" }, { status: 400 });
    }
    const payerStr = String(body.payer || "").trim();
    const signature = String(body.signature || "").trim();
    const expectedLamports = Number(body.expectedLamports);
    if (!payerStr || !signature || !Number.isFinite(expectedLamports) || expectedLamports <= 0) {
      return NextResponse.json({ ok: false, step: "validate", message: "missing_params" }, { status: 400 });
    }

    // Price check
    const model = (body.model || process.env.STABILITY_DEFAULT_MODEL || "sd35-medium").toString();
    const quote = computeQuote({ count, model });
    const diff = Math.abs(quote.lamports - expectedLamports) / Math.max(1, quote.lamports);
    console.log(`[create] rpc=${maskedRpc} model=${model} count=${count} quoteLamports=${quote.lamports} expectedLamports=${expectedLamports} diff=${(diff*100).toFixed(2)}%`);
    if (diff > 0.02) {
      return NextResponse.json({ ok: false, step: "price_check", message: "price_mismatch", quoteLamports: quote.lamports }, { status: 400 });
    }

    // Transaction revalidation
    const connection = getConnection("confirmed");
    const payer = new PublicKey(payerStr);
    console.log(`[create] confirm signature=${signature.slice(0,6)}...${signature.slice(-6)}`);
    await waitForConfirmation(connection, signature, { timeoutMs: 60000, commitment: "confirmed" });
    const parsed = await fetchParsedTx(connection, signature);
    if (!parsed) {
      return NextResponse.json({ ok: false, step: "confirm", message: "tx_not_found" }, { status: 404 });
    }
    const treasuryStr = (process.env.NEXT_PUBLIC_PLATFORM_TREASURY_WALLET || "").trim();
    if (!treasuryStr) {
      return NextResponse.json({ ok:false, step: "confirm", message: "server_env_missing_treasury" }, { status: 500 });
    }
    const treasury = new PublicKey(treasuryStr);

    // Ensure payer signed
    const accountKeys = parsed.transaction.message.accountKeys.map((k) => (typeof k === "string" ? k : (k as any).pubkey?.toBase58 ? (k as any).pubkey.toBase58() : String(k)));
    const signerIndexes = parsed.transaction.message.accountKeys
      .map((k: any, i: number) => ({ k, i }))
      .filter((x) => Boolean((typeof x.k === "object" && (x.k as any).signer) || false))
      .map((x) => x.i);
    const payerWasSigner = signerIndexes.some((i) => accountKeys[i] === payer.toBase58());
    if (!payerWasSigner) {
      return NextResponse.json({ ok: false, step: "confirm", message: "payer_not_signer" }, { status: 402 });
    }

    // Sum all transfers to treasury
    let totalToTreasury = 0;
    type ParsedIx = { program?: string; parsed?: { type?: string; info?: Record<string, unknown> } };
    const outerIxs = (parsed.transaction.message.instructions ?? []) as unknown as ParsedIx[];
    for (const ix of outerIxs) {
      if (ix.program === "system" && ix.parsed?.type === "transfer") {
        const dest = (ix.parsed.info as any)?.destination;
        const lamports = Number((ix.parsed.info as any)?.lamports || 0);
        if (dest === treasury.toBase58()) totalToTreasury += lamports;
      }
    }
    const inner = parsed.meta?.innerInstructions ?? [];
    for (const group of inner) {
      for (const ix of (group.instructions ?? []) as unknown as ParsedIx[]) {
        if (ix.program === "system" && ix.parsed?.type === "transfer") {
          const dest = (ix.parsed.info as any)?.destination;
          const lamports = Number((ix.parsed.info as any)?.lamports || 0);
          if (dest === treasury.toBase58()) totalToTreasury += lamports;
        }
      }
    }
    if (totalToTreasury < expectedLamports) {
      return NextResponse.json({ ok: false, step: "confirm", message: "missing_or_wrong_transfer", totalToTreasury }, { status: 402 });
    }
    console.log(`[create] tx ok: toTreasury=${totalToTreasury}`);

    // Generate images
    let images: Buffer[];
    try {
      images = await generateImages({ prompt: body.prompt, count, model, width: Number(process.env.IMAGE_WIDTH)||undefined, height: Number(process.env.IMAGE_HEIGHT)||undefined });
    } catch (e) {
      const msg = (e as Error)?.message || String(e);
      return NextResponse.json({ ok: false, step: "generate", message: msg }, { status: 500 });
    }
    console.log(`[create] generated images: ${images.length}`);

    // Upload to Pinata
    const now = Date.now();
    const imageCIDs: string[] = [];
    const metadataUris: string[] = [];
    for (let i = 0; i < images.length; i++) {
      const buf = images[i];
      const filename = `img-${now}-${i+1}.png`;
      const imageCid = await pinFileToIPFS(buf, filename);
      imageCIDs.push(imageCid);
      const meta = {
        name: `${body.prompt} #${i + 1}`,
        symbol: "EYES",
        image: `ipfs://${imageCid}`,
        attributes: [] as Array<unknown>,
      };
      const jsonCid = await pinJSONToIPFS(meta);
      metadataUris.push(`ipfs://${jsonCid}`);
    }
    console.log(`[create] uploads ok: images=${imageCIDs.length} metadata=${metadataUris.length}`);

    // DB insert
    try {
      await connectMongo();
      const doc = await Collection.create({
        title: body.prompt,
        imageCIDs,
        metadataUris,
        mintPriceSol: Number(process.env.PRICING_MIN_SOL) || 0.01,
        royaltyBps: 0,
        status: "live",
        createdBy: payer.toBase58(),
        txSignature: signature,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      const dt = Date.now() - t0;
      console.log(`[create] saved id=${doc._id?.toString?.() ?? String(doc._id)} durationMs=${dt}`);
      return NextResponse.json({ ok: true, collectionId: String(doc._id), count, metadataUris });
    } catch (e) {
      const msg = (e as Error)?.message || String(e);
      return NextResponse.json({ ok: false, step: "db", message: msg }, { status: 500 });
    }
  } catch (e) {
    const msg = (e as Error)?.message || String(e);
    return NextResponse.json({ ok: false, step: "server", message: msg }, { status: 500 });
  }
}


