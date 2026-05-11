import { NextRequest, NextResponse } from "next/server";
import { ENHANCE_API_KEY, ENHANCE_BASE_URL, ENHANCE_MODELS } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a prompt safety rewriter for image generation models.
The user's prompt was rejected by content moderation. Your job is to rewrite it so it passes moderation while preserving the user's creative intent as much as possible.

Rules:
- Output ONLY the rewritten prompt. No explanations, no quotes, no preamble.
- Remove or rephrase any content that could trigger moderation: violence, gore, sexual content, hate speech, real public figures, copyrighted characters by exact name.
- Keep the artistic style, composition, lighting, mood, and visual details.
- If the subject involves a real person, replace with a generic description (e.g. "a young woman with short black hair" instead of a celebrity name).
- If the subject involves violence, reframe as dramatic/cinematic without explicit harm.
- Maintain the same language as the input (Chinese stays Chinese, English stays English).
- Keep similar length to the original.`;

export async function POST(req: NextRequest) {
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

  const errorContext = typeof body.errorMessage === "string" ? body.errorMessage : "";

  const userMessage = errorContext
    ? `Original prompt (rejected):\n${body.prompt}\n\nModeration rejection reason:\n${errorContext}\n\nPlease rewrite to pass moderation.`
    : `Original prompt (rejected by content moderation):\n${body.prompt}\n\nPlease rewrite to pass moderation.`;

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
        { role: "user", content: userMessage },
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
    data?.choices?.[0]?.text ||
    "";

  const cleaned = content
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^\s*```[a-z]*\n?|\n?```\s*$/gi, "")
    .trim();

  if (!cleaned) {
    return NextResponse.json(
      { error: "改写失败，请手动修改 Prompt" },
      { status: 502 },
    );
  }

  return NextResponse.json({ prompt: cleaned });
}
