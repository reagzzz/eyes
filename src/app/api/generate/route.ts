import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/server/db/mongo";
import { Collection } from "@/server/db/models";
import { customAlphabet } from "nanoid";
import { uploadImageToPinata, uploadJSONToPinata } from "@/server/pinata";
import { captureError } from "@/server/monitoring";
import { generateImage } from "@/server/stability";

let generateQueue: { add: (name: string, data: unknown) => Promise<unknown> } | null = null;
if (process.env.UPSTASH_REDIS_REST_URL) {
  // Dynamic import to avoid bundling in environments without Redis
  try {
    const q = await import("@/server/redis");
    generateQueue = q.generateQueue as unknown as { add: (name: string, data: unknown) => Promise<unknown> };
  } catch {
    generateQueue = null;
  }
}

const nanoid = customAlphabet("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz", 10);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // 1) Turnstile verification (if sitekey configured, token must be provided)
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (siteKey && secret) {
      const token = String(body?.turnstileToken || "");
      if (!token) return NextResponse.json({ error: "missing_turnstile" }, { status: 400 });
      const ip = req.headers.get("x-forwarded-for") || undefined;
      const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token, remoteip: ip || "" }),
      });
      const verify = (await verifyRes.json()) as { success: boolean };
      if (!verify?.success) return NextResponse.json({ error: "turnstile_failed" }, { status: 400 });
    }
    const prompt = String(body?.prompt ?? "").trim();
    const count = Number(body?.count ?? 0);
    const model = String(body?.model ?? (process.env.STABILITY_DEFAULT_MODEL || "sd35-medium"));
    let collectionId: string | undefined = body?.collectionId;

    if (!prompt || !count || count < 1) {
      return NextResponse.json({ error: "invalid_params" }, { status: 400 });
    }

    await connectMongo();

    // Ensure a collection exists (create if not provided)
    if (!collectionId) {
      collectionId = nanoid();
      await Collection.create({
        _id: collectionId,
        title: "Untitled",
        prompt,
        creatorWallet: undefined,
        supply: count,
        mintPriceSol: 0,
        royaltyBps: 0,
        imageCIDs: [],
        metadataCIDs: [],
        status: "draft",
      });
    }

    const shouldQueue = Boolean(process.env.UPSTASH_REDIS_REST_URL);

    if (shouldQueue && generateQueue) {
      await generateQueue.add("generate", { collectionId, prompt, count, model });
      return NextResponse.json({ collectionId, queued: true });
    }

    // Inline execution (no queue configured)
    const imageCIDs: string[] = [];
    const metadataCIDs: string[] = [];

    for (let i = 0; i < count; i++) {
      const images = await generateImage({ prompt, n: 1, model, width: 500, height: 500 });
      for (const buf of images) {
        const cid = await uploadImageToPinata(buf);
        imageCIDs.push(cid);
        const meta = {
          name: `Item #${imageCIDs.length}`,
          description: prompt,
          image: `ipfs://${cid}`,
          attributes: [] as { trait_type?: string; value?: string }[],
        };
        const mCid = await uploadJSONToPinata(meta);
        metadataCIDs.push(mCid);
      }
    }

    await Collection.updateOne(
      { _id: collectionId },
      { $set: { imageCIDs, metadataCIDs, prompt, supply: count, status: "draft" } }
    );

    return NextResponse.json({ collectionId, queued: false, imageCIDs, metadataCIDs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "unknown_error";
    try { captureError(error, { route: "/api/generate" }); } catch {}
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


