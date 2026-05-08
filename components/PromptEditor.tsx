"use client";

import { useEffect, useState } from "react";
import type { Skill } from "@/lib/skills";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  enhanceModels: string[];
  placeholder?: string;
  minHeight?: string;
  setError: (s: string | null) => void;
  skills: Skill[];
  onOpenSkills: () => void;
};

const MAX_CHARS = 1000;

export default function PromptEditor({
  value,
  onChange,
  onSubmit,
  enhanceModels,
  placeholder,
  minHeight = "min-h-[140px]",
  setError,
  skills,
  onOpenSkills,
}: Props) {
  const [enhancing, setEnhancing] = useState(false);
  const [model, setModel] = useState(enhanceModels[0] ?? "");
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [lang, setLang] = useState<"en" | "zh">("en");

  useEffect(() => {
    if (enhanceModels.length && !enhanceModels.includes(model)) {
      setModel(enhanceModels[0]);
    }
  }, [enhanceModels, model]);

  const activeCount = skills.filter((s) => s.enabled).length;

  const enhance = async () => {
    if (!value.trim() || enhancing) return;
    setEnhancing(true);
    setError(null);
    try {
      const activeSkills = skills.filter((s) => s.enabled).map((s) => `## Skill: ${s.name}\n${s.content.trim()}`);
      const res = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: value, model, lang, skills: activeSkills }),
      });
      const raw = await res.text();
      let data: any;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(`HTTP ${res.status}：${raw.slice(0, 200)}`);
      }
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      if (!data.prompt) throw new Error("未返回美化后的 prompt");
      onChange(data.prompt);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setEnhancing(false);
    }
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="label !mb-0">Prompt</label>
        <span
          className={`text-[11px] ${
            value.length > MAX_CHARS
              ? "text-red-400"
              : value.length > MAX_CHARS * 0.9
              ? "text-amber-400"
              : "text-white/30"
          }`}
        >
          {value.length} / {MAX_CHARS}
        </span>
      </div>
      <div className="overflow-hidden rounded-lg border border-white/10 bg-white/5 transition focus-within:border-accent/60 focus-within:bg-white/[0.07] focus-within:ring-2 focus-within:ring-accent/20">
        <textarea
          className={`block w-full ${minHeight} resize-y bg-transparent px-3 py-2.5 text-sm leading-relaxed text-white placeholder:text-white/30 outline-none`}
          value={value}
          maxLength={MAX_CHARS}
          onChange={(e) => onChange(e.target.value)}
          onCompositionEnd={(e) => onChange((e.target as HTMLTextAreaElement).value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") onSubmit?.();
          }}
          placeholder={placeholder}
        />
        <div className="flex items-center justify-between gap-2 border-t border-white/5 bg-black/20 px-2 py-1.5">
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowModelMenu((s) => !s)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-white/60 transition hover:bg-white/10 hover:text-white"
                title="选择美化模型"
              >
                <span className="opacity-50">模型</span>
                <span>{model.split("/").pop()}</span>
                <svg width="10" height="10" viewBox="0 0 12 12" className="opacity-60">
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {showModelMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowModelMenu(false)} />
                  <div className="absolute bottom-full left-0 z-20 mb-1 min-w-[200px] overflow-hidden rounded-lg border border-white/10 bg-[#15171c] shadow-2xl">
                    {enhanceModels.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setModel(m);
                          setShowModelMenu(false);
                        }}
                        className={`block w-full px-3 py-2 text-left text-xs transition hover:bg-white/10 ${
                          m === model ? "bg-accent/10 text-accent" : "text-white/70"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="flex overflow-hidden rounded-md bg-white/5 text-[11px]">
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`px-2 py-1 transition ${
                  lang === "en" ? "bg-white/15 text-white" : "text-white/50 hover:text-white"
                }`}
                title="美化输出为英文"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang("zh")}
                className={`px-2 py-1 transition ${
                  lang === "zh" ? "bg-white/15 text-white" : "text-white/50 hover:text-white"
                }`}
                title="美化输出为中文"
              >
                中
              </button>
            </div>
            <button
              type="button"
              onClick={onOpenSkills}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition ${
                activeCount > 0
                  ? "bg-accent/20 text-accent hover:bg-accent/30"
                  : "text-white/50 hover:bg-white/10 hover:text-white"
              }`}
              title="管理 Skills（上传 markdown 风格指令）"
            >
              🎯 Skills{activeCount > 0 ? ` · ${activeCount}` : ""}
            </button>
          </div>
          <button
            type="button"
            onClick={enhance}
            disabled={enhancing || !value.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-accent to-pink-500 px-3 py-1 text-[11px] font-medium text-white shadow shadow-accent/30 transition hover:shadow-accent/50 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            title="用 AI 把当前描述扩写成详细 Prompt"
          >
            {enhancing ? (
              <>
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                美化中…
              </>
            ) : (
              <>✨ AI 美化</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
