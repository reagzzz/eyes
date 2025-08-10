import { NextRequest, NextResponse } from "next/server";
import { computeQuote } from "@/lib/pricing-server";
import { Payment } from "@/server/db/models";
import { connectMongo } from "@/server/db/mongo";
import { customAlphabet } from "nanoid";
const nanoid = customAlphabet("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz", 12);

export async function POST(req: NextRequest){
  await connectMongo();
  const { wallet, count, model } = await req.json();
  const { lamports, sol } = computeQuote({ count, model: model || process.env.STABILITY_DEFAULT_MODEL || "sd35-medium" });
  const reference = nanoid();
  const pay = await Payment.create({ wallet, lamports, count, model, reference, status:"pending" });
  return NextResponse.json({
    paymentId: pay._id.toString(),
    lamports,
    sol,
    treasury: process.env.NEXT_PUBLIC_PLATFORM_TREASURY_WALLET,
    reference,
    memo: `nftgen:${reference}`
  });
}


