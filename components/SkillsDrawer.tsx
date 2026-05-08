"use client";

import { useEffect, useRef, useState } from "react";
import {
  Skill,
  loadSkills,
  upsertSkill,
  removeSkill,
  toggleSkill,
  SKILL_MAX,
} from "@/lib/skills";

type Props = {
  open: boolean;
  onClose: () => void;
  onChange: (skills: Skill[]) => void;
};

export default function SkillsDrawer({ open, onClose, onChange }: Props) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [editing, setEditing] = useState<Skill | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setSkills(loadSkills());
  }, [open]);

  const sync = (list: Skill[]) => {
    setSkills(list);
    onChange(list);
  };

  const onUpload = async (file: File) => {
    const text = await file.text();
    const name = file.name.replace(/\.(md|markdown|txt)$/i, "");
    const list = upsertSkill({
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      content: text,
      enabled: true,
      updatedAt: Date.now(),
    });
    sync(list);
  };

  const startNew = () => {
    setEditing({
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: "新建 Skill",
      content: "",
      enabled: true,
      updatedAt: Date.now(),
    });
  };

  const saveEditing = () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.content.trim()) return;
    sync(upsertSkill(editing));
    setEditing(null);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0d0e12] shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold">Skills</h2>
            <p className="text-[11px] text-white/40">上传 markdown，启用后会注入到 AI 美化的 system prompt</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-white/50 hover:bg-white/10 hover:text-white">
            ✕
          </button>
        </header>

        {!editing && (
          <>
            <div className="flex gap-2 border-b border-white/10 px-4 py-3">
              <input
                ref={fileRef}
                type="file"
                accept=".md,.markdown,.txt,text/markdown,text/plain"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                  if (fileRef.current) fileRef.current.value = "";
                }}
              />
              <button className="btn flex-1" onClick={() => fileRef.current?.click()}>
                上传 .md 文件
              </button>
              <button className="btn" onClick={startNew}>
                + 手动新建
              </button>
            </div>

            <div className="flex-1 overflow-auto p-3">
              {skills.length === 0 ? (
                <div className="mt-10 text-center text-sm text-white/40">
                  还没有 skill。上传一份 markdown 风格指令，启用后会让 AI 按你的风格改写 prompt。
                </div>
              ) : (
                <div className="space-y-2">
                  {skills.map((s) => (
                    <div
                      key={s.id}
                      className={`rounded-lg border p-3 transition ${
                        s.enabled ? "border-accent/40 bg-accent/5" : "border-white/10 bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          onClick={() => setEditing(s)}
                          className="flex-1 text-left"
                        >
                          <div className="text-sm font-medium text-white">{s.name}</div>
                          <div className="mt-0.5 line-clamp-2 text-[11px] text-white/40">
                            {s.content.slice(0, 120)}
                          </div>
                          <div className="mt-1 text-[10px] text-white/30">
                            {s.content.length} / {SKILL_MAX} 字
                          </div>
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => sync(toggleSkill(s.id))}
                            className={`rounded-md px-2 py-1 text-[11px] transition ${
                              s.enabled
                                ? "bg-accent/20 text-accent hover:bg-accent/30"
                                : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            {s.enabled ? "已启用" : "禁用"}
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`删除 skill "${s.name}"？`)) sync(removeSkill(s.id));
                            }}
                            className="rounded-md p-1 text-white/40 hover:bg-red-500/10 hover:text-red-400"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {editing && (
          <div className="flex flex-1 flex-col">
            <div className="space-y-3 border-b border-white/10 p-4">
              <div>
                <label className="label">名称</label>
                <input
                  className="input"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="例如：日系立绘风格"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-white/60">
                <input
                  type="checkbox"
                  checked={editing.enabled}
                  onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })}
                  className="accent-accent"
                />
                保存后立即启用
              </label>
            </div>
            <div className="flex flex-1 flex-col p-4">
              <div className="mb-1.5 flex items-center justify-between">
                <label className="label !mb-0">指令内容（Markdown）</label>
                <span
                  className={`text-[11px] ${
                    editing.content.length > SKILL_MAX ? "text-red-400" : "text-white/30"
                  }`}
                >
                  {editing.content.length} / {SKILL_MAX}
                </span>
              </div>
              <textarea
                className="input flex-1 resize-none font-mono text-xs leading-relaxed"
                value={editing.content}
                maxLength={SKILL_MAX}
                onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                placeholder="**Role & Objective:**&#10;You are an elite digital artist…"
              />
            </div>
            <div className="flex gap-2 border-t border-white/10 p-3">
              <button className="btn flex-1" onClick={() => setEditing(null)}>
                取消
              </button>
              <button
                className="btn btn-primary flex-1"
                onClick={saveEditing}
                disabled={!editing.name.trim() || !editing.content.trim()}
              >
                保存
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
