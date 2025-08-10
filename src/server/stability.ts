// import { request } from "undici";

const API = "https://api.stability.ai/v2beta/stable-image/generate/core";

export async function generateImage({ prompt, n: _n, model, width, height }:{
  prompt:string; n:number; model:string; width:number; height:number;
}): Promise<Buffer[]> {
  const apiKey = process.env.STABILITY_API_KEY!;
  const form = new FormData();
  form.append("prompt", prompt);
  form.append("output_format", "png");
  form.append("model", model);
  form.append("width", String(width));
  form.append("height", String(height));
  form.append("samples", String(1));

  const res = await fetch(API, { method: "POST", headers: { "Authorization": `Bearer ${apiKey}` }, body: form as unknown as BodyInit });
  if(!res.ok) throw new Error(`Stability error ${res.status}: ${await res.text()}`);
  const buf = await res.arrayBuffer();
  return [Buffer.from(buf)];
}


