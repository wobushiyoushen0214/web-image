import { NextRequest, NextResponse } from "next/server";
import { RELAY_BASE_URL, RELAY_API_KEY } from "@/lib/config";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = await checkRateLimit(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again after ${new Date(rl.resetAt).toISOString()}` },
      { status: 429, headers: { "X-RateLimit-Remaining": String(rl.remaining) } },
    );
  }

  if (!RELAY_API_KEY) {
    return NextResponse.json({ error: "Server is missing RELAY_API_KEY" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.prompt !== "string" || !body.prompt.trim()) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }
  if (body.prompt.length > 1000) {
    return NextResponse.json(
      { error: `Prompt 过长，最多 1000 字（当前 ${body.prompt.length}）` },
      { status: 400 },
    );
  }

  const payload: Record<string, unknown> = {
    model: body.model ?? "gpt-image-2",
    prompt: body.prompt,
    n: Math.min(Math.max(Number(body.n ?? 1), 1), 4),
    size: body.size ?? "1024x1024",
  };
  if (body.quality) payload.quality = body.quality;
  if (body.background) payload.background = body.background;

  const upstream = await fetch(`${RELAY_BASE_URL}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RELAY_API_KEY}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(270_000),
  }).catch((e: Error) => {
    return new Response(
      JSON.stringify({ error: e.name === "TimeoutError" ? "上游生图超时（>270s）" : `上游请求失败：${e.message}` }),
      { status: 504, headers: { "Content-Type": "application/json" } },
    );
  });

  const text = await upstream.text();
  const ct = upstream.headers.get("Content-Type") ?? "";
  if (!ct.includes("application/json")) {
    return NextResponse.json(
      {
        error: `上游返回非 JSON (HTTP ${upstream.status})：${text.slice(0, 300)}`,
      },
      {
        status: upstream.ok ? 502 : upstream.status,
        headers: { "X-RateLimit-Remaining": String(rl.remaining) },
      },
    );
  }
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "Content-Type": "application/json",
      "X-RateLimit-Remaining": String(rl.remaining),
    },
  });
}
