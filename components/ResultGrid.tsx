"use client";

import { useState } from "react";
import { normalizeImages } from "@/lib/history";

type Props = {
  images: string[];
  loading: boolean;
  loadingCount?: number;
  seed?: number | null;
  prompt?: string;
  starred?: boolean;
  onTweak?: () => void;
  onToggleStar?: () => void;
  onImageClick?: (index: number) => void;
  onPostProcessed?: (newImages: string[]) => void;
  setError?: (s: string | null) => void;
};

type Action = "upscale" | "remove-bg";

export default function ResultGrid({
  images,
  loading,
  loadingCount = 1,
  seed,
  prompt,
  starred,
  onTweak,
  onToggleStar,
  onImageClick,
  onPostProcessed,
  setError,
}: Props) {
  const [busy, setBusy] = useState<{ idx: number; action: Action } | null>(null);

  const runAction = async (idx: number, src: string, action: Action) => {
    if (busy) return;
    setBusy({ idx, action });
    setError?.(null);
    try {
      const endpoint = action === "upscale" ? "/api/upscale" : "/api/remove-bg";
      const payload: Record<string, unknown> = { url: src };
      if (action === "upscale") payload.size = "1536x1536";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const raw = await res.text();
      let data: any;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(`HTTP ${res.status}：${raw.slice(0, 200)}`);
      }
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      const newImgs = normalizeImages(data);
      if (!newImgs.length) throw new Error("处理失败：上游未返回图片");
      const next = [...images];
      next[idx] = newImgs[0];
      onPostProcessed?.(next);
    } catch (e) {
      setError?.(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  if (!loading && images.length === 0) {
    return (
      <div className="card flex min-h-[420px] flex-col items-center justify-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/30 to-pink-500/20 text-2xl">
          🎨
        </div>
        <div className="text-sm text-white/60">在左侧输入 Prompt，开始创作</div>
        <div className="text-xs text-white/30">生成结果会显示在这里</div>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {!loading && images.length > 0 && (seed != null || prompt) && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-[11px] text-white/60">
          {seed != null && (
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(String(seed)).catch(() => {})}
              className="rounded bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/70 transition hover:bg-white/10"
              title="点击复制 seed"
            >
              seed: {seed}
            </button>
          )}
          {prompt && (
            <span className="line-clamp-1 max-w-[55%] flex-1 text-white/40" title={prompt}>
              {prompt}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            {onToggleStar && (
              <button
                type="button"
                onClick={onToggleStar}
                className={`rounded-md border px-2 py-1 text-[11px] transition ${
                  starred
                    ? "border-amber-500/60 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25"
                    : "border-white/10 bg-white/5 text-white/60 hover:text-amber-300"
                }`}
                title={starred ? "取消收藏" : "收藏到历史"}
              >
                ⭐ {starred ? "已收藏" : "收藏"}
              </button>
            )}
            {onTweak && seed != null && (
              <button
                type="button"
                onClick={onTweak}
                className="rounded-md border border-accent/40 bg-accent/10 px-2 py-1 text-[11px] text-accent transition hover:bg-accent/20"
                title="锁定 seed 并基于此结果微调"
              >
                ✎ 基于这张微调
              </button>
            )}
          </div>
        </div>
      )}
      <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(260px,480px))] justify-center gap-4">
        {loading &&
          Array.from({ length: Math.max(1, loadingCount) }).map((_, i) => (
            <div
              key={i}
              className="card relative aspect-square overflow-hidden"
              style={{
                background:
                  "linear-gradient(110deg, rgba(255,255,255,0.03) 30%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 70%)",
                backgroundSize: "200% 100%",
              }}
            >
              <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center text-xs text-white/40">
                生成中…
              </div>
            </div>
          ))}
        {!loading &&
          images.map((src, i) => {
            const isBusy = busy?.idx === i;
            return (
              <div key={i} className="card group relative animate-fade-in overflow-hidden">
                <div
                  className={`aspect-square w-full ${onImageClick ? "cursor-pointer" : ""}`}
                  onClick={() => onImageClick?.(i)}
                  style={{
                    backgroundImage:
                      "linear-gradient(45deg, rgba(255,255,255,0.04) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,0.04) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.04) 75%), linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.04) 75%)",
                    backgroundSize: "20px 20px",
                    backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`result-${i}`}
                    className="h-full w-full object-contain transition duration-500 group-hover:scale-[1.03]"
                  />
                  {onImageClick && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/20 group-hover:opacity-100">
                      <span className="rounded-full bg-black/60 px-3 py-1.5 text-xs text-white/90 backdrop-blur">
                        点击查看大图
                      </span>
                    </div>
                  )}
                </div>
                {isBusy && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-2">
                      <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span className="text-xs text-white/80">
                        {busy?.action === "upscale" ? "放大中…可能需要 30s+" : "去背景中…可能需要 30s+"}
                      </span>
                    </div>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 flex flex-wrap justify-end gap-2 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition group-hover:opacity-100">
                  {onPostProcessed && (
                    <>
                      <button
                        type="button"
                        onClick={() => runAction(i, src, "upscale")}
                        disabled={!!busy}
                        className="rounded-md bg-accent/30 px-2.5 py-1 text-xs text-white backdrop-blur transition hover:bg-accent/50 disabled:opacity-40"
                        title="img2img 二跑提升细节，输出 1536²"
                      >
                        ⤴ 高清放大
                      </button>
                      <button
                        type="button"
                        onClick={() => runAction(i, src, "remove-bg")}
                        disabled={!!busy}
                        className="rounded-md bg-emerald-500/30 px-2.5 py-1 text-xs text-white backdrop-blur transition hover:bg-emerald-500/50 disabled:opacity-40"
                        title="去除背景，输出透明 PNG（取决于上游 background=transparent 支持）"
                      >
                        ✂ 去背景
                      </button>
                    </>
                  )}
                  <a
                    href={src}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md bg-white/10 px-2.5 py-1 text-xs text-white backdrop-blur hover:bg-white/20"
                  >
                    查看原图
                  </a>
                  <a
                    href={src}
                    download={`web-image-${Date.now()}-${i}.png`}
                    className="rounded-md bg-white/10 px-2.5 py-1 text-xs text-white backdrop-blur hover:bg-white/20"
                  >
                    下载
                  </a>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
