"use client";

import { useEffect, useRef, useState } from "react";
import { HistoryItem, genId, normalizeImages } from "@/lib/history";
import type { Skill } from "@/lib/skills";
import { composePrompt } from "@/lib/skills";
import PromptEditor from "./PromptEditor";
import AdvancedControls from "./AdvancedControls";
import MaskPainter from "./MaskPainter";
import OutpaintPanel from "./OutpaintPanel";
import SnippetsDrawer from "./SnippetsDrawer";
import RefinePopover from "./RefinePopover";

type Props = {
  models: string[];
  sizes: string[];
  enhanceModels: string[];
  skills: Skill[];
  onOpenSkills: () => void;
  initialPrompt: string;
  initialNegative?: string;
  initialSeed?: number | null;
  loading: boolean;
  setLoading: (b: boolean) => void;
  setLoadingCount: (n: number) => void;
  setError: (s: string | null) => void;
  onResult: (item: HistoryItem) => void;
};

export default function EditForm({
  models,
  sizes,
  enhanceModels,
  skills,
  onOpenSkills,
  initialPrompt,
  initialNegative = "",
  initialSeed = null,
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
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [negative, setNegative] = useState(initialNegative);
  const [seed, setSeed] = useState<string>(initialSeed != null ? String(initialSeed) : "");
  const [seedLocked, setSeedLocked] = useState(initialSeed != null);
  const [describing, setDescribing] = useState(false);
  const [maskBlob, setMaskBlob] = useState<Blob | null>(null);
  const [maskPreview, setMaskPreview] = useState<string | null>(null);
  const [paintingMask, setPaintingMask] = useState(false);
  const [outpainting, setOutpainting] = useState(false);
  const [outpaintSize, setOutpaintSize] = useState<string | null>(null);
  const [snippetsOpen, setSnippetsOpen] = useState(false);

  const appendSnippet = (text: string) => {
    setPrompt((cur) => {
      const trimmed = cur.trim();
      if (!trimmed) return text;
      return /[,，;；.。]$/.test(trimmed) ? `${trimmed} ${text}` : `${trimmed}, ${text}`;
    });
  };

  const skipFileResetRef = useRef(false);

  useEffect(() => {
    if (!maskBlob) {
      setMaskPreview(null);
      return;
    }
    const url = URL.createObjectURL(maskBlob);
    setMaskPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [maskBlob]);

  useEffect(() => {
    if (skipFileResetRef.current) {
      skipFileResetRef.current = false;
      return;
    }
    setMaskBlob(null);
    setOutpaintSize(null);
  }, [file]);

  useEffect(() => setPrompt(initialPrompt), [initialPrompt]);
  useEffect(() => setNegative(initialNegative), [initialNegative]);
  useEffect(() => {
    if (initialSeed != null) {
      setSeed(String(initialSeed));
      setSeedLocked(true);
    }
  }, [initialSeed]);
  useEffect(() => {
    if (!models.includes(model)) setModel(models[0]);
  }, [models, model]);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) {
            setFile(f);
            e.preventDefault();
            return;
          }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const [dragOver, setDragOver] = useState(false);

  const describe = async () => {
    if (!file || describing) return;
    setDescribing(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("lang", "zh");
      const res = await fetch("/api/describe", { method: "POST", body: fd });
      const raw = await res.text();
      let data: any;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(`HTTP ${res.status}：${raw.slice(0, 200)}`);
      }
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      if (!data.prompt) throw new Error("未返回反推 prompt");
      setPrompt(data.prompt);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDescribing(false);
    }
  };

  const submit = async () => {
    if (loading) return;
    const finalPrompt = composePrompt(prompt.trim(), skills);
    if (!file) {
      setError("请先上传图片");
      return;
    }
    if (!finalPrompt.trim()) {
      setError("请先输入 Prompt 或启用一个 Skill");
      return;
    }
    setLoadingCount(n);
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("prompt", finalPrompt);
      fd.append("model", model);
      fd.append("size", outpaintSize ?? size);
      fd.append("n", String(n));
      fd.append("image", file);
      if (maskBlob) fd.append("mask", new File([maskBlob], "mask.png", { type: "image/png" }));
      if (negative.trim()) fd.append("negative_prompt", negative.trim());
      if (seedLocked && seed) fd.append("seed", seed);
      const res = await fetch("/api/edit", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      const images = normalizeImages(data);
      if (!images.length) throw new Error("无返回图片");
      const returnedSeed = typeof data?.seed === "number" ? data.seed : undefined;
      if (returnedSeed != null && !seedLocked) setSeed(String(returnedSeed));
      onResult({
        id: genId(),
        mode: "edit",
        prompt: finalPrompt,
        model,
        size: outpaintSize ?? size,
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

  const hint = loading ? null : !file ? "上传图片后开始" : null;

  return (
    <div className="card space-y-4 p-4">
      <SnippetsDrawer
        open={snippetsOpen}
        onClose={() => setSnippetsOpen(false)}
        onAppend={appendSnippet}
      />
      {paintingMask && preview && (
        <MaskPainter
          src={preview}
          onClose={() => setPaintingMask(false)}
          onConfirm={(blob) => {
            setMaskBlob(blob);
            setPaintingMask(false);
          }}
        />
      )}
      {outpainting && preview && (
        <OutpaintPanel
          src={preview}
          onClose={() => setOutpainting(false)}
          onConfirm={(composite, mask, newSize) => {
            const newFile = new File([composite], `outpaint-${Date.now()}.png`, { type: "image/png" });
            skipFileResetRef.current = true;
            setFile(newFile);
            setMaskBlob(mask);
            setOutpaintSize(newSize);
            setOutpainting(false);
          }}
        />
      )}
      <div>
        <label className="label">原图（支持点击 / 拖拽 / 粘贴）</label>
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f && f.type.startsWith("image/")) setFile(f);
          }}
          className={`group relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-sm transition ${
            dragOver
              ? "border-accent bg-accent/10 text-white"
              : "border-white/15 bg-white/[0.02] text-white/50 hover:border-accent/50 hover:text-white"
          }`}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="preview" className="max-h-48 rounded-lg object-contain" />
          ) : (
            <>
              <div className="text-2xl opacity-40">⬆</div>
              <div>点击选择 / 拖拽 / ⌘V 粘贴</div>
              <div className="text-[11px] text-white/30">PNG / JPG，建议正方形</div>
            </>
          )}
          {file && (
            <div className="mt-1 truncate text-[11px] text-white/40" title={file.name}>
              {file.name}
            </div>
          )}
        </label>
        {file && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={describe}
              disabled={describing}
              className="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2.5 py-1 text-[11px] text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              title="用 AI 反推这张图的 Prompt 并填入下方"
            >
              {describing ? (
                <>
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  反推中…
                </>
              ) : (
                <>🔎 反推 Prompt</>
              )}
            </button>
            <button
              type="button"
              onClick={() => setPaintingMask(true)}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] transition ${
                maskBlob && !outpaintSize
                  ? "bg-accent/20 text-accent hover:bg-accent/30"
                  : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
              title="只重绘涂抹区域，其它保持不变"
            >
              🎨 {maskBlob && !outpaintSize ? "已设蒙版 · 重新涂抹" : "涂蒙版（局部重绘）"}
            </button>
            <button
              type="button"
              onClick={() => setOutpainting(true)}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] transition ${
                outpaintSize
                  ? "bg-accent/20 text-accent hover:bg-accent/30"
                  : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
              title="拓展画面到新尺寸（如竖图变横图）"
            >
              📐 {outpaintSize ? `已设扩图 · ${outpaintSize}` : "扩图（Outpaint）"}
            </button>
            {(maskBlob || outpaintSize) && (
              <button
                type="button"
                onClick={() => {
                  setMaskBlob(null);
                  setOutpaintSize(null);
                }}
                className="text-[11px] text-white/40 transition hover:text-red-400"
                title="移除蒙版/扩图，回到整图编辑"
              >
                ✕ 移除
              </button>
            )}
            {maskPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={maskPreview}
                alt="mask"
                className="h-8 w-8 rounded border border-white/20 bg-black object-contain"
                title="蒙版预览：白=要重绘"
              />
            )}
          </div>
        )}
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSnippetsOpen(true)}
            className="rounded-md bg-white/5 px-2.5 py-1 text-[11px] text-white/70 transition hover:bg-white/10 hover:text-white"
            title="打开 Prompt 片段库"
          >
            🧩 片段库
          </button>
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
          minHeight="min-h-[100px]"
          placeholder="描述要如何修改这张图，中英文均可，点 ✨ 可一键扩写  (⌘/Ctrl + Enter 提交)"
        />
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
            处理中…
          </>
        ) : (
          hint ?? "开始生成"
        )}
      </button>
    </div>
  );
}
