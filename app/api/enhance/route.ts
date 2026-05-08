import { NextRequest, NextResponse } from "next/server";
import { ENHANCE_API_KEY, ENHANCE_BASE_URL, ENHANCE_MODELS } from "@/lib/config";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

const SYSTEM_PROMPT = `You are a senior prompt engineer for text-to-image models.
Take the user's brief idea (Chinese or English) and rewrite it as a single high-quality English image prompt.
Rules:
- Output only the final English prompt. No quotes, no explanations, no preamble, no trailing notes.
- Keep the user's core subject and intent. Add concrete visual detail: subject specifics, composition, lighting, mood, color palette, style/medium, lens or camera cues if photographic, and quality tags (e.g. highly detailed, sharp focus).
- 60-120 words. One paragraph. Comma-separated phrases are fine.
- Do not invent text content the user didn't ask for. Do not add watermarks or signatures.`;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = await checkRateLimit(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again after ${new Date(rl.resetAt).toISOString()}` },
      { status: 429 },
    );
  }
  if (!ENHANCE_API_KEY) {
    return NextResponse.json({ error: "Server is missing ENHANCE_API_KEY" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.prompt !== "string" || !body.prompt.trim()) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }
  const model =
    typeof body.model === "string" && ENHANCE_MODELS.includes(body.model)
      ? body.model
      : ENHANCE_MODELS[0];

  const upstream = await fetch(`${ENHANCE_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ENHANCE_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: body.prompt },
      ],
    }),
  });

  const text = await upstream.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { error: `上游返回非 JSON (HTTP ${upstream.status})：${text.slice(0, 300)}` },
      { status: 502 },
    );
  }
  if (!upstream.ok) {
    return NextResponse.json(
      { error: data?.error?.message || data?.error || `HTTP ${upstream.status}` },
      { status: upstream.status },
    );
  }

  const msg = data?.choices?.[0]?.message ?? {};
  const content: string =
    (typeof msg.content === "string" && msg.content) ||
    (typeof msg.reasoning_content === "string" && msg.reasoning_content) ||
    (typeof msg.reasoning === "string" && msg.reasoning) ||
    data?.choices?.[0]?.text ||
    "";

  const cleaned = content
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^\s*```[a-z]*\n?|\n?```\s*$/gi, "")
    .trim();

  if (!cleaned) {
    return NextResponse.json(
      { error: `美化失败，原始响应：${JSON.stringify(data).slice(0, 300)}` },
      { status: 502 },
    );
  }
  return NextResponse.json({ prompt: cleaned });
}
