import { NextRequest, NextResponse } from "next/server";
import { ENHANCE_API_KEY, ENHANCE_BASE_URL, ENHANCE_MODELS } from "@/lib/config";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

const SYSTEM_PROMPT_EN = `You are a senior prompt engineer for text-to-image models.
Take the user's brief idea (Chinese or English) and rewrite it as a single high-quality English image prompt.
Rules:
- Output only the final English prompt. No quotes, no explanations, no preamble, no trailing notes.
- Keep the user's core subject and intent. Add concrete visual detail: subject specifics, composition, lighting, mood, color palette, style/medium, lens or camera cues if photographic, and quality tags (e.g. highly detailed, sharp focus).
- HARD LIMIT: 30-60 words. One paragraph. Comma-separated phrases are fine. NEVER exceed 60 words.
- Do not invent text content the user didn't ask for. Do not add watermarks or signatures.`;

const SYSTEM_PROMPT_ZH = `你是一名资深的文生图 Prompt 工程师。
请把用户给出的简短想法（中文或英文）改写成一段高质量的中文生图 Prompt。
规则：
- 只输出最终的中文 Prompt。不要引号、不要解释、不要任何前后缀。
- 保留用户的核心主体和意图。补充具体视觉细节：主体特征、构图、光线、氛围、色彩、风格/媒介、镜头/相机信息（若为摄影），以及质量标签（如：高度细致、锐利对焦）。
- 硬性限制：50-100 字，一段文字。短语之间用逗号分隔即可。绝对不要超过 100 字。
- 不要凭空添加用户没要求的文字内容；不要加水印或署名。`;

const MAX_OUTPUT_CHARS = 600;
const MAX_INPUT_CHARS = 500;

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
  if (body.prompt.length > MAX_INPUT_CHARS) {
    return NextResponse.json(
      { error: `输入过长，最多 ${MAX_INPUT_CHARS} 字（当前 ${body.prompt.length}）` },
      { status: 400 },
    );
  }
  const model =
    typeof body.model === "string" && ENHANCE_MODELS.includes(body.model)
      ? body.model
      : ENHANCE_MODELS[0];
  const lang = body.lang === "zh" ? "zh" : "en";
  const systemPrompt = lang === "zh" ? SYSTEM_PROMPT_ZH : SYSTEM_PROMPT_EN;

  const skills = Array.isArray(body.skills)
    ? body.skills.filter((s: unknown): s is string => typeof s === "string" && s.trim().length > 0)
    : [];
  const totalSkillChars = skills.reduce((n: number, s: string) => n + s.length, 0);
  if (totalSkillChars > 20000) {
    return NextResponse.json({ error: "启用的 Skills 总长度过大（>20000 字）" }, { status: 400 });
  }

  const userMessage = skills.length
    ? `${skills.join("\n\n---\n\n")}\n\n---\n\nUser input:\n${body.prompt}`
    : body.prompt;

  console.log(`[enhance] model=${model} lang=${lang} skills=${skills.length} userLen=${userMessage.length}`);

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
        { role: "system", content: systemPrompt },
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
  const truncated =
    cleaned.length > MAX_OUTPUT_CHARS ? cleaned.slice(0, MAX_OUTPUT_CHARS).replace(/[,，;；]\s*[^,，;；]*$/, "") : cleaned;
  return NextResponse.json({ prompt: truncated });
}
