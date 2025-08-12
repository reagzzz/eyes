import { NextRequest, NextResponse } from "next/server";
import { generateImagesStability } from "@/server/ai/stability";
import { generateImages } from "@/server/stability";
import { uploadToPinataFile, uploadToPinataJSON } from "@/server/ipfs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const prompt = (body.prompt || "").toString().trim();
    const count = Number(body.count ?? 1);
    const model = body.model?.toString();

    if (!prompt) return NextResponse.json({ ok:false, error:"missing_prompt" }, { status: 400 });

    let pngs: Buffer[] = [];
    const hasApiKey = Boolean((process.env.STABILITY_API_KEY || "").trim());
    if (hasApiKey) {
      try {
        pngs = await generateImagesStability({ prompt, count, model });
      } catch (e) {
        console.warn("[/api/generate] stability failed, fallback local:", (e as Error)?.message || e);
        pngs = await generateImages({ prompt, count, model: (model as any) });
      }
    } else {
      pngs = await generateImages({ prompt, count, model: (model as any) });
    }

    const items: Array<{ imageCid: string; metadataCid: string; imageUri: string; metadataUri: string }> = [];
    for (let i = 0; i < pngs.length; i++) {
      const imageCid = await uploadToPinataFile(pngs[i], `gen-${Date.now()}-${i}.png`);
      const imageUri = `ipfs://${imageCid}`;
      const meta = {
        name: `AI NFT #${i+1}`,
        description: `Generated with model ${model ?? "default"} from prompt: ${prompt}`,
        image: imageUri,
        attributes: [{ trait_type: "model", value: model ?? "default" }],
      };
      const metadataCid = await uploadToPinataJSON(meta);
      const metadataUri = `ipfs://${metadataCid}`;
      items.push({ imageCid, metadataCid, imageUri, metadataUri });
    }

    return NextResponse.json({ ok:true, items });
  } catch (e:any) {
    console.error("[/api/generate] error", e);
    return NextResponse.json({ ok:false, error: e?.message ?? "error" }, { status: 500 });
  }
}


