import * as fs from "fs";
import * as path from "path";
import * as anchor from "@coral-xyz/anchor";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

async function main() {
  // 1) ENV + provider
  const RPC = required("NEXT_PUBLIC_RPC_URL");
  const PROGRAM_ID = required("NEXT_PUBLIC_PROGRAM_ID");
  const PLATFORM = required("NEXT_PUBLIC_PLATFORM_TREASURY_WALLET");
  const { PublicKey, SystemProgram, Keypair, Connection } = anchor.web3 as typeof import("@solana/web3.js");
  const connection = new Connection(RPC, "confirmed");
  const walletPath = process.env.ANCHOR_WALLET || path.join(process.env.HOME || "", ".config/solana/id.json");
  const secret = Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")));
  const wallet = Keypair.fromSecretKey(secret);
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), { commitment: "confirmed" });
  anchor.setProvider(provider);

  // 2) IDL 0.31 + BorshCoder
  const idlPath = path.resolve(__dirname, "../target/idl/mint_gate.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const coder = new anchor.BorshCoder(idl as any);

  // 3) Params init_collection
  const priceLamports = new anchor.BN(10_000_000); // 0.01 SOL minimum
  const startTime = new anchor.BN(Math.floor(Date.now()/1000)); // now
  const perWalletLimit = 3; // modifiable
  // collection_id: 32 bytes aléatoires (affichés en hex pour que l'app puisse le stocker)
  const collectionId = anchor.utils.bytes.utf8.encode(Keypair.generate().publicKey.toBase58()).slice(0,32);
  while(collectionId.length < 32) (collectionId as any).push(0);

  // 4) Derive PDA config avec un "collectionSeed" public key (stable)
  // On génère une clé dédiée pour servir de graine externe (non signée)
  const collectionSeedKp = Keypair.generate();
  const collectionSeed = collectionSeedKp.publicKey;
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("cfg"), collectionSeed.toBuffer()],
    new PublicKey(PROGRAM_ID)
  );

  // 5) Build instruction using coder.instruction (discriminator included)
  const data = coder.instruction.encode("init_collection", {
    price_lamports: priceLamports,
    start_time: startTime,
    per_wallet_limit: perWalletLimit,
    collection_id: Array.from(collectionId) as number[],
  });

  const ix = new anchor.web3.TransactionInstruction({
    programId: new PublicKey(PROGRAM_ID),
    keys: [
      { pubkey: provider.wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: provider.wallet.publicKey, isSigner: false, isWritable: false },
      { pubkey: new PublicKey(PLATFORM), isSigner: false, isWritable: false },
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: collectionSeed, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  const tx = new anchor.web3.Transaction().add(ix);
  tx.feePayer = provider.wallet.publicKey;
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  const signed = await provider.wallet.signTransaction(tx);
  const txSig = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(txSig, "confirmed");

  // 6) Sortie
  const collectionIdHex = Buffer.from(collectionId).toString("hex");
  console.log("✅ init_collection done");
  console.log("Program ID:", PROGRAM_ID);
  console.log("Tx:", txSig);
  console.log("collectionSeed:", collectionSeed.toBase58());
  console.log("collection_id (hex):", collectionIdHex);

  // Écrit un fichier de sortie pour que le front/API puissent le consommer si besoin
  const out = { programId: PROGRAM_ID, tx: txSig, collectionSeed: collectionSeed.toBase58(), collectionIdHex };
  const outPath = path.resolve(process.cwd(), "anchor-init-output.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
}
main().catch((e)=>{ console.error(e); process.exit(1); });


