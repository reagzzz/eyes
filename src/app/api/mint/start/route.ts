import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { composeMintTransaction } from "@/server/solana/build-tx";
import { MongoClient, ObjectId } from "mongodb";

async function getParentCollectionMintFromDB(id?: string | null): Promise<string | null> {
  try {
    if (!id) return null;
    const uri = process.env.MONGODB_URI;
    if (!uri) return null;
    const client = await MongoClient.connect(uri);
    const db = client.db(process.env.MONGODB_DB || "nftgen");
    const col = db.collection("collections");
    const doc = await col.findOne({ _id: new ObjectId(id) }, { projection: { parentCollectionMint: 1 } });
    await client.close();
    return (doc?.parentCollectionMint as string) || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest){
  try{
    const { wallet, metadataUri, name, symbol, collectionId } = await req.json();

    if(!wallet || !metadataUri || !name || !symbol){
      return NextResponse.json({ error: "missing_params" }, { status: 400 });
    }

    const rpc = process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl("devnet");
    const programIdStr = process.env.NEXT_PUBLIC_PROGRAM_ID;
    const platformStr = process.env.NEXT_PUBLIC_PLATFORM_TREASURY_WALLET;

    if(!programIdStr || !platformStr){
      return NextResponse.json({ error: "server_not_configured" }, { status: 500 });
    }

    const connection = new Connection(rpc, "confirmed");
    const buyer = new PublicKey(wallet);
    const programId = new PublicKey(programIdStr);
    const platform = new PublicKey(platformStr);

    const parentMintStr = await getParentCollectionMintFromDB(collectionId || null);
    const parentCollectionMint = parentMintStr ? new PublicKey(parentMintStr) : null;

    const { txBase64, recentBlockhash, mintAddress } = await composeMintTransaction({
      connection,
      programId,
      buyer,
      platform,
      metadataUri,
      name,
      symbol,
      parentCollectionMint
    });

    return NextResponse.json({ txBase64, recentBlockhash, mintAddress });
  }catch(e:any){
    console.error("/api/mint/start error:", e);
    return NextResponse.json({ error: e.message || "internal_error" }, { status: 500 });
  }
}


