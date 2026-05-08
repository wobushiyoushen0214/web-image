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

  const inForm = await req.formData().catch(() => null);
  if (!inForm) {
    return NextResponse.json({ error: "multipart/form-data required" }, { status: 400 });
  }

  const prompt = inForm.get("prompt");
  const image = inForm.get("image");
  if (typeof prompt !== "string" || !prompt.trim()) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }
  if (prompt.length > 1000) {
    return NextResponse.json(
      { error: `Prompt 过长，最多 1000 字（当前 ${prompt.length}）` },
      { status: 400 },
    );
  }
  if (!(image instanceof File)) {
    return NextResponse.json({ error: "image file is required" }, { status: 400 });
  }

  const outForm = new FormData();
  outForm.append("model", String(inForm.get("model") ?? "gpt-image-2"));
  outForm.append("prompt", prompt);
  outForm.append("n", String(inForm.get("n") ?? "1"));
  outForm.append("size", String(inForm.get("size") ?? "1024x1024"));
  outForm.append("image", image, image.name || "image.png");
  const mask = inForm.get("mask");
  if (mask instanceof File) outForm.append("mask", mask, mask.name || "mask.png");

  const upstream = await fetch(`${RELAY_BASE_URL}/images/edits`, {
    method: "POST",
    headers: { Authorization: `Bearer ${RELAY_API_KEY}` },
    body: outForm,
    signal: AbortSignal.timeout(270_000),
  }).catch((e: Error) => {
    return new Response(
      JSON.stringify({ error: e.name === "TimeoutError" ? "上游编辑超时（>270s）" : `上游请求失败：${e.message}` }),
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
