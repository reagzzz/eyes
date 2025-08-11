import { NextResponse } from "next/server";
import { getRpcUrl } from "@/server/solana/rpc";

export async function GET() {
  const rpc = getRpcUrl();
  try {
    const conn = new (await import("@solana/web3.js")).Connection(rpc, "confirmed");
    const { blockhash } = await conn.getLatestBlockhash();
    return NextResponse.json({ ok:true, rpc, blockhash });
  } catch (e:any) {
    return NextResponse.json({ ok:false, rpc, error: e.message }, { status: 500 });
  }
}


