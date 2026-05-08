import { NextRequest, NextResponse } from "next/server";
import { RELAY_BASE_URL } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 60;

function allowedHost(target: URL): boolean {
  try {
    const relay = new URL(RELAY_BASE_URL);
    if (target.hostname === relay.hostname) return true;
  } catch {}
  const allow = (process.env.IMAGE_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return allow.some((h) => target.hostname === h || target.hostname.endsWith(`.${h}`));
}

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u");
  if (!u) return NextResponse.json({ error: "missing u" }, { status: 400 });

  let target: URL;
  try {
    target = new URL(u);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }
  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return NextResponse.json({ error: "unsupported protocol" }, { status: 400 });
  }
  if (!allowedHost(target)) {
    return NextResponse.json({ error: `host not allowed: ${target.hostname}` }, { status: 403 });
  }

  const upstream = await fetch(target.toString(), {
    headers: { "User-Agent": "web-image-proxy/1.0" },
  });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `upstream ${upstream.status}` },
      { status: upstream.status === 200 ? 502 : upstream.status },
    );
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
