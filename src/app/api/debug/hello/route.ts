import { NextResponse } from "next/server";
import { ALIAS_OK } from "@/utils/alias-test";

export async function GET() {
  console.log("[alias-test] ALIAS_OK:", ALIAS_OK);
  return NextResponse.json({ ok: true, msg: "hello-debug", alias: ALIAS_OK });
}


