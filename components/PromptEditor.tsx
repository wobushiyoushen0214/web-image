"use client";

import { useState } from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  enhanceModels: string[];
  placeholder?: string;
  minHeight?: string;
  setError: (s: string | null) => void;
};

export default function PromptEditor({
  value,
  onChange,
  onSubmit,
  enhanceModels,
  placeholder,
  minHeight = "min-h-[140px]",
  setError,
}: Props) {
  const [enhancing, setEnhancing] = useState(false);
  const [model, setModel] = useState(enhanceModels[0] ?? "");
  const [showModelMenu, setShowModelMenu] = useState(false);

  const enhance = async () => {
    if (!value.trim() || enhancing) return;
    setEnhancing(true);
    setError(null);
    try {
      const res = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: value, model }),
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
        <span className="text-[11px] text-white/30">{value.length} 字</span>
      </div>
      <div className="relative">
        <textarea
          className={`input ${minHeight} resize-y pb-12 leading-relaxed`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onCompositionEnd={(e) => onChange((e.target as HTMLTextAreaElement).value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") onSubmit?.();
          }}
          placeholder={placeholder}
        />
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowModelMenu((s) => !s)}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/60 transition hover:border-white/20 hover:text-white"
              title="选择美化模型"
            >
              {model.split("/").pop()} ▾
            </button>
            {showModelMenu && (
              <div className="absolute bottom-full left-0 z-10 mb-1 min-w-[180px] overflow-hidden rounded-lg border border-white/10 bg-[#15171c] shadow-xl">
                {enhanceModels.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setModel(m);
                      setShowModelMenu(false);
                    }}
                    className={`block w-full px-3 py-2 text-left text-xs transition hover:bg-white/10 ${
                      m === model ? "text-accent" : "text-white/70"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={enhance}
            disabled={enhancing || !value.trim()}
            className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/15 px-2.5 py-1 text-[11px] font-medium text-accent transition hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
            title="用 AI 把当前描述扩写成详细英文 Prompt"
          >
            {enhancing ? (
              <>
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-accent/40 border-t-accent" />
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
