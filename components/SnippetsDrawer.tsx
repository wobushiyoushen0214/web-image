"use client";

import { useState } from "react";
import { SNIPPETS } from "@/lib/snippets";

type Props = {
  open: boolean;
  onClose: () => void;
  onAppend: (text: string) => void;
};

export default function SnippetsDrawer({ open, onClose, onAppend }: Props) {
  const [activeCat, setActiveCat] = useState(SNIPPETS[0].id);
  const [recent, setRecent] = useState<string[]>([]);

  if (!open) return null;
  const cat = SNIPPETS.find((c) => c.id === activeCat) ?? SNIPPETS[0];

  const pick = (text: string) => {
    onAppend(text);
    setRecent((cur) => [text, ...cur.filter((x) => x !== text)].slice(0, 8));
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0d0e12] shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold">Prompt 片段库</h2>
            <p className="text-[11px] text-white/40">点击词块追加到当前 Prompt 末尾</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </header>

        {recent.length > 0 && (
          <div className="border-b border-white/5 bg-white/[0.02] p-3">
            <div className="mb-1.5 text-[10px] uppercase tracking-wider text-white/40">最近使用</div>
            <div className="flex flex-wrap gap-1.5">
              {recent.map((s) => (
                <button
                  key={s}
                  onClick={() => pick(s)}
                  className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] text-accent transition hover:bg-accent/20"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-1 border-b border-white/5 p-2">
          {SNIPPETS.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={`rounded-md px-2.5 py-1 text-[12px] transition ${
                activeCat === c.id
                  ? "bg-accent/20 text-accent"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              {c.emoji} {c.name}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-3">
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {cat.items.map((item) => (
              <button
                key={item}
                onClick={() => pick(item)}
                className="group flex items-center justify-between rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-left text-[12px] text-white/80 transition hover:border-accent/40 hover:bg-accent/5"
              >
                <span className="truncate">{item}</span>
                <span className="ml-2 text-[10px] text-white/30 transition group-hover:text-accent">
                  +
                </span>
              </button>
            ))}
          </div>
        </div>

        <footer className="border-t border-white/10 px-4 py-2 text-[10px] text-white/30">
          点击词块会自动用逗号拼到当前 Prompt 末尾，不会清除已有内容。
        </footer>
      </aside>
    </div>
  );
}
