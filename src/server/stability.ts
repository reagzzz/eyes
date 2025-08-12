import { PNG } from "pngjs";

const API = "https://api.stability.ai/v2beta/stable-image/generate/core";

export type StabilityModel = "sd35-large" | "sd35-large-turbo" | "sd35-medium" | "sd35-flash" | "sdxl-1.0";

export interface GenParams {
  prompt: string;
  count: number;
  model?: StabilityModel;
  width?: number;
  height?: number;
}

export async function generateImages(params: GenParams): Promise<Buffer[]> {
  const prompt = params.prompt;
  const count = Math.max(1, Number(params.count || 1) | 0);
  const width = Number(params.width || process.env.IMAGE_WIDTH || 500) | 0 || 500;
  const height = Number(params.height || process.env.IMAGE_HEIGHT || 500) | 0 || 500;
  const model = (params.model || (process.env.STABILITY_DEFAULT_MODEL as StabilityModel) || "sd35-medium") as StabilityModel;

  const apiKey = (process.env.STABILITY_API_KEY || "").trim();

  // Try remote generation if API key provided; otherwise fallback to local
  if (apiKey) {
    try {
      const results: Buffer[] = [];
      for (let i = 0; i < count; i++) {
        const form = new FormData();
        form.append("prompt", prompt);
        form.append("output_format", "png");
        form.append("model", model);
        form.append("width", String(width));
        form.append("height", String(height));
        form.append("samples", String(1));

        const res = await fetch(API, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: form as unknown as BodyInit,
        });
        if (!res.ok) {
          const body = await safeText(res);
          throw Object.assign(new Error(`remote_error ${res.status}: ${body}`), { where: "stability", status: res.status });
        }
        const buf = await res.arrayBuffer();
        results.push(Buffer.from(buf));
      }
      return results;
    } catch (e: unknown) {
      // Fall through to local fallback
      // eslint-disable-next-line no-console
      console.warn("[stability] remote failed, using fallback:", (e as Error)?.message || e);
    }
  }

  // Local fallback: generate solid PNGs with simple color variations
  try {
    const results: Buffer[] = [];
    for (let i = 0; i < count; i++) {
      const { r, g, b } = colorFrom(prompt, i);
      const png = new PNG({ width, height });
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (width * y + x) << 2;
          png.data[idx] = r;
          png.data[idx + 1] = g;
          png.data[idx + 2] = b;
          png.data[idx + 3] = 255;
        }
      }
      // Optionally add a subtle corner marker derived from prompt length
      const mark = Math.min(20, Math.max(5, prompt.length % 20));
      for (let y = 0; y < mark; y++) {
        for (let x = 0; x < mark; x++) {
          const idx = (width * y + x) << 2;
          png.data[idx] = 255 - r;
          png.data[idx + 1] = 255 - g;
          png.data[idx + 2] = 255 - b;
          png.data[idx + 3] = 255;
        }
      }
      const buffer: Buffer = PNG.sync.write(png);
      results.push(buffer);
    }
    return results;
  } catch (e: unknown) {
    const err = e as Error;
    throw Object.assign(new Error(err?.message || "fallback_failed"), { where: "stability" });
  }
}

function colorFrom(input: string, index: number): { r: number; g: number; b: number } {
  let h = 2166136261 ^ index;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  const r = (h >>> 16) & 0xff;
  const g = (h >>> 8) & 0xff;
  const b = h & 0xff;
  return { r, g, b };
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}


