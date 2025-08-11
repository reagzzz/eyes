import { Connection, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getConnection, getRpcUrl } from "@/server/solana/rpc";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  MINT_SIZE,
} from "@solana/spl-token";
import {
  PROGRAM_ID as TMETA_PROGRAM_ID,
  createCreateMetadataAccountV3Instruction,
  createCreateMasterEditionV3Instruction,
  createSetAndVerifyCollectionInstruction,
} from "@metaplex-foundation/mpl-token-metadata";
import * as anchor from "@coral-xyz/anchor";
import fs from "fs";
import path from "path";

type BuildMintTxParams = {
  connection: Connection;
  programId: PublicKey;
  buyer: PublicKey;
  platform: PublicKey;
  metadataUri: string;
  name: string;
  symbol: string;
  // optionnels
  parentCollectionMint?: PublicKey | null;
};

export async function readCollectionSeed(): Promise<Buffer> {
  const p = path.join(process.cwd(), "anchor-init-output.json");
  if (!fs.existsSync(p)) throw new Error("anchor-init-output.json not found");
  const json = JSON.parse(fs.readFileSync(p, "utf8"));
  const seed = json?.collectionSeed;
  if (!seed) throw new Error("collectionSeed missing in anchor-init-output.json");
  // seed est un base58; on veut un PublicKey -> bytes
  const pk = new PublicKey(seed);
  return pk.toBytes();
}

export function deriveConfigPDA(programId: PublicKey, collectionSeedBytes: Buffer){
  const [pda] = PublicKey.findProgramAddressSync([collectionSeedBytes], programId);
  return pda;
}

export async function buildPayAndValidateIx(
  connection: Connection,
  programId: PublicKey,
  buyer: PublicKey,
  platform: PublicKey,
  collectionSeedBytes: Buffer
){
  // Provider Anchor "light" pour juste construire l'ix
  const coder = new anchor.BorshCoder(
    JSON.parse(fs.readFileSync(path.join(process.cwd(), "anchor/target/idl/mint_gate.json"), "utf8"))
  ) as unknown as anchor.Coder;
  const provider = new anchor.AnchorProvider(connection, {} as any, { commitment: "confirmed" });
  const program = new anchor.Program(JSON.parse(fs.readFileSync(path.join(process.cwd(), "anchor/target/idl/mint_gate.json"), "utf8")) as any, programId, provider, coder);

  const config = deriveConfigPDA(programId, collectionSeedBytes);

  const ix = await program.methods
    .payAndValidate()
    .accounts({
      buyer,
      creator: platform,
      platform,
      config,
      systemProgram: SystemProgram.programId
    })
    .instruction();

  return ix;
}

export async function buildCreateNftIxs(
  connection: Connection,
  buyer: PublicKey,
  metadataUri: string,
  name: string,
  symbol: string,
  parentCollectionMint?: PublicKey | null
){
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;

  // 1) Compte mint
  const rent = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
  const createMintIx = SystemProgram.createAccount({
    fromPubkey: buyer,
    newAccountPubkey: mint,
    space: MINT_SIZE,
    lamports: rent,
    programId: TOKEN_PROGRAM_ID,
  });

  // 2) Init mint (decimals 0, buyer = mint & freeze authority)
  const initMintIx = createInitializeMintInstruction(mint, 0, buyer, buyer);

  // 3) ATA du buyer
  const ata = await getAssociatedTokenAddress(mint, buyer);
  const createAtaIx = createAssociatedTokenAccountInstruction(buyer, ata, buyer, mint);

  // 4) Mint 1 token
  const mintToIx = createMintToInstruction(mint, ata, buyer, 1);

  // 5) Metadata
  const [metadataPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), TMETA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    TMETA_PROGRAM_ID
  );

  const metadataIx = createCreateMetadataAccountV3Instruction(
    {
      metadata: metadataPda,
      mint,
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
          sellerFeeBasisPoints: 0, // 0% royalties
          creators: null,
          collection: null,
          uses: null,
        },
        isMutable: true,
        collectionDetails: null,
      },
    }
  );

  // 6) Master Edition (1/1)
  const [masterEditionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), TMETA_PROGRAM_ID.toBuffer(), mint.toBuffer(), Buffer.from("edition")],
    TMETA_PROGRAM_ID
  );

  const masterEditionIx = createCreateMasterEditionV3Instruction(
    {
      edition: masterEditionPda,
      metadata: metadataPda,
      updateAuthority: buyer,
      mint,
      mintAuthority: buyer,
      payer: buyer,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    },
    { createMasterEditionArgs: { maxSupply: 0 } } // 0 => collection 1/1
  );

  const ixs = [createMintIx, initMintIx, createAtaIx, mintToIx, metadataIx, masterEditionIx];

  // 7) Optionnel: set & verify collection si parent fourni
  if (parentCollectionMint) {
    const [parentMetadata] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TMETA_PROGRAM_ID.toBuffer(), parentCollectionMint.toBuffer()],
      TMETA_PROGRAM_ID
    );
    const setColIx = createSetAndVerifyCollectionInstruction(
      {
        metadata: metadataPda,
        collectionAuthority: buyer,        // ⚠️ doit être l’authority de la collection parent (adapter si nécessaire)
        payer: buyer,
        updateAuthority: buyer,
        collectionMint: parentCollectionMint,
        collection: parentMetadata,
        collectionMasterEditionAccount: PublicKey.findProgramAddressSync(
          [Buffer.from("metadata"), TMETA_PROGRAM_ID.toBuffer(), parentCollectionMint.toBuffer(), Buffer.from("edition")],
          TMETA_PROGRAM_ID
        )[0],
      },
      {}
    );
    ixs.push(setColIx);
  }

  return { ixs, mintKeypair, mintAddress: mint };
}

export async function composeMintTransaction(params: BuildMintTxParams) {
  const { connection, programId, buyer, platform, metadataUri, name, symbol, parentCollectionMint } = params;

  // pay_and_validate
  const seedBytes = await readCollectionSeed();
  const payIx = await buildPayAndValidateIx(connection, programId, buyer, platform, seedBytes);

  // build NFT ixs
  const { ixs: nftIxs, mintKeypair, mintAddress } = await buildCreateNftIxs(connection, buyer, metadataUri, name, symbol, parentCollectionMint || undefined);

  const latest = await connection.getLatestBlockhash();
  const msg = new TransactionMessage({
    payerKey: buyer,
    recentBlockhash: latest.blockhash,
    instructions: [payIx, ...nftIxs],
  }).compileToV0Message();

  const tx = new VersionedTransaction(msg);
  // Le serveur signe UNIQUEMENT le mint (nouvelle clé) — le wallet utilisateur signera le reste.
  tx.sign([mintKeypair]);

  const txBase64 = Buffer.from(tx.serialize()).toString("base64");
  return { txBase64, recentBlockhash: latest.blockhash, mintAddress: mintAddress.toBase58() };
}


