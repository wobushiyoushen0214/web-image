"use client";

import { useEffect, useRef, useState } from "react";
import type { Skill } from "@/lib/skills";

const MAX_SCENES = 6;

export type StoryboardConfig = {
  characterDesc: string;
  styleDesc: string;
  negative: string;
  skillId: string | null;
  model: string;
  size: string;
  sharedSeed: number | null;
  referenceFile: File | null;
  scenes: { id: string; text: string }[];
};

export type StoryboardScene = {
  id: string;
  text: string;
  status: "pending" | "loading" | "done" | "error";
  image?: string;
  seed?: number;
  prompt?: string;
  error?: string;
};

type Props = {
  skills: Skill[];
  models: string[];
  sizes: string[];
  onOpenSkills: () => void;
  setError: (s: string | null) => void;
  onStart: (config: StoryboardConfig) => void;
  running: boolean;
};

const SCENE_EXAMPLES = [
  ["早晨在阳台喝咖啡", "中午在书房看书", "下午在公园散步", "晚上坐在窗边看雨"],
  ["开心大笑", "皱眉思考", "惊讶张嘴", "偷偷眯眼笑"],
  ["坐在沙发看电视", "站起来伸懒腰", "走到厨房开冰箱", "捧着零食回到沙发"],
];

export default function StoryboardPanel({
  skills,
  models,
  sizes,
  onOpenSkills,
  setError,
  onStart,
  running,
}: Props) {
  const [characterDesc, setCharacterDesc] = useState("");
  const [styleDesc, setStyleDesc] = useState("");
  const [negative, setNegative] = useState("");
  const [skillId, setSkillId] = useState<string | null>(null);
  const [model, setModel] = useState(models[0]);
  const [size, setSize] = useState(sizes.includes("1024x1024") ? "1024x1024" : sizes[0]);
  const [useSharedSeed, setUseSharedSeed] = useState(true);
  const [seedInput, setSeedInput] = useState("");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [scenes, setScenes] = useState<{ id: string; text: string }[]>([
    { id: "s1", text: "" },
    { id: "s2", text: "" },
    { id: "s3", text: "" },
  ]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!referenceFile) {
      setReferencePreview(null);
      return;
    }
    const url = URL.createObjectURL(referenceFile);
    setReferencePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [referenceFile]);

  useEffect(() => {
    if (!models.includes(model)) setModel(models[0]);
  }, [models, model]);

  const addScene = () => {
    if (scenes.length >= MAX_SCENES) return;
    setScenes((cur) => [...cur, { id: `s${Date.now()}`, text: "" }]);
  };

  const removeScene = (id: string) => {
    setScenes((cur) => (cur.length > 1 ? cur.filter((s) => s.id !== id) : cur));
  };

  const updateScene = (id: string, text: string) => {
    setScenes((cur) => cur.map((s) => (s.id === id ? { ...s, text } : s)));
  };

  const applyExamples = (list: string[]) => {
    setScenes(
      list.map((t, i) => ({ id: `ex-${Date.now()}-${i}`, text: t })).slice(0, MAX_SCENES),
    );
  };

  const validScenes = scenes.filter((s) => s.text.trim());

  const start = () => {
    if (running) return;
    if (validScenes.length === 0) {
      setError("至少填写一个场景");
      return;
    }
    if (!characterDesc.trim() && !referenceFile) {
      setError("请填写「角色描述」或上传「参考图」");
      return;
    }
    setError(null);
    let sharedSeed: number | null = null;
    if (useSharedSeed) {
      if (seedInput.trim()) {
        const s = Number(seedInput);
        sharedSeed = Number.isFinite(s) ? Math.floor(s) : Math.floor(Math.random() * 2_147_483_647);
      } else {
        sharedSeed = Math.floor(Math.random() * 2_147_483_647);
      }
    }
    onStart({
      characterDesc: characterDesc.trim(),
      styleDesc: styleDesc.trim(),
      negative: negative.trim(),
      skillId,
      model,
      size,
      sharedSeed,
      referenceFile,
      scenes: validScenes,
    });
  };

  return (
    <div className="card space-y-4 p-4">
      <div>
        <label className="label">角色描述（每张都带上）</label>
        <textarea
          className="input min-h-[60px] resize-y text-sm"
          value={characterDesc}
          onChange={(e) => setCharacterDesc(e.target.value)}
          placeholder="例：一只戴红色围巾的橘猫，圆眼睛，胖乎乎的"
        />
      </div>

      <div>
        <label className="label">参考图（可选，作为角色锚定，走 img2img）</label>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setReferenceFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/70 transition hover:bg-white/10"
          >
            {referenceFile ? "更换参考图" : "选择图片"}
          </button>
          {referencePreview && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={referencePreview}
                alt="ref"
                className="h-10 w-10 rounded border border-white/20 object-cover"
              />
              <button
                type="button"
                onClick={() => setReferenceFile(null)}
                className="text-[11px] text-white/40 hover:text-red-400"
              >
                ✕ 移除
              </button>
            </>
          )}
        </div>
      </div>

      <div>
        <label className="label">风格描述（可选）</label>
        <input
          className="input text-sm"
          value={styleDesc}
          onChange={(e) => setStyleDesc(e.target.value)}
          placeholder="例：3D 卡通渲染，皮克斯风，柔光"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="label !mb-0">风格 Skill（可选，单选）</label>
          <button type="button" onClick={onOpenSkills} className="text-[11px] text-white/50 hover:text-white">
            管理 →
          </button>
        </div>
        {skills.length === 0 ? (
          <div className="rounded-md border border-dashed border-white/10 bg-white/[0.01] p-2 text-center text-[11px] text-white/40">
            还没有 Skill
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSkillId(null)}
              className={`rounded-md border px-2 py-1 text-[11px] transition ${
                skillId === null
                  ? "border-accent/60 bg-accent/15 text-white"
                  : "border-white/10 bg-white/5 text-white/60 hover:text-white"
              }`}
            >
              不使用
            </button>
            {skills.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSkillId(s.id)}
                className={`rounded-md border px-2 py-1 text-[11px] transition ${
                  skillId === s.id
                    ? "border-accent/60 bg-accent/15 text-white"
                    : "border-white/10 bg-white/5 text-white/60 hover:text-white"
                }`}
              >
                {s.name}
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
          <label className="label">尺寸（所有场景共用）</label>
          <select className="input" value={size} onChange={(e) => setSize(e.target.value)}>
            {sizes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
        <label className="flex cursor-pointer items-center gap-2 text-[12px] text-white/80">
          <input
            type="checkbox"
            checked={useSharedSeed}
            onChange={(e) => setUseSharedSeed(e.target.checked)}
            className="accent-accent"
          />
          所有场景共用同一个 seed（增强一致性）
        </label>
        {useSharedSeed && (
          <div className="mt-2 flex gap-1.5">
            <input
              className="input flex-1 text-xs"
              value={seedInput}
              onChange={(e) => setSeedInput(e.target.value.replace(/[^\d-]/g, ""))}
              placeholder="留空 = 自动生成一个共享 seed"
            />
            <button
              type="button"
              onClick={() => setSeedInput(String(Math.floor(Math.random() * 2_147_483_647)))}
              className="rounded-lg border border-white/10 bg-white/5 px-3 text-[11px] text-white/70 hover:bg-white/10"
              title="随机一个 seed"
            >
              🎲
            </button>
          </div>
        )}
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="label !mb-0">场景列表（{validScenes.length}/{scenes.length}）</label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={addScene}
              disabled={scenes.length >= MAX_SCENES}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/70 transition hover:bg-white/10 disabled:opacity-30"
            >
              + 加场景
            </button>
          </div>
        </div>
        <div className="mb-2 flex flex-wrap gap-1">
          {SCENE_EXAMPLES.map((ex, i) => (
            <button
              key={i}
              type="button"
              onClick={() => applyExamples(ex)}
              className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/50 transition hover:text-white"
              title="快速填充示例"
            >
              示例 {i + 1}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          {scenes.map((s, i) => (
            <div key={s.id} className="flex items-start gap-1.5">
              <span className="mt-1.5 w-5 text-center text-[11px] font-mono text-white/40">{i + 1}</span>
              <input
                className="input flex-1 text-xs"
                value={s.text}
                onChange={(e) => updateScene(s.id, e.target.value)}
                placeholder="描述这一幕的动作/场景/情绪"
              />
              <button
                type="button"
                onClick={() => removeScene(s.id)}
                disabled={scenes.length <= 1}
                className="mt-1 rounded text-white/40 transition hover:text-red-400 disabled:opacity-30"
                title="删除"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="label">负面词（可选）</label>
        <input
          className="input text-sm"
          value={negative}
          onChange={(e) => setNegative(e.target.value)}
          placeholder="low quality, deformed, watermark..."
        />
      </div>

      <button
        className="btn btn-primary w-full py-3 text-base"
        disabled={running || validScenes.length === 0 || (!characterDesc.trim() && !referenceFile)}
        onClick={start}
      >
        {running ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            故事板生成中…
          </>
        ) : (
          `开始生成故事板 · ${validScenes.length} 幕`
        )}
      </button>
    </div>
  );
}
