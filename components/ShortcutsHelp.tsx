"use client";

import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

type Shortcut = {
  keys: string;
  description: string;
};

const SHORTCUTS: { group: string; items: Shortcut[] }[] = [
  {
    group: "生成",
    items: [
      { keys: "⌘/Ctrl + Enter", description: "提交生成" },
      { keys: "⌘/Ctrl + E", description: "AI 美化 Prompt" },
    ],
  },
  {
    group: "导航",
    items: [
      { keys: "1", description: "切换到文生图" },
      { keys: "2", description: "切换到图生图" },
      { keys: "3", description: "切换到批量" },
      { keys: "4", description: "切换到故事板" },
      { keys: "T", description: "打开模板" },
      { keys: "S", description: "打开片段库" },
      { keys: "?", description: "显示快捷键帮助" },
    ],
  },
  {
    group: "画廊",
    items: [
      { keys: "F", description: "全屏查看当前图片" },
      { keys: "←/→", description: "切换图片（全屏模式）" },
      { keys: "+/−", description: "缩放图片（全屏模式）" },
      { keys: "0", description: "重置缩放" },
      { keys: "Esc", description: "关闭全屏/弹窗" },
    ],
  },
];

export default function ShortcutsHelp({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0e12] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">键盘快捷键</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="space-y-4">
          {SHORTCUTS.map((group) => (
            <div key={group.group}>
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">
                {group.group}
              </div>
              <div className="space-y-1">
                {group.items.map((s) => (
                  <div key={s.keys} className="flex items-center justify-between py-1">
                    <span className="text-[12px] text-white/70">{s.description}</span>
                    <kbd className="rounded bg-white/10 px-2 py-0.5 font-mono text-[11px] text-white/60">
                      {s.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center text-[11px] text-white/30">
          快捷键仅在输入框未聚焦时生效
        </div>
      </div>
    </div>
  );
}

export function useGlobalShortcuts(handlers: {
  onTab?: (tab: number) => void;
  onTemplate?: () => void;
  onSnippets?: () => void;
  onFullscreen?: () => void;
  onHelp?: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case "1":
          handlers.onTab?.(0);
          break;
        case "2":
          handlers.onTab?.(1);
          break;
        case "3":
          handlers.onTab?.(2);
          break;
        case "4":
          handlers.onTab?.(3);
          break;
        case "t":
        case "T":
          e.preventDefault();
          handlers.onTemplate?.();
          break;
        case "s":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            handlers.onSnippets?.();
          }
          break;
        case "f":
        case "F":
          e.preventDefault();
          handlers.onFullscreen?.();
          break;
        case "?":
          handlers.onHelp?.();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlers]);
}
