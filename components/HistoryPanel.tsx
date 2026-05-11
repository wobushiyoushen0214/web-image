"use client";

import { useMemo, useState } from "react";
import { HistoryItem, clearHistory, removeHistoryItem, toggleStar } from "@/lib/history";

type Props = {
  items: HistoryItem[];
  onPick: (item: HistoryItem) => void;
  onChange: (items: HistoryItem[]) => void;
  onExportZip?: (items: HistoryItem[]) => void;
  onCompare?: (a: string, b: string) => void;
};

export default function HistoryPanel({ items, onPick, onChange, onExportZip, onCompare }: Props) {
  const [query, setQuery] = useState("");
  const [starredOnly, setStarredOnly] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (starredOnly && !it.starred) return false;
      if (!q) return true;
      return (
        it.prompt.toLowerCase().includes(q) ||
        it.size.toLowerCase().includes(q) ||
        it.mode.toLowerCase().includes(q) ||
        (it.seed != null && String(it.seed).includes(q))
      );
    });
  }, [items, query, starredOnly]);

  if (!items.length) return null;

  const starredCount = items.filter((x) => x.starred).length;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedItems = items.filter((x) => selected.has(x.id));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-medium text-white/70">
          历史记录 <span className="text-white/30">· {items.length}</span>
        </h2>
        <input
          className="input flex-1 min-w-[140px] !py-1.5 text-xs"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索 prompt / 尺寸 / seed…"
        />
        <button
          onClick={() => setStarredOnly((v) => !v)}
          className={`rounded-md border px-2 py-1 text-[11px] transition ${
            starredOnly
              ? "border-amber-500/60 bg-amber-500/15 text-amber-200"
              : "border-white/10 bg-white/5 text-white/60 hover:text-white"
          }`}
          title="只看收藏"
        >
          ⭐ {starredCount}
        </button>
        {onExportZip && (
          <button
            onClick={() => {
              setSelecting((v) => {
                if (v && selected.size > 0) {
                  onExportZip(selectedItems);
                  setSelected(new Set());
                }
                return !v;
              });
            }}
            className={`rounded-md border px-2 py-1 text-[11px] transition ${
              selecting
                ? selected.size > 0
                  ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-200"
                  : "border-accent/60 bg-accent/15 text-accent"
                : "border-white/10 bg-white/5 text-white/60 hover:text-white"
            }`}
            title={selecting ? (selected.size > 0 ? "导出选中项" : "取消选择") : "选择并导出 ZIP"}
          >
            {selecting ? (selected.size > 0 ? `↓ 导出 ${selected.size} 项` : "取消选择") : "↓ 导出"}
          </button>
        )}
        {selecting && selected.size === 2 && onCompare && (
          <button
            onClick={() => {
              const imgs = selectedItems.map((x) => x.images[0]);
              if (imgs.length === 2) onCompare(imgs[0], imgs[1]);
            }}
            className="rounded-md border border-accent/60 bg-accent/15 px-2 py-1 text-[11px] text-accent transition hover:bg-accent/25"
          >
            ⇔ 对比
          </button>
        )}
        {selecting && (
          <button
            onClick={() => {
              setSelected(new Set(filtered.map((x) => x.id)));
            }}
            className="text-[11px] text-white/40 hover:text-white"
          >
            全选
          </button>
        )}
        <button
          className="text-xs text-white/40 transition hover:text-red-400"
          onClick={() => {
            if (confirm("清空全部历史？（收藏也会被清掉）")) {
              clearHistory();
              onChange([]);
            }
          }}
        >
          清空
        </button>
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-md border border-dashed border-white/10 bg-white/[0.01] p-6 text-center text-[12px] text-white/40">
          没有匹配的记录
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((it) => (
            <div key={it.id} className="card group relative overflow-hidden">
              {selecting && (
                <button
                  onClick={() => toggleSelect(it.id)}
                  className={`absolute left-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded border text-[10px] transition ${
                    selected.has(it.id)
                      ? "border-accent bg-accent text-white"
                      : "border-white/40 bg-black/60 text-transparent hover:border-accent"
                  }`}
                >
                  ✓
                </button>
              )}
              <button onClick={() => !selecting && onPick(it)} className="block w-full text-left">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={it.images[0]}
                  alt={it.prompt}
                  className="aspect-square w-full object-cover transition group-hover:scale-105"
                />
                <div className="p-2.5">
                  <p className="line-clamp-2 text-[11px] leading-snug text-white/70">{it.prompt}</p>
                  <p className="mt-1 text-[10px] text-white/30">
                    {it.mode === "edit" ? "图生图" : "文生图"} · {it.size}
                    {it.seed != null && <span className="ml-1 font-mono">· seed {it.seed}</span>}
                  </p>
                </div>
              </button>
              <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  className={`rounded-md px-1.5 py-0.5 text-xs backdrop-blur transition ${
                    it.starred
                      ? "bg-amber-500/40 text-amber-100 hover:bg-amber-500/60"
                      : "bg-black/60 text-white/80 hover:text-amber-300"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(toggleStar(it.id));
                  }}
                  title={it.starred ? "取消收藏" : "收藏"}
                >
                  ⭐
                </button>
                <button
                  className="rounded-md bg-black/60 px-1.5 py-0.5 text-xs text-white/80 backdrop-blur transition hover:text-red-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(removeHistoryItem(it.id));
                  }}
                  title="删除"
                >
                  ✕
                </button>
              </div>
              {it.starred && (
                <div
                  className="absolute left-1.5 top-1.5 rounded bg-amber-500/80 px-1.5 py-0.5 text-[10px] text-white opacity-100"
                  aria-label="已收藏"
                >
                  ⭐
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
