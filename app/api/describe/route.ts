import { NextRequest, NextResponse } from "next/server";
import { ENHANCE_API_KEY, ENHANCE_BASE_URL, DESCRIBE_MODEL } from "@/lib/config";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

const SYSTEM_EN = `You are a senior prompt engineer. Look at the provided image and write a single high-quality English text-to-image prompt that would reproduce a similar image.
Rules:
- Output only the final English prompt. No quotes, no explanations, no preamble.
- Cover: subject, composition, lighting, color palette, style/medium, mood, and any obvious camera/lens cues.
- HARD LIMIT: 30-60 words. One paragraph.
- Do not invent text content. Do not add watermarks or signatures.`;

const SYSTEM_ZH = `你是一名资深的 Prompt 工程师。请观察提供的图片，写一段可用于复现类似画面的高质量中文生图 Prompt。
规则：
- 只输出最终的中文 Prompt。不要引号、解释、前后缀。
- 覆盖：主体、构图、光线、配色、风格/媒介、氛围，以及明显的镜头/相机线索。
- 硬性限制：50-100 字，一段文字。
- 不要凭空添加文字内容，不要加水印或署名。`;

const MAX_OUTPUT_CHARS = 600;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

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

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "multipart/form-data required" }, { status: 400 });

  const image = form.get("image");
  if (!(image instanceof File)) {
    return NextResponse.json({ error: "image file is required" }, { status: 400 });
  }
  if (image.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: `图片过大，最多 ${MAX_IMAGE_BYTES / 1024 / 1024}MB` }, { status: 400 });
  }

  const lang = form.get("lang") === "zh" ? "zh" : "en";
  const systemPrompt = lang === "zh" ? SYSTEM_ZH : SYSTEM_EN;

  const buf = Buffer.from(await image.arrayBuffer());
  const mime = image.type || "image/png";
  const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;

  console.log(`[describe] model=${DESCRIBE_MODEL} lang=${lang} bytes=${buf.length}`);

  const upstream = await fetch(`${ENHANCE_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ENHANCE_API_KEY}`,
    },
    body: JSON.stringify({
      model: DESCRIBE_MODEL,
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: lang === "zh" ? "请基于这张图写出复现 Prompt。" : "Write a reproduction prompt for this image." },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
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
      { error: `反推失败，原始响应：${JSON.stringify(data).slice(0, 300)}` },
      { status: 502 },
    );
  }
  const truncated =
    cleaned.length > MAX_OUTPUT_CHARS
      ? cleaned.slice(0, MAX_OUTPUT_CHARS).replace(/[,，;；]\s*[^,，;；]*$/, "")
      : cleaned;
  return NextResponse.json({ prompt: truncated });
}
