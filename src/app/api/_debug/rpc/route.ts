import { NextResponse } from "next/server";
import { Connection } from "@solana/web3.js";

export async function GET() {
  try {
    const rpc = process.env.NEXT_PUBLIC_RPC_URL || "";
    const conn = new Connection(rpc, "confirmed");
    const { blockhash } = await conn.getLatestBlockhash();
    return NextResponse.json({ ok: true, rpc, blockhash });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message, rpc: process.env.NEXT_PUBLIC_RPC_URL || "" }, { status: 500 });
  }
}


