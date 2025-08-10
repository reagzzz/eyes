import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/server/db/mongo";
import { Payment, Collection } from "@/server/db/models";
import { customAlphabet } from "nanoid";
import { generateQueue } from "@/server/redis";
const nanoid = customAlphabet("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz", 10);

export async function POST(req: NextRequest){
  await connectMongo();
  const { paymentId, prompt, count, model } = await req.json();
  const pay = await Payment.findById(paymentId);
  if(!pay || pay.status!=="confirmed") return NextResponse.json({ error:"payment_not_confirmed" }, { status: 400 });

  const collectionId = nanoid();
  await Collection.create({
    _id: collectionId,
    title: "Untitled",
    prompt,
    creatorWallet: pay.wallet,
    supply: count,
    mintPriceSol: 0.01,
    royaltyBps: 0,
    imageCIDs: [],
    metadataCIDs: [],
    status: "draft"
  });

  await generateQueue.add("generate", { collectionId, prompt, count, model: model || process.env.STABILITY_DEFAULT_MODEL || "sd35-medium" });
  return NextResponse.json({ collectionId });
}


