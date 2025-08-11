import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/server/db/mongo";
import { Collection } from "@/server/db/models";
import { Connection, Keypair, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { MINT_SIZE, TOKEN_PROGRAM_ID, createInitializeMintInstruction } from "@solana/spl-token";
import { PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID, createCreateMetadataAccountV3Instruction } from "@metaplex-foundation/mpl-token-metadata";

export async function POST(req: NextRequest){
  try {
    await connectMongo();
    const { collectionId, title, mintPriceSol, symbol, wallet } = await req.json();
    if(!collectionId || !title || !wallet){
      return NextResponse.json({ error: "missing_params" }, { status: 400 });
    }

    const col = await Collection.findById(collectionId);
    if(!col) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if(col.status === "live" && col.parentCollectionMint){
      return NextResponse.json({ ok:true, parentCollectionMint: col.parentCollectionMint });
    }

    const rpc = process.env.NEXT_PUBLIC_RPC_URL!;
    const connection = new Connection(rpc, { commitment: "confirmed" });

    // Use the creator wallet as authority (client will sign)
    const authority = new PublicKey(wallet);

    // Build minimal metadata for parent collection NFT
    const metadataUri = `https://ipfs.io/ipfs/${col.metadataCIDs?.[0] ?? ""}`; // crude default; ideally prebuilt collection metadata

    const mintKeypair = Keypair.generate();

    const createMintIx = SystemProgram.createAccount({
      fromPubkey: authority,
      newAccountPubkey: mintKeypair.publicKey,
      space: MINT_SIZE,
      lamports: await connection.getMinimumBalanceForRentExemption(MINT_SIZE),
      programId: TOKEN_PROGRAM_ID,
    });
    const initMintIx = createInitializeMintInstruction(mintKeypair.publicKey, 0, authority, authority);

    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()],
      TOKEN_METADATA_PROGRAM_ID
    );

    const createMetadataIx = createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataPDA,
        mint: mintKeypair.publicKey,
        mintAuthority: authority,
        payer: authority,
        updateAuthority: authority,
      },
      {
        createMetadataAccountArgsV3: {
          data: {
            name: title,
            symbol: symbol || "COLL",
            uri: metadataUri,
            sellerFeeBasisPoints: 0,
            creators: null,
            collection: null,
            uses: null,
          },
          isMutable: true,
          // mark as collection details to make it a Collection NFT (v2 uses collection details on verify step, but we keep null here and will use setAndVerify later if needed)
          collectionDetails: null,
        },
      }
    );

    const blockhash = await connection.getLatestBlockhash();
    const msg = new TransactionMessage({
      payerKey: authority,
      recentBlockhash: blockhash.blockhash,
      instructions: [createMintIx, initMintIx, createMetadataIx],
    }).compileToV0Message();

    const tx = new VersionedTransaction(msg);
    // Partially sign with new mint keypair; creator will sign as payer on client
    tx.sign([mintKeypair]);

    const txBase64 = Buffer.from(tx.serialize()).toString("base64");

    // Optimistically store parent mint and set status live
    await Collection.updateOne(
      { _id: collectionId },
      { $set: { parentCollectionMint: mintKeypair.publicKey.toBase58(), mintPriceSol, status: "live" } }
    );

    return NextResponse.json({ ok:true, parentCollectionMint: mintKeypair.publicKey.toBase58(), txBase64, recentBlockhash: blockhash.blockhash });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "publish_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


