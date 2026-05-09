"use client";

import { useState } from "react";
import type { Skill } from "@/lib/skills";
import { composePrompt } from "@/lib/skills";

const MAX_SKILLS = 4;
const MAX_SIZES = 3;

export type BatchTask = {
  id: string;
  skillId: string | null;
  skillName: string;
  size: string;
  prompt: string;
  status: "pending" | "loading" | "done" | "error";
  image?: string;
  seed?: number;
  error?: string;
};

type Props = {
  skills: Skill[];
  models: string[];
  sizes: string[];
  enhanceModels: string[];
  onOpenSkills: () => void;
  setError: (s: string | null) => void;
  onStart: (tasks: BatchTask[], model: string) => void;
  running: boolean;
};

export default function BatchPanel({
  skills,
  models,
  sizes,
  onOpenSkills,
  setError,
  onStart,
  running,
}: Props) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(models[0]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(["1024x1024"]);
  const [includeNoSkill, setIncludeNoSkill] = useState(true);

  const toggleSkill = (id: string) => {
    setSelectedSkillIds((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= MAX_SKILLS) return cur;
      return [...cur, id];
    });
  };

  const toggleSize = (s: string) => {
    setSelectedSizes((cur) => {
      if (cur.includes(s)) return cur.length > 1 ? cur.filter((x) => x !== s) : cur;
      if (cur.length >= MAX_SIZES) return cur;
      return [...cur, s];
    });
  };

  const skillRows = (() => {
    const picked = skills.filter((s) => selectedSkillIds.includes(s.id));
    const rows: { id: string | null; name: string; skill: Skill | null }[] = [];
    if (includeNoSkill) rows.push({ id: null, name: "无 Skill", skill: null });
    for (const s of picked) rows.push({ id: s.id, name: s.name, skill: s });
    return rows;
  })();

  const totalTasks = skillRows.length * selectedSizes.length;

  const start = () => {
    if (running) return;
    if (!prompt.trim()) {
      setError("请先输入 Prompt");
      return;
    }
    if (totalTasks === 0) {
      setError("至少选择一个 Skill 行或保留'无 Skill'");
      return;
    }
    if (totalTasks > 12) {
      setError(`一次批量最多 12 张（当前 ${totalTasks}），请减少 Skills 或尺寸`);
      return;
    }
    setError(null);
    const tasks: BatchTask[] = [];
    for (const row of skillRows) {
      for (const size of selectedSizes) {
        const finalPrompt = row.skill ? composePrompt(prompt.trim(), [row.skill]) : prompt.trim();
        tasks.push({
          id: `${row.id ?? "none"}__${size}__${Math.random().toString(36).slice(2, 8)}`,
          skillId: row.id,
          skillName: row.name,
          size,
          prompt: finalPrompt,
          status: "pending",
        });
      }
    }
    onStart(tasks, model);
  };

  return (
    <div className="card space-y-4 p-4">
      <div>
        <label className="label">Prompt</label>
        <textarea
          className="input min-h-[100px] resize-y"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="一段 prompt 会跨所有勾选的 Skill × 尺寸 跑一遍"
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
          <label className="label">总任务数</label>
          <div
            className={`input flex items-center justify-between font-mono text-sm ${
              totalTasks > 12 ? "text-red-300" : "text-white"
            }`}
          >
            <span>
              {skillRows.length} × {selectedSizes.length} ={" "}
              <span className="font-semibold">{totalTasks}</span>
            </span>
            <span className="text-[10px] text-white/30">上限 12</span>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="label !mb-0">
            尺寸（可多选，最多 {MAX_SIZES}）
          </label>
          <span className="text-[11px] text-white/40">
            选中 {selectedSizes.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sizes.map((s) => {
            const on = selectedSizes.includes(s);
            const disabled = !on && selectedSizes.length >= MAX_SIZES;
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSize(s)}
                disabled={disabled}
                className={`rounded-md border px-2.5 py-1 text-[11px] transition ${
                  on
                    ? "border-accent/60 bg-accent/15 text-white"
                    : "border-white/10 bg-white/5 text-white/60 hover:text-white disabled:opacity-30"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="label !mb-0">Skills 行（可多选，最多 {MAX_SKILLS}）</label>
          <button
            type="button"
            onClick={onOpenSkills}
            className="text-[11px] text-white/50 transition hover:text-white"
          >
            管理 Skills →
          </button>
        </div>
        <label className="mb-1.5 flex cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-[11px] text-white/70">
          <input
            type="checkbox"
            checked={includeNoSkill}
            onChange={(e) => setIncludeNoSkill(e.target.checked)}
            className="accent-accent"
          />
          作为对照行：包含「无 Skill」原始 prompt
        </label>
        {skills.length === 0 ? (
          <div className="rounded-md border border-dashed border-white/10 bg-white/[0.01] p-3 text-center text-[11px] text-white/40">
            还没有任何 Skill，先去管理面板上传或新建
          </div>
        ) : (
          <div className="space-y-1.5">
            {skills.map((s) => {
              const on = selectedSkillIds.includes(s.id);
              const disabled = !on && selectedSkillIds.length >= MAX_SKILLS;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSkill(s.id)}
                  disabled={disabled}
                  className={`flex w-full items-center justify-between rounded-md border px-2.5 py-1.5 text-left text-[12px] transition ${
                    on
                      ? "border-accent/60 bg-accent/15 text-white"
                      : "border-white/10 bg-white/[0.02] text-white/70 hover:text-white disabled:opacity-30"
                  }`}
                >
                  <span className="truncate">{s.name}</span>
                  <span className="text-[10px] text-white/40">{on ? "✓ 已选" : "+ 加入"}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <button
        className="btn btn-primary w-full py-3 text-base"
        disabled={running || totalTasks === 0 || totalTasks > 12 || !prompt.trim()}
        onClick={start}
      >
        {running ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            批量生成中…
          </>
        ) : (
          `开始批量生成 · ${totalTasks} 张`
        )}
      </button>
    </div>
  );
}
