// Lightweight Upstash REST rate limiter (Edge/Node compatible)

type RateLimitResult = { allowed: boolean; current: number };

function getUpstashRest(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

export async function rateLimitIncrement(
  key: string,
  windowSeconds: number
): Promise<RateLimitResult | null> {
  const cfg = getUpstashRest();
  if (!cfg) return null;

  // Use pipeline to INCR and set EXPIRE when first seen
  const body = JSON.stringify([
    ["INCR", key],
    ["EXPIRE", key, String(windowSeconds)],
  ]);

  const res = await fetch(`${cfg.url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "application/json",
    },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Upstash pipeline error ${res.status}`);
  }

  const data = (await res.json()) as Array<{ result: number }>;
  const current = Number(data?.[0]?.result || 0);
  return { allowed: true, current };
}

export async function enforceRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ ok: boolean; remaining?: number; current?: number } | null> {
  const res = await rateLimitIncrement(key, windowSeconds);
  if (!res) return null; // no limiter configured
  const { current } = res;
  return { ok: current <= limit, remaining: Math.max(0, limit - current), current };
}


