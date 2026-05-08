"use client";

import { HistoryItem, clearHistory, removeHistoryItem } from "@/lib/history";

type Props = {
  items: HistoryItem[];
  onPick: (item: HistoryItem) => void;
  onChange: (items: HistoryItem[]) => void;
};

export default function HistoryPanel({ items, onPick, onChange }: Props) {
  if (!items.length) return null;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-white/70">
          历史记录 <span className="text-white/30">· {items.length}</span>
        </h2>
        <button
          className="text-xs text-white/40 transition hover:text-red-400"
          onClick={() => {
            if (confirm("清空全部历史？")) {
              clearHistory();
              onChange([]);
            }
          }}
        >
          清空
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((it) => (
          <div key={it.id} className="card group relative overflow-hidden">
            <button onClick={() => onPick(it)} className="block w-full text-left">
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
                </p>
              </div>
            </button>
            <button
              className="absolute right-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-xs text-white/80 opacity-0 backdrop-blur transition hover:text-red-400 group-hover:opacity-100"
              onClick={() => onChange(removeHistoryItem(it.id))}
              title="删除"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
