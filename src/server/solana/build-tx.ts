/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";
import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { AnchorProvider, Idl, Program, Wallet } from "@coral-xyz/anchor";
import { deriveConfigPDA, deriveCounterPDA } from "@/server/solana/mintgate";

export type PayAndValidateAccounts = {
  buyer: PublicKey;
  creator: PublicKey;
  platform: PublicKey;
  programId: PublicKey;
  collectionSeed: PublicKey;
};

export type CreateNftInput = {
  name: string;
  symbol: string;
  uri: string;
  owner: PublicKey;
};

export async function loadIdlFromDisk(): Promise<Idl> {
  const idlPath = path.join(process.cwd(), "anchor", "target", "idl", "mint_gate.json");
  const raw = await fs.promises.readFile(idlPath, "utf8");
  return JSON.parse(raw) as Idl;
}

function createAnchorProgram(connection: Connection, idl: Idl, programId: PublicKey): Program<Idl> {
  const dummyWallet: Wallet = {
    publicKey: PublicKey.default,
    // @ts-expect-error payer is required by NodeWallet type but unused here
    payer: {} as unknown as { publicKey: PublicKey },
    async signTransaction(tx) { return tx; },
    async signAllTransactions(txs) { return txs; },
  };
  const provider = new AnchorProvider(connection, dummyWallet, { commitment: "confirmed" });
  // Casting to Program<Idl> keeps type-safety where possible for dynamic IDL
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (Program as any)(idl as any, programId, provider) as unknown as Program<Idl>;
}

export async function buildPayAndValidateIx(
  connection: Connection,
  params: PayAndValidateAccounts,
): Promise<{ instruction: TransactionInstruction; configPda: PublicKey; counterPda: PublicKey }>{
  const { buyer, creator, platform, programId, collectionSeed } = params;
  const idl = await loadIdlFromDisk();
  const program = createAnchorProgram(connection, idl, programId);

  const [configPda] = deriveConfigPDA(collectionSeed, programId);
  const [counterPda] = deriveCounterPDA(collectionSeed, buyer, programId);

  const ix = await program.methods
    // method has no args
    .payAndValidate()
    .accounts({
      buyer,
      creator,
      platform,
      config: configPda,
      counter: counterPda,
      collectionSeed,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  return { instruction: ix, configPda, counterPda };
}

export async function buildCreateNftIxs(
  _connection: Connection,
  input: CreateNftInput,
): Promise<{ instructions: TransactionInstruction[]; mint: PublicKey }>{
  // TODO: Implement via @metaplex-foundation/js builders once client can supply mint signer.
  // Creating a new Mint account requires an additional signer beyond the wallet.
  // For now, return no-op instructions and a placeholder mint (derived as a new PublicKey from owner bytes).
  // This allows the transaction to be signed solely by the wallet while we iterate on the flow.

  // Use a deterministic, but obviously-not-real placeholder tied to the owner for UI continuity.
  const mint = PublicKey.findProgramAddressSync([
    Buffer.from("placeholder-mint"),
    input.owner.toBuffer(),
  ], SystemProgram.programId)[0];

  return { instructions: [], mint };
}


