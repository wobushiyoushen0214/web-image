import { NextRequest, NextResponse } from "next/server";
import {
  RELAY_BASE_URL,
  getRelayApiKeyForModel,
  isGrokImagineModel,
  isTextToImageOnlyModel,
} from "@/lib/config";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { withNormalizedUpstreamError } from "@/lib/upstream-error";

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

  const inForm = await req.formData().catch(() => null);
  if (!inForm) {
    return NextResponse.json({ error: "multipart/form-data required" }, { status: 400 });
  }

  const prompt = inForm.get("prompt");
  const image = inForm.get("image");
  if (typeof prompt !== "string" || !prompt.trim()) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }
  if (prompt.length > 8000) {
    return NextResponse.json(
      { error: `Prompt 过长，最多 8000 字（当前 ${prompt.length}）` },
      { status: 400 },
    );
  }
  if (!(image instanceof File)) {
    return NextResponse.json({ error: "image file is required" }, { status: 400 });
  }

  let userSeed: number | null = null;
  const seedRaw = inForm.get("seed");
  if (typeof seedRaw === "string" && seedRaw.trim()) {
    const s = Number(seedRaw);
    if (Number.isFinite(s)) userSeed = Math.floor(s);
  }
  const responseSeed = userSeed ?? Math.floor(Math.random() * 2_147_483_647);
  const modelValue = inForm.get("model");
  const model = typeof modelValue === "string" && modelValue.trim() ? modelValue.trim() : "gpt-image-2";
  if (isTextToImageOnlyModel(model)) {
    return NextResponse.json(
      { error: `${model} 只支持文生图，不支持图生图；请切换 gpt-image-2 或配置可编辑模型` },
      { status: 400 },
    );
  }
  const apiKey = getRelayApiKeyForModel(model);
  if (!apiKey) {
    return NextResponse.json({ error: `Server is missing API key for model ${model}` }, { status: 500 });
  }

  const negative = typeof inForm.get("negative_prompt") === "string"
    ? String(inForm.get("negative_prompt")).trim()
    : "";
  const finalPrompt = negative
    ? `${prompt}\n\nNegative prompt (avoid these): ${negative}`
    : prompt;

  const mask = inForm.get("mask");
  const isGrokImagine = isGrokImagineModel(model);
  if (isGrokImagine && mask instanceof File) {
    return NextResponse.json(
      { error: "Grok 图生图不支持蒙版/扩图，请移除蒙版或切换其它编辑模型" },
      { status: 400 },
    );
  }

  let upstreamBody: BodyInit;
  let headers: HeadersInit = { Authorization: `Bearer ${apiKey}` };
  if (isGrokImagine) {
    const imageBytes = Buffer.from(await image.arrayBuffer());
    const mime = image.type || "image/png";
    upstreamBody = JSON.stringify({
      model,
      prompt: finalPrompt,
      image: {
        type: "image_url",
        url: `data:${mime};base64,${imageBytes.toString("base64")}`,
      },
    });
    headers = {
      ...headers,
      "Content-Type": "application/json",
    };
  } else {
    const outForm = new FormData();
    outForm.append("model", model);
    outForm.append("prompt", finalPrompt);
    outForm.append("n", String(inForm.get("n") ?? "1"));
    outForm.append("size", String(inForm.get("size") ?? "1024x1024"));
    if (userSeed !== null) outForm.append("seed", String(userSeed));
    outForm.append("image", image, image.name || "image.png");
    if (mask instanceof File) outForm.append("mask", mask, mask.name || "mask.png");
    upstreamBody = outForm;
  }

  const upstream = await fetch(`${RELAY_BASE_URL}/images/edits`, {
    method: "POST",
    headers,
    body: upstreamBody,
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

  let body2: any;
  try {
    body2 = JSON.parse(text);
  } catch {
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Remaining": String(rl.remaining),
      },
    });
  }
  if (!upstream.ok) {
    return NextResponse.json(withNormalizedUpstreamError(body2, `HTTP ${upstream.status}`), {
      status: upstream.status,
      headers: { "X-RateLimit-Remaining": String(rl.remaining) },
    });
  }
  if (body2 && typeof body2 === "object" && body2.seed === undefined) {
    body2.seed = responseSeed;
  }
  return new NextResponse(JSON.stringify(body2), {
    status: upstream.status,
    headers: {
      "Content-Type": "application/json",
      "X-RateLimit-Remaining": String(rl.remaining),
    },
  });
}
