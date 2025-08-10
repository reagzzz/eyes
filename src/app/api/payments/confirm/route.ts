import { NextRequest, NextResponse } from "next/server";
import { Payment } from "@/server/db/models";
import { connectMongo } from "@/server/db/mongo";

export async function POST(req: NextRequest){
  await connectMongo();
  const { paymentId, txSig } = await req.json();
  const p = await Payment.findById(paymentId);
  if(!p) return NextResponse.json({ error: "payment_not_found" }, { status: 404 });
  // TODO: vérifier réellement via RPC/Helius
  await Payment.updateOne({ _id: paymentId }, { $set: { txSig, status:"confirmed" }});
  return NextResponse.json({ ok:true });
}


