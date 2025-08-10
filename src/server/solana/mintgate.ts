import { PublicKey } from "@solana/web3.js";

export function deriveConfigPDA(collectionSeed: PublicKey, programId: PublicKey){
  return PublicKey.findProgramAddressSync([Buffer.from("cfg"), collectionSeed.toBuffer()], programId);
}
export function deriveCounterPDA(collectionSeed: PublicKey, buyer: PublicKey, programId: PublicKey){
  return PublicKey.findProgramAddressSync([Buffer.from("ctr"), collectionSeed.toBuffer(), buyer.toBuffer()], programId);
}

// Pay-and-validate instruction is built inside the API using Anchor client.


