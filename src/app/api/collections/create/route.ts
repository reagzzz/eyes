// src/app/api/collections/create/route.ts
import 'server-only';
import { NextResponse } from "next/server";
import { createCollection } from "@/server/db";
import { z } from "zod";

const BodySchema = z.object({
  title: z.string().min(1),
  prompt: z.string().nullable().optional(),
  items: z.array(
    z.object({
      imageCid: z.string().min(1),
      metadataCid: z.string().min(1),
      imageUri: z.string().optional(),
      metadataUri: z.string().optional(),
    })
  ),
  payment: z
    .object({
      signature: z.string().min(1),
      totalLamports: z.number().int().nonnegative(),
      treasury: z.string().min(1),
    })
    .optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const data = BodySchema.parse(json);
    const doc = await createCollection({
      title: data.title,
      prompt: data.prompt ?? null,
      items: data.items,
      payment: data.payment,
    });
    return NextResponse.json({ ok: true, id: doc.id, item: doc }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'invalid' }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;


