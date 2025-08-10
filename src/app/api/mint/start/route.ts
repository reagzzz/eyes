import { NextRequest, NextResponse } from "next/server";
import { PublicKey, Connection, VersionedTransaction } from "@solana/web3.js";
import { deriveConfigPDA } from "@/server/solana/mintgate";
import { connectMongo } from "@/server/db/mongo";
import { Collection } from "@/server/db/models";

// NOTE: For a production-grade build, you'd compose the Anchor instruction via @coral-xyz/anchor here
// and Metaplex mint instructions. Here we return a placeholder until program deployment.

export async function POST(req: NextRequest){
  await connectMongo();
  const { collectionId, buyer } = await req.json();
  const col = await Collection.findById(collectionId).lean();
  if(!col) return NextResponse.json({ error:"not_found" }, { status:404 });

  const rpc = process.env.NEXT_PUBLIC_RPC_URL!;
  const connection = new Connection(rpc, { commitment: "confirmed" });
  const programId = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID!);
  const collectionSeed = new PublicKey(PublicKey.default.toBytes()); // placeholder seed
  const [cfgPda] = deriveConfigPDA(collectionSeed, programId);

  // TODO: build Anchor ix + metaplex mint ix and pack into a VersionedTransaction
  // Temporary placeholder: return minimal envelope so front can show a message
  return NextResponse.json({
    message: "Mint route stub: deploy Anchor program and complete ix composition",
    programId: programId.toBase58(),
    configPda: cfgPda.toBase58(),
    collectionId,
    buyer,
  });
}


