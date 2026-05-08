"use client";

import { useEffect, useState } from "react";
import { HistoryItem, genId, normalizeImages } from "@/lib/history";
import type { Skill } from "@/lib/skills";
import PromptEditor from "./PromptEditor";

type Props = {
  models: string[];
  sizes: string[];
  enhanceModels: string[];
  skills: Skill[];
  onOpenSkills: () => void;
  initialPrompt: string;
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

  useEffect(() => setPrompt(initialPrompt), [initialPrompt]);
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

  const submit = async () => {
    if (loading) return;
    const finalPrompt = prompt.trim();
    if (!file) {
      setError("请先上传图片");
      return;
    }
    if (!finalPrompt) {
      setError("请先输入 Prompt");
      return;
    }
    setLoadingCount(n);
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("prompt", finalPrompt);
      fd.append("model", model);
      fd.append("size", size);
      fd.append("n", String(n));
      fd.append("image", file);
      const res = await fetch("/api/edit", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      const images = normalizeImages(data);
      if (!images.length) throw new Error("无返回图片");
      onResult({
        id: genId(),
        mode: "edit",
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

  const hint = loading ? null : !file ? "上传图片后开始" : null;

  return (
    <div className="card space-y-4 p-4">
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
            处理中…
          </>
        ) : (
          hint ?? "开始生成"
        )}
      </button>
    </div>
  );
}
