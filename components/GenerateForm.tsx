"use client";

import { useEffect, useState } from "react";
import { HistoryItem, genId, normalizeImages } from "@/lib/history";

type Props = {
  models: string[];
  sizes: string[];
  initialPrompt: string;
  loading: boolean;
  setLoading: (b: boolean) => void;
  setLoadingCount: (n: number) => void;
  setError: (s: string | null) => void;
  onResult: (item: HistoryItem) => void;
};

const SUGGESTIONS = [
  "A serene Japanese garden in autumn, cinematic lighting, 4k",
  "Cyberpunk street at night, neon reflections on wet pavement",
  "Cute corgi astronaut floating in space, pixar style",
  "Minimalist product photo of a glass perfume bottle",
];

export default function GenerateForm({
  models,
  sizes,
  initialPrompt,
  loading,
  setLoading,
  setLoadingCount,
  setError,
  onResult,
}: Props) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [model, setModel] = useState(models[0]);
  const [size, setSize] = useState("1024x1024");
  const [n, setN] = useState(1);

  useEffect(() => setPrompt(initialPrompt), [initialPrompt]);
  useEffect(() => {
    if (!models.includes(model)) setModel(models[0]);
  }, [models, model]);

  const submit = async () => {
    if (loading) return;
    const finalPrompt = prompt.trim();
    if (!finalPrompt) {
      setError("请先输入 Prompt");
      return;
    }
    setLoadingCount(n);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt, model, size, n }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      console.log("[generate] response:", data);
      const images = normalizeImages(data);
      if (!images.length) throw new Error(`无返回图片，原始响应：${JSON.stringify(data).slice(0, 200)}`);
      onResult({
        id: genId(),
        mode: "generate",
        prompt: finalPrompt,
        model,
        size,
        images,
        createdAt: Date.now(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card space-y-4 p-4">
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="label !mb-0">Prompt</label>
          <span className="text-[11px] text-white/30">{prompt.length} 字</span>
        </div>
        <textarea
          className="input min-h-[140px] resize-y leading-relaxed"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onCompositionEnd={(e) => setPrompt((e.target as HTMLTextAreaElement).value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
          }}
          placeholder="描述你想要的画面，越具体越好…  (⌘/Ctrl + Enter 提交)"
        />
        {!prompt && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setPrompt(s)}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/60 transition hover:border-accent/40 hover:text-white"
              >
                {s.length > 28 ? s.slice(0, 28) + "…" : s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">模型</label>
          <select className="input" value={model} onChange={(e) => setModel(e.target.value)}>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">尺寸</label>
          <select className="input" value={size} onChange={(e) => setSize(e.target.value)}>
            {sizes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="label !mb-0">数量</label>
          <span className="text-sm font-medium text-white">{n}</span>
        </div>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((v) => (
            <button
              key={v}
              onClick={() => setN(v)}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-sm transition ${
                n === v
                  ? "border-accent/60 bg-accent/15 text-white"
                  : "border-white/10 bg-white/[0.03] text-white/50 hover:text-white"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <button className="btn btn-primary w-full py-3 text-base" disabled={loading} onClick={submit}>
        {loading ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            生成中…
          </>
        ) : (
          "开始生成"
        )}
      </button>
    </div>
  );
}
