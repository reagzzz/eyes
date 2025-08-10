import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/server/rate-limit";
import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import {
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
  createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";
import * as anchor from "@coral-xyz/anchor";
import type { AnchorProvider, Idl, Address, Program as AnchorProgram } from "@coral-xyz/anchor";
import { captureError } from "@/server/monitoring";
import { connectMongo } from "@/server/db/mongo";
import { Collection } from "@/server/db/models";
import fs from "fs";
import path from "path";

type MintBody = {
  wallet: string;
  metadataUri: string;
  name: string;
  symbol: string;
  collectionId?: string;
};

export async function POST(req: Request) {
  let step = "validate_body" as
    | "validate_body"
    | "setup_connection"
    | "load_configs"
    | "anchor_ix"
    | "metaplex_ixs"
    | "assemble_tx";

  let reqWallet: string | undefined;
  let reqCollectionId: string | undefined;
  try {
    const { wallet, metadataUri, name, symbol, collectionId } = (await req.json()) as Partial<MintBody>;
    reqWallet = wallet;
    reqCollectionId = collectionId;
    // Basic rate-limit: 5 req/min per IP and per wallet
    try {
      const ipHeader = (req as unknown as { headers?: { get?: (k: string) => string | null } })?.headers?.get?.("x-forwarded-for");
      const ip = ipHeader || "unknown";
      const ipKey = `rl:mint:ip:${ip}`;
      const wlKey = wallet ? `rl:mint:wl:${wallet}` : undefined;
      const resIp = await enforceRateLimit(ipKey, 5, 60);
      if (resIp && !resIp.ok) return NextResponse.json({ error: "rate_limited_ip" }, { status: 429 });
      if (wlKey) {
        const resWl = await enforceRateLimit(wlKey, 5, 60);
        if (resWl && !resWl.ok) return NextResponse.json({ error: "rate_limited_wallet" }, { status: 429 });
      }
    } catch {}
    if (!wallet || !metadataUri || !name || !symbol) {
      return NextResponse.json({ error: "Missing parameters", step }, { status: 400 });
    }

    step = "setup_connection";
    const connection = new Connection(
      process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl("devnet"),
      "confirmed"
    );

    step = "load_configs";
    const buyer = new PublicKey(wallet);
    const programId = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID!);
    const platformWallet = new PublicKey(process.env.NEXT_PUBLIC_PLATFORM_TREASURY_WALLET!);
    const creator = platformWallet; // TODO: replace with real creator from DB

    const initOutputPath = path.join(process.cwd(), "anchor-init-output.json");
    if (!fs.existsSync(initOutputPath)) {
      throw new Error("anchor-init-output.json not found");
    }
    const initData = JSON.parse(fs.readFileSync(initOutputPath, "utf8")) as {
      collectionSeed: string;
    };
    const collectionSeedPubkey = new PublicKey(initData.collectionSeed);

    const idlPath = path.join(process.cwd(), "anchor", "target", "idl", "mint_gate.json");
    if (!fs.existsSync(idlPath)) {
      throw new Error("IDL not found at anchor/target/idl/mint_gate.json");
    }
    const idl = JSON.parse(fs.readFileSync(idlPath, "utf8")) as Idl;

    const provider = new anchor.AnchorProvider(connection, {} as unknown as anchor.Wallet, { commitment: "confirmed" }) as AnchorProvider;
    type ProgramCtor = new (idl: Idl, programId: PublicKey, provider: AnchorProvider) => AnchorProgram;
    const ProgramCtor = (anchor.Program as unknown) as ProgramCtor;
    const program = new ProgramCtor(idl as Idl, programId, provider);

    // Derive PDAs to match on-chain seeds
    const [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("cfg"), collectionSeedPubkey.toBuffer()],
      programId
    );
    const [counterPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("ctr"), collectionSeedPubkey.toBuffer(), buyer.toBuffer()],
      programId
    );

    step = "anchor_ix";
    const payIx = await program.methods
      .payAndValidate()
      .accounts({
        buyer,
        creator,
        platform: platformWallet,
        config: configPDA,
        counter: counterPDA,
        collectionSeed: collectionSeedPubkey,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    step = "metaplex_ixs";
    const mintKeypair = Keypair.generate();
    const ata = await getAssociatedTokenAddress(mintKeypair.publicKey, buyer);

    const createMintIx = SystemProgram.createAccount({
      fromPubkey: buyer,
      newAccountPubkey: mintKeypair.publicKey,
      space: MINT_SIZE,
      lamports: await connection.getMinimumBalanceForRentExemption(MINT_SIZE),
      programId: TOKEN_PROGRAM_ID,
    });

    const initMintIx = createInitializeMintInstruction(
      mintKeypair.publicKey,
      0,
      buyer,
      buyer
    );
    const createAtaIx = createAssociatedTokenAccountInstruction(
      buyer,
      ata,
      buyer,
      mintKeypair.publicKey
    );

    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()],
      TOKEN_METADATA_PROGRAM_ID
    );

    const createMetadataIx = createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataPDA,
        mint: mintKeypair.publicKey,
        mintAuthority: buyer,
        payer: buyer,
        updateAuthority: buyer,
      },
      {
        createMetadataAccountArgsV3: {
          data: {
            name,
            symbol,
            uri: metadataUri,
            sellerFeeBasisPoints: 0,
            creators: null,
            collection: null,
            uses: null,
          },
          isMutable: true,
          collectionDetails: null,
        },
      }
    );

    // Collection linking disabled for now (version compatibility). We'll re-enable after confirming MPL types.

    step = "assemble_tx";
    const latestBlockhash = await connection.getLatestBlockhash();
    const instructions = [payIx, createMintIx, initMintIx, createAtaIx, createMetadataIx];
    const messageV0 = new TransactionMessage({
      payerKey: buyer,
      recentBlockhash: latestBlockhash.blockhash,
      instructions,
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([mintKeypair]);
    const txBase64 = Buffer.from(transaction.serialize()).toString("base64");

    return NextResponse.json({
      txBase64,
      recentBlockhash: latestBlockhash.blockhash,
      mintAddress: mintKeypair.publicKey.toBase58(),
    });
  } catch (e) {
    console.error("Mint error:", e);
    try { captureError(e, { route: "/api/mint/start", wallet: reqWallet, collectionId: reqCollectionId }); } catch {}
    return NextResponse.json(
      { error: (e as Error).message || "unknown_error", step },
      { status: 500 }
    );
  }
}


