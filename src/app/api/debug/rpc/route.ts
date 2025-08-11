import { NextResponse } from "next/server";
import { Connection } from "@solana/web3.js";

export async function GET(){
  const rpc = (process.env.NEXT_PUBLIC_RPC_URL || "").trim();
  try{
    if(!rpc || !rpc.startsWith("http")) {
      return NextResponse.json({ ok:false, rpc, error:"RPC env invalid" }, { status:500 });
    }
    const conn = new Connection(rpc, "confirmed");
    const { blockhash } = await conn.getLatestBlockhash();
    return NextResponse.json({ ok:true, rpc, blockhash });
  }catch(e:any){
    return NextResponse.json({ ok:false, rpc, error: e.message }, { status:500 });
  }
}


