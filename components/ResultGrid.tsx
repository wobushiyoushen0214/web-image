"use client";

type Props = { images: string[]; loading: boolean; loadingCount?: number };

export default function ResultGrid({ images, loading, loadingCount = 1 }: Props) {
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
        images.map((src, i) => (
          <div key={i} className="card group relative animate-fade-in overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`result-${i}`}
              className="aspect-square w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition group-hover:opacity-100">
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
        ))}
    </div>
  );
}
