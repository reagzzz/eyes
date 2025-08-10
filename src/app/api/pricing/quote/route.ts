import { NextRequest, NextResponse } from "next/server";
import { computeQuote } from "@/lib/pricing-server";

export async function POST(req: NextRequest) {
  const { count, model } = await req.json();
  const m = (model || process.env.STABILITY_DEFAULT_MODEL || "sd35-medium").toString();
  const q = computeQuote({ count: Number(count)||1, model: m });
  return NextResponse.json({ ...q, model: m });
}


