"use client";

import type { BatchTask } from "./BatchPanel";

type Props = {
  tasks: BatchTask[];
  sizes: string[];
  skillRows: { id: string | null; name: string }[];
  onPickSeed?: (task: BatchTask) => void;
};

export default function BatchResultMatrix({ tasks, sizes, skillRows, onPickSeed }: Props) {
  if (tasks.length === 0) {
    return (
      <div className="card flex min-h-[420px] flex-col items-center justify-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/30 to-pink-500/20 text-2xl">
          📊
        </div>
        <div className="text-sm text-white/60">配置左侧后点击「开始批量生成」</div>
        <div className="text-xs text-white/30">结果将以 Skill × 尺寸 矩阵展示</div>
      </div>
    );
  }

  const cellOf = (skillId: string | null, size: string) =>
    tasks.find((t) => t.skillId === skillId && t.size === size);

  const done = tasks.filter((t) => t.status === "done").length;
  const errored = tasks.filter((t) => t.status === "error").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-[11px] text-white/60">
        <span>
          进度 <span className="font-mono text-white">{done}</span> / {tasks.length}
          {errored > 0 && <span className="ml-2 text-red-300">失败 {errored}</span>}
        </span>
        <span className="text-[10px] text-white/30">行 = Skill · 列 = 尺寸</span>
      </div>

      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `120px repeat(${sizes.length}, minmax(0, 1fr))`,
        }}
      >
        <div />
        {sizes.map((s) => (
          <div key={s} className="text-center text-[11px] font-medium text-white/60">
            {s}
          </div>
        ))}

        {skillRows.map((row) => (
          <div key={row.id ?? "none"} className="contents">
            <div className="flex items-center text-[11px] font-medium text-white/70">
              <span className="line-clamp-2">{row.name}</span>
            </div>
            {sizes.map((size) => {
              const t = cellOf(row.id, size);
              return (
                <div
                  key={`${row.id ?? "none"}__${size}`}
                  className="card relative aspect-square overflow-hidden"
                >
                  {!t || t.status === "pending" ? (
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white/30">
                      待生成
                    </div>
                  ) : t.status === "loading" ? (
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
                  ) : t.status === "error" ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-red-500/10 p-2 text-center text-[10px] text-red-300">
                      <span>失败</span>
                      <span className="line-clamp-3 text-red-300/70">{t.error}</span>
                    </div>
                  ) : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={t.image}
                        alt={`${row.name} ${size}`}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1.5 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 transition group-hover:opacity-100 hover:opacity-100">
                        {onPickSeed && t.seed != null && (
                          <button
                            type="button"
                            onClick={() => onPickSeed(t)}
                            className="rounded bg-accent/30 px-1.5 py-0.5 text-[10px] text-white backdrop-blur hover:bg-accent/50"
                            title="基于这张到主工作台微调"
                          >
                            ✎
                          </button>
                        )}
                        <a
                          href={t.image}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white backdrop-blur hover:bg-white/20"
                        >
                          原图
                        </a>
                        <a
                          href={t.image}
                          download={`batch-${row.name}-${size}.png`}
                          className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white backdrop-blur hover:bg-white/20"
                        >
                          ↓
                        </a>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
