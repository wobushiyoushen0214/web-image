"use client";

import { useState } from "react";
import { HistoryItem } from "@/lib/history";

type Props = {
  items: HistoryItem[];
  onCompare: (a: string, b: string) => void;
  onExportZip: (selected: HistoryItem[]) => void;
};

export default function ImageManager({ items, onCompare, onExportZip }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<"select" | "compare">("select");

  if (items.length === 0) return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(items.map((x) => x.id)));
  };

  const clearSelection = () => setSelected(new Set());

  const selectedItems = items.filter((x) => selected.has(x.id));

  const handleCompare = () => {
    if (selectedItems.length !== 2) return;
    onCompare(selectedItems[0].images[0], selectedItems[1].images[0]);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setMode(mode === "select" ? "compare" : "select")}
          className={`rounded-md px-2 py-1 text-[11px] transition ${
            mode === "compare"
              ? "bg-accent/20 text-accent"
              : "bg-white/5 text-white/60 hover:text-white"
          }`}
        >
          {mode === "compare" ? "⇔ 对比模式" : "☐ 选择模式"}
        </button>
      </div>

      {selected.size > 0 && (
        <>
          <span className="text-[11px] text-white/40">
            已选 {selected.size} 项
          </span>
          <button
            onClick={() => onExportZip(selectedItems)}
            className="rounded-md bg-emerald-500/20 px-2 py-1 text-[11px] text-emerald-300 transition hover:bg-emerald-500/30"
          >
            ↓ 导出 ZIP
          </button>
          {selected.size === 2 && (
            <button
              onClick={handleCompare}
              className="rounded-md bg-accent/20 px-2 py-1 text-[11px] text-accent transition hover:bg-accent/30"
            >
              ⇔ 对比这两张
            </button>
          )}
          <button
            onClick={clearSelection}
            className="text-[11px] text-white/40 hover:text-white"
          >
            清除选择
          </button>
        </>
      )}

      {selected.size === 0 && (
        <button
          onClick={selectAll}
          className="text-[11px] text-white/40 hover:text-white"
        >
          全选
        </button>
      )}
    </div>
  );
}
