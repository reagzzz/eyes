const API_KEY = (process.env.STABILITY_API_KEY || "").trim();
const DEFAULT_MODEL = (process.env.STABILITY_DEFAULT_MODEL || "sd35-medium").toString();

export type GenRequest = { prompt: string; count?: number; model?: string; width?: number; height?: number };

export async function generateImagesStability(req: GenRequest): Promise<Buffer[]> {
  if (!API_KEY) throw new Error("Missing STABILITY_API_KEY");
  const model = (req.model || DEFAULT_MODEL).toString();
  const count = Math.max(1, Math.min(req.count ?? 1, 8));
  const url = `https://api.stability.ai/v2beta/stable-image/generate/core`;

  const images: Buffer[] = [];
  for (let i = 0; i < count; i++) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        Accept: "image/*",
      },
      body: (() => {
        const fd = new FormData();
        fd.append("prompt", req.prompt);
        fd.append("model", model);
        fd.append("output_format", "png");
        if (req.width) fd.append("width", String(req.width));
        if (req.height) fd.append("height", String(req.height));
        return fd;
      })(),
    });
    if (!res.ok) throw new Error(`stability generate ${res.status}: ${await res.text()}`);
    const arrBuf = await res.arrayBuffer();
    images.push(Buffer.from(arrBuf));
  }
  return images;
}


