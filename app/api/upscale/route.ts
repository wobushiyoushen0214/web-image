import { NextRequest, NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { RELAY_BASE_URL, RELAY_API_KEY } from "@/lib/config";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 300;

const PRIVATE_V4 = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^0\./,
];

function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  if (ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80:")) return true;
  if (ip.startsWith("::ffff:")) return PRIVATE_V4.some((re) => re.test(ip.slice(7)));
  return PRIVATE_V4.some((re) => re.test(ip));
}

async function isSafeHost(hostname: string): Promise<boolean> {
  if (isIP(hostname)) return !isPrivateIp(hostname);
  try {
    const records = await lookup(hostname, { all: true });
    if (!records.length) return false;
    return records.every((r) => !isPrivateIp(r.address));
  } catch {
    return false;
  }
}

async function fetchAsFile(url: string): Promise<File> {
  let target: URL;
  try {
    target = new URL(url, "http://localhost");
  } catch {
    throw new Error("invalid image url");
  }
  if (target.protocol === "data:") {
    const res = await fetch(url);
    const ct = res.headers.get("Content-Type") ?? "image/png";
    const buf = await res.arrayBuffer();
    return new File([buf], "src.png", { type: ct });
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    throw new Error("unsupported protocol");
  }
  if (target.hostname && !(await isSafeHost(target.hostname))) {
    throw new Error(`host not allowed: ${target.hostname}`);
  }
  const res = await fetch(target.toString());
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  const ct = res.headers.get("Content-Type") ?? "image/png";
  if (!ct.startsWith("image/") && !ct.startsWith("application/octet-stream")) {
    throw new Error(`not an image: ${ct}`);
  }
  const buf = await res.arrayBuffer();
  return new File([buf], "src.png", { type: ct });
}

const UPSCALE_PROMPT =
  "ultra high detail, sharper edges, enhanced clarity, fine textures, professional 4k quality, photographic, no smoothing artifacts";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = await checkRateLimit(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again after ${new Date(rl.resetAt).toISOString()}` },
      { status: 429 },
    );
  }
  if (!RELAY_API_KEY) {
    return NextResponse.json({ error: "Server is missing RELAY_API_KEY" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  const url = body?.url;
  if (typeof url !== "string" || !url.trim()) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }
  const targetSize = body?.size === "1536x1536" || body?.size === "1024x1024" ? body.size : "1536x1536";
  const model = typeof body?.model === "string" ? body.model : "gpt-image-2";

  let file: File;
  try {
    let resolvedUrl = url;
    if (resolvedUrl.startsWith("/api/image?u=")) {
      resolvedUrl = decodeURIComponent(resolvedUrl.slice("/api/image?u=".length));
    }
    file = await fetchAsFile(resolvedUrl);
  } catch (e) {
    return NextResponse.json({ error: `下载源图失败：${e instanceof Error ? e.message : String(e)}` }, { status: 400 });
  }

  const outForm = new FormData();
  outForm.append("model", model);
  outForm.append("prompt", UPSCALE_PROMPT);
  outForm.append("n", "1");
  outForm.append("size", targetSize);
  outForm.append("image", file, file.name);

  const upstream = await fetch(`${RELAY_BASE_URL}/images/edits`, {
    method: "POST",
    headers: { Authorization: `Bearer ${RELAY_API_KEY}` },
    body: outForm,
    signal: AbortSignal.timeout(270_000),
  }).catch((e: Error) => {
    return new Response(
      JSON.stringify({
        error: e.name === "TimeoutError" ? "上游放大超时（>270s）" : `上游请求失败：${e.message}`,
      }),
      { status: 504, headers: { "Content-Type": "application/json" } },
    );
  });

  const text = await upstream.text();
  const ct = upstream.headers.get("Content-Type") ?? "";
  if (!ct.includes("application/json")) {
    return NextResponse.json(
      { error: `上游返回非 JSON (HTTP ${upstream.status})：${text.slice(0, 300)}` },
      { status: upstream.ok ? 502 : upstream.status },
    );
  }
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
