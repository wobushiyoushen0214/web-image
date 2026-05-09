"use client";

import type { StoryboardScene } from "./StoryboardPanel";

type Props = {
  scenes: StoryboardScene[];
  sharedSeed: number | null;
  onPickScene?: (scene: StoryboardScene) => void;
};

export default function StoryboardResult({ scenes, sharedSeed, onPickScene }: Props) {
  if (scenes.length === 0) {
    return (
      <div className="card flex min-h-[420px] flex-col items-center justify-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/30 to-pink-500/20 text-2xl">
          🎬
        </div>
        <div className="text-sm text-white/60">配置左侧后点击「开始生成故事板」</div>
        <div className="text-xs text-white/30">每一幕共享角色和风格，按顺序串行生成</div>
      </div>
    );
  }

  const done = scenes.filter((s) => s.status === "done").length;
  const errored = scenes.filter((s) => s.status === "error").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-[11px] text-white/60">
        <span>
          进度 <span className="font-mono text-white">{done}</span> / {scenes.length}
          {errored > 0 && <span className="ml-2 text-red-300">失败 {errored}</span>}
        </span>
        {sharedSeed != null && (
          <span className="font-mono text-[10px] text-white/40">shared seed: {sharedSeed}</span>
        )}
      </div>

      <div className="space-y-3">
        {scenes.map((scene, i) => (
          <div
            key={scene.id}
            className="card group flex gap-3 overflow-hidden p-2"
          >
            <div className="flex w-8 shrink-0 flex-col items-center justify-center border-r border-white/5">
              <span className="text-2xl font-bold text-white/20">{i + 1}</span>
            </div>
            <div className="relative aspect-square w-40 shrink-0 overflow-hidden rounded-md bg-white/[0.02] sm:w-56">
              {scene.status === "pending" ? (
                <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white/30">
                  待生成
                </div>
              ) : scene.status === "loading" ? (
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(110deg, rgba(255,255,255,0.03) 30%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 70%)",
                    backgroundSize: "200% 100%",
                  }}
                >
                  <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white/40">
                    生成中…
                  </div>
                </div>
              ) : scene.status === "error" ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-red-500/10 p-2 text-center text-[10px] text-red-300">
                  <span>失败</span>
                  <span className="line-clamp-3 text-red-300/70">{scene.error}</span>
                </div>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={scene.image}
                    alt={`scene-${i + 1}`}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100">
                    {onPickScene && scene.seed != null && (
                      <button
                        type="button"
                        onClick={() => onPickScene(scene)}
                        className="rounded bg-accent/30 px-1.5 py-0.5 text-[10px] text-white backdrop-blur hover:bg-accent/50"
                        title="基于这一幕到主工作台微调"
                      >
                        ✎
                      </button>
                    )}
                    <a
                      href={scene.image}
                      download={`storyboard-${i + 1}.png`}
                      className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white backdrop-blur hover:bg-white/20"
                    >
                      ↓
                    </a>
                  </div>
                </>
              )}
            </div>
            <div className="flex flex-1 flex-col justify-between py-1 pr-2 text-xs">
              <div>
                <div className="mb-1 text-[10px] uppercase tracking-wider text-white/30">第 {i + 1} 幕</div>
                <div className="text-sm text-white/80">{scene.text}</div>
              </div>
              {scene.status === "done" && scene.seed != null && (
                <div className="mt-2 text-[10px] text-white/30">
                  seed: <span className="font-mono">{scene.seed}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
