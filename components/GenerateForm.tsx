"use client";

import { useEffect, useState } from "react";
import { HistoryItem, genId, normalizeImages } from "@/lib/history";
import type { Skill } from "@/lib/skills";
import { composePrompt } from "@/lib/skills";
import { recordGenTime, estimateGenTime } from "@/lib/gen-stats";
import PromptEditor from "./PromptEditor";
import AdvancedControls from "./AdvancedControls";
import SnippetsDrawer from "./SnippetsDrawer";
import RefinePopover from "./RefinePopover";

type Props = {
  models: string[];
  sizes: string[];
  enhanceModels: string[];
  skills: Skill[];
  onOpenSkills: () => void;
  onOpenTemplates?: () => void;
  initialPrompt: string;
  initialNegative?: string;
  initialSeed?: number | null;
  initialSize?: string | null;
  loading: boolean;
  setLoading: (b: boolean) => void;
  setLoadingCount: (n: number) => void;
  setError: (s: string | null) => void;
  onResult: (item: HistoryItem) => void;
  onSubmitPrompt?: (prompt: string) => void;
};

const SUGGESTIONS = [
  "一只戴墨镜的柴犬坐在海边的躺椅上喝椰子水，夕阳光，电影感",
  "国风水墨画风格的少女撑伞站在江南雨巷，烟雨朦胧",
  "极简风格的白色陶瓷咖啡杯产品图，柔光，浅灰背景",
  "赛博朋克城市夜景，霓虹灯倒影在湿润的街道，俯视广角",
  "可爱 3D 卡通风格的橘猫宇航员漂浮在太空，皮克斯风",
  "复古港风电影海报，胶片颗粒，1990 年代香港街头",
];

export default function GenerateForm({
  models,
  sizes,
  enhanceModels,
  skills,
  onOpenSkills,
  onOpenTemplates,
  initialPrompt,
  initialNegative = "",
  initialSeed = null,
  initialSize = null,
  loading,
  setLoading,
  setLoadingCount,
  setError,
  onResult,
  onSubmitPrompt,
}: Props) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [model, setModel] = useState(models[0]);
  const [size, setSize] = useState("1024x1024");
  const [n, setN] = useState(1);
  const [negative, setNegative] = useState(initialNegative);
  const [seed, setSeed] = useState<string>(initialSeed != null ? String(initialSeed) : "");
  const [seedLocked, setSeedLocked] = useState(initialSeed != null);
  const [snippetsOpen, setSnippetsOpen] = useState(false);

  const appendSnippet = (text: string) => {
    setPrompt((cur) => {
      const trimmed = cur.trim();
      if (!trimmed) return text;
      return /[,，;；.。]$/.test(trimmed) ? `${trimmed} ${text}` : `${trimmed}, ${text}`;
    });
  };

  useEffect(() => setPrompt(initialPrompt), [initialPrompt]);
  useEffect(() => setNegative(initialNegative), [initialNegative]);
  useEffect(() => {
    if (initialSeed != null) {
      setSeed(String(initialSeed));
      setSeedLocked(true);
    }
  }, [initialSeed]);
  useEffect(() => {
    if (initialSize && sizes.includes(initialSize)) setSize(initialSize);
  }, [initialSize, sizes]);
  useEffect(() => {
    if (!models.includes(model)) setModel(models[0]);
  }, [models, model]);

  const submit = async () => {
    if (loading) return;
    const finalPrompt = composePrompt(prompt.trim(), skills);
    if (!finalPrompt.trim()) {
      setError("请先输入 Prompt 或启用一个 Skill");
      return;
    }
    setLoadingCount(n);
    setLoading(true);
    setError(null);
    onSubmitPrompt?.(finalPrompt);
    const startTime = Date.now();
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: finalPrompt,
          model,
          size,
          n,
          negative_prompt: negative.trim() || undefined,
          seed: seedLocked && seed ? Number(seed) : undefined,
        }),
      });
      const raw = await res.text();
      let data: any;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(`HTTP ${res.status}：${raw.slice(0, 300)}`);
      }
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      const images = normalizeImages(data);
      if (!images.length) throw new Error(`无返回图片，原始响应：${JSON.stringify(data).slice(0, 200)}`);
      const returnedSeed = typeof data?.seed === "number" ? data.seed : undefined;
      if (returnedSeed != null && !seedLocked) setSeed(String(returnedSeed));
      recordGenTime(model, size, Date.now() - startTime);
      onResult({
        id: genId(),
        mode: "generate",
        prompt: finalPrompt,
        model,
        size,
        images,
        createdAt: Date.now(),
        seed: returnedSeed,
        negative: negative.trim() || undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card space-y-4 p-4">
      <SnippetsDrawer
        open={snippetsOpen}
        onClose={() => setSnippetsOpen(false)}
        onAppend={appendSnippet}
      />
      <div>
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSnippetsOpen(true)}
              className="rounded-md bg-white/5 px-2.5 py-1 text-[11px] text-white/70 transition hover:bg-white/10 hover:text-white"
              title="打开 Prompt 片段库（构图/光线/风格...）"
            >
              🧩 片段库
            </button>
            {onOpenTemplates && (
              <button
                type="button"
                onClick={onOpenTemplates}
                className="rounded-md bg-white/5 px-2.5 py-1 text-[11px] text-white/70 transition hover:bg-white/10 hover:text-white"
                title="从预设模板一键填充完整参数"
              >
                📋 模板
              </button>
            )}
          </div>
          <RefinePopover
            value={prompt}
            onChange={setPrompt}
            enhanceModels={enhanceModels}
            skills={skills}
            setError={setError}
          />
        </div>
        <PromptEditor
          value={prompt}
          onChange={setPrompt}
          onSubmit={submit}
          enhanceModels={enhanceModels}
          setError={setError}
          skills={skills}
          onOpenSkills={onOpenSkills}
          placeholder="描述你想要的画面，中英文均可，点 ✨ 可一键扩写成详细英文 Prompt  (⌘/Ctrl + Enter 提交)"
        />
        {!prompt && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setPrompt(s)}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/60 transition hover:border-accent/40 hover:text-white"
              >
                {s.length > 18 ? s.slice(0, 18) + "…" : s}
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

      <AdvancedControls
        negative={negative}
        onNegativeChange={setNegative}
        seed={seed}
        onSeedChange={setSeed}
        seedLocked={seedLocked}
        onSeedLockedChange={setSeedLocked}
      />

      <button className="btn btn-primary w-full py-3 text-base" disabled={loading} onClick={submit}>
        {loading ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            生成中…
            {(() => {
              const est = estimateGenTime(model, size);
              return est ? <span className="ml-1 text-xs opacity-60">~{Math.round(est / 1000)}s</span> : null;
            })()}
          </>
        ) : (
          <>
            开始生成
            {(() => {
              const est = estimateGenTime(model, size);
              return est ? <span className="ml-1 text-xs opacity-50">~{Math.round(est / 1000)}s</span> : null;
            })()}
          </>
        )}
      </button>
    </div>
  );
}
