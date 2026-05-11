"use client";

import { useState } from "react";

export type QueueItem = {
  id: string;
  prompt: string;
  status: "pending" | "running" | "done" | "error" | "cancelled";
  progress?: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  image?: string;
};

type Props = {
  items: QueueItem[];
  onCancel: (id: string) => void;
  onCancelAll: () => void;
  onRetry: (id: string) => void;
  onClear: () => void;
};

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default function QueuePanel({ items, onCancel, onCancelAll, onRetry, onClear }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  if (items.length === 0) return null;

  const running = items.filter((x) => x.status === "running");
  const pending = items.filter((x) => x.status === "pending");
  const done = items.filter((x) => x.status === "done");
  const errors = items.filter((x) => x.status === "error");
  const total = items.length;
  const completed = done.length + errors.length;

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left transition hover:bg-white/5"
      >
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-medium text-white/80">
            生成队列
          </span>
          <div className="flex items-center gap-2 text-[11px]">
            {running.length > 0 && (
              <span className="flex items-center gap-1 text-accent">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
                {running.length} 进行中
              </span>
            )}
            {pending.length > 0 && (
              <span className="text-white/40">{pending.length} 等待</span>
            )}
            {done.length > 0 && (
              <span className="text-emerald-400">{done.length} 完成</span>
            )}
            {errors.length > 0 && (
              <span className="text-red-400">{errors.length} 失败</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/30">
            {completed}/{total}
          </span>
          <span className="text-white/40">{collapsed ? "▸" : "▾"}</span>
        </div>
      </button>

      {!collapsed && (
        <>
          <div className="mx-4 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-emerald-400 transition-all duration-500"
              style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
            />
          </div>

          <div className="max-h-[240px] overflow-auto px-4 py-2 space-y-1.5">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] ${
                  item.status === "running"
                    ? "bg-accent/10"
                    : item.status === "error"
                    ? "bg-red-500/10"
                    : item.status === "done"
                    ? "bg-emerald-500/5"
                    : "bg-white/[0.02]"
                }`}
              >
                <div className="flex-shrink-0">
                  {item.status === "running" && (
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
                  )}
                  {item.status === "pending" && (
                    <span className="inline-block h-3 w-3 rounded-full border-2 border-white/20" />
                  )}
                  {item.status === "done" && (
                    <span className="text-emerald-400">✓</span>
                  )}
                  {item.status === "error" && (
                    <span className="text-red-400">✕</span>
                  )}
                  {item.status === "cancelled" && (
                    <span className="text-white/30">⊘</span>
                  )}
                </div>
                <span className="flex-1 truncate text-white/70" title={item.prompt}>
                  {item.prompt.length > 40 ? item.prompt.slice(0, 40) + "…" : item.prompt}
                </span>
                {item.status === "running" && item.startedAt && (
                  <span className="text-white/30">
                    {formatElapsed(Date.now() - item.startedAt)}
                  </span>
                )}
                {item.status === "error" && (
                  <button
                    onClick={() => onRetry(item.id)}
                    className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60 hover:text-white"
                  >
                    重试
                  </button>
                )}
                {(item.status === "pending" || item.status === "running") && (
                  <button
                    onClick={() => onCancel(item.id)}
                    className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60 hover:text-red-400"
                  >
                    取消
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-white/5 px-4 py-2">
            {(pending.length > 0 || running.length > 0) && (
              <button
                onClick={onCancelAll}
                className="rounded-md bg-white/5 px-2 py-1 text-[11px] text-white/50 transition hover:text-red-400"
              >
                全部取消
              </button>
            )}
            {completed > 0 && pending.length === 0 && running.length === 0 && (
              <button
                onClick={onClear}
                className="rounded-md bg-white/5 px-2 py-1 text-[11px] text-white/50 transition hover:text-white"
              >
                清空队列
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
