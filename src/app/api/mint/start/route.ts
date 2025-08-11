import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";

export async function POST(req: NextRequest){
  try{
    const { wallet, lamports } = (await req.json()) as { wallet: string; lamports?: number };
    if(!wallet) return NextResponse.json({ error:"missing wallet" }, { status:400 });

    const rpc = (process.env.NEXT_PUBLIC_RPC_URL || "").trim();
    const to = (process.env.NEXT_PUBLIC_PLATFORM_TREASURY_WALLET || "").trim();
    if(!rpc || !to) return NextResponse.json({ error:"server_env_missing" }, { status:500 });

    const connection = new Connection(rpc, "confirmed");
    const fromPk = new PublicKey(wallet);
    const toPk = new PublicKey(to);

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

    const amount = Math.max(10000, Number(lamports||0) | 0);
    const ix = SystemProgram.transfer({ fromPubkey: fromPk, toPubkey: toPk, lamports: amount });

    const msg = new TransactionMessage({
      payerKey: fromPk,
      recentBlockhash: blockhash,
      instructions: [ix],
    }).compileToV0Message();

    const tx = new VersionedTransaction(msg);
    const txb64 = Buffer.from(tx.serialize({ requireAllSignatures:false })).toString("base64");

    return NextResponse.json({ ok:true, tx: txb64, blockhash, lastValidBlockHeight });
  }catch(e:any){
    return NextResponse.json({ ok:false, error: e.message ?? "compose_failed" }, { status:500 });
  }
}


