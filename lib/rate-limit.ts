type Bucket = { count: number; resetAt: number };

const memoryStore = new Map<string, Bucket>();

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const LIMIT = Number(process.env.RATE_LIMIT_PER_HOUR ?? 20);
const WINDOW_MS = 60 * 60 * 1000;

async function kvIncr(key: string): Promise<number | null> {
  if (!KV_URL || !KV_TOKEN) return null;
  const res = await fetch(`${KV_URL}/incr/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { result: number };
  if (data.result === 1) {
    await fetch(`${KV_URL}/expire/${encodeURIComponent(key)}/3600`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
      cache: "no-store",
    });
  }
  return data.result;
}

export async function checkRateLimit(ip: string): Promise<{ ok: boolean; remaining: number; resetAt: number }> {
  const hour = Math.floor(Date.now() / WINDOW_MS);
  const key = `rl:${ip}:${hour}`;
  const resetAt = (hour + 1) * WINDOW_MS;

  const kvCount = await kvIncr(key);
  if (kvCount !== null) {
    return { ok: kvCount <= LIMIT, remaining: Math.max(0, LIMIT - kvCount), resetAt };
  }

  const now = Date.now();
  const bucket = memoryStore.get(ip);
  if (!bucket || bucket.resetAt < now) {
    memoryStore.set(ip, { count: 1, resetAt });
    return { ok: true, remaining: LIMIT - 1, resetAt };
  }
  bucket.count += 1;
  return { ok: bucket.count <= LIMIT, remaining: Math.max(0, LIMIT - bucket.count), resetAt: bucket.resetAt };
}

export function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "0.0.0.0";
}
