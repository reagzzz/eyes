import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export function GET(){
  return NextResponse.json({ ok: true, msg: "hello-debug" });
}

import { NextResponse } from "next/server";
export async function GET(){ return NextResponse.json({ ok:true, msg:"hello-debug" }); }


