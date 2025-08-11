import { NextResponse } from "next/server";
import { getRpcUrl } from "@/server/solana/rpc";
export async function GET(){
  return NextResponse.json({ rpc: getRpcUrl() });
}


