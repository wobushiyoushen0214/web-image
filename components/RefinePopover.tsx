"use client";

import { useEffect, useRef, useState } from "react";
import type { Skill } from "@/lib/skills";

type Props = {
  value: string;
  onChange: (v: string) => void;
  enhanceModels: string[];
  skills: Skill[];
  setError: (s: string | null) => void;
};

const PRESETS = ["更电影感", "更柔和的光", "更细节", "去掉文字", "更鲜艳的色彩", "黑白照片风格"];

export default function RefinePopover({ value, onChange, enhanceModels, skills, setError }: Props) {
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [previousValue, setPreviousValue] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popoverRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open]);

  const refine = async () => {
    const ins = instruction.trim();
    if (!ins || loading || !value.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const activeSkills = skills
        .filter((s) => s.enabled)
        .map((s) => `## Skill: ${s.name}\n${s.content.trim()}`);
      const res = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: value,
          model: enhanceModels[0] ?? "",
          lang: "en",
          skills: activeSkills,
          mode: "refine",
          instruction: ins,
        }),
      });
      const raw = await res.text();
      let data: any;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(`HTTP ${res.status}：${raw.slice(0, 200)}`);
      }
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      if (!data.prompt) throw new Error("未返回细化后的 prompt");
      setPreviousValue(value);
      onChange(data.prompt);
      setInstruction("");
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const undo = () => {
    if (previousValue == null) return;
    const cur = value;
    onChange(previousValue);
    setPreviousValue(cur);
  };

  return (
    <div className="flex items-center gap-1.5">
      {previousValue !== null && (
        <button
          type="button"
          onClick={undo}
          className="rounded-md bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300 transition hover:bg-emerald-500/20"
          title="切回原文（撤销 / 重做细化）"
        >
          ↺ 切回
        </button>
      )}
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={!value.trim()}
          className="rounded-md bg-white/5 px-2.5 py-1 text-[11px] text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
          title="基于现有 Prompt 增量细化"
        >
          ✏️ 细化
        </button>
        {open && (
          <div
            ref={popoverRef}
            className="absolute right-0 top-full z-30 mt-1.5 w-72 space-y-2 rounded-lg border border-white/10 bg-[#15171c] p-2 shadow-2xl"
          >
            <div className="flex flex-wrap gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setInstruction(p)}
                  className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/60 transition hover:text-white"
                >
                  {p}
                </button>
              ))}
            </div>
            <input
              className="input !py-1.5 text-xs"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) refine();
                if (e.key === "Escape") setOpen(false);
              }}
              placeholder="输入细化指令，如：更柔和的光"
              autoFocus
            />
            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md bg-white/5 px-2 py-1 text-[11px] text-white/60 hover:bg-white/10"
              >
                取消
              </button>
              <button
                type="button"
                onClick={refine}
                disabled={loading || !instruction.trim()}
                className="rounded-md bg-accent px-3 py-1 text-[11px] text-white transition hover:bg-accent/80 disabled:opacity-40"
              >
                {loading ? "细化中…" : "应用"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
