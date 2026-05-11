"use client";

import { useEffect, useState } from "react";
import {
  Template,
  getAllTemplates,
  getCategories,
  loadUserTemplates,
  saveUserTemplate,
  removeUserTemplate,
} from "@/lib/templates";
import { genId } from "@/lib/history";

type Props = {
  open: boolean;
  onClose: () => void;
  onApply: (t: Template) => void;
  currentPrompt?: string;
  currentNegative?: string;
  currentSize?: string;
};

export default function TemplateDrawer({
  open,
  onClose,
  onApply,
  currentPrompt,
  currentNegative,
  currentSize,
}: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeCat, setActiveCat] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveCategory, setSaveCategory] = useState("");

  useEffect(() => {
    if (open) setTemplates(getAllTemplates());
  }, [open]);

  if (!open) return null;

  const categories = getCategories(templates);
  const filtered = templates.filter((t) => {
    if (activeCat !== "all" && t.category !== activeCat) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.prompt.toLowerCase().includes(q) ||
      t.tags?.some((tag) => tag.toLowerCase().includes(q))
    );
  });

  const handleSave = () => {
    if (!saveName.trim() || !currentPrompt?.trim()) return;
    const t: Template = {
      id: genId(),
      name: saveName.trim(),
      category: saveCategory.trim() || "自定义",
      prompt: currentPrompt,
      negative: currentNegative,
      size: currentSize,
    };
    saveUserTemplate(t);
    setTemplates(getAllTemplates());
    setSaving(false);
    setSaveName("");
    setSaveCategory("");
  };

  const handleDelete = (id: string) => {
    removeUserTemplate(id);
    setTemplates(getAllTemplates());
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-[#0d0e12] shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold">Prompt 模板</h2>
            <p className="text-[11px] text-white/40">选择模板一键填充，或保存当前设置为模板</p>
          </div>
          <div className="flex items-center gap-2">
            {currentPrompt?.trim() && (
              <button
                onClick={() => setSaving(true)}
                className="rounded-md bg-accent/20 px-2.5 py-1 text-[11px] text-accent transition hover:bg-accent/30"
              >
                + 保存当前
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>
        </header>

        {saving && (
          <div className="border-b border-white/10 bg-accent/5 p-4 space-y-2">
            <div className="text-[12px] font-medium text-white/80">保存当前 Prompt 为模板</div>
            <input
              className="input !py-1.5 text-xs"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="模板名称，如：我的产品图风格"
              autoFocus
            />
            <input
              className="input !py-1.5 text-xs"
              value={saveCategory}
              onChange={(e) => setSaveCategory(e.target.value)}
              placeholder="分类（可选，默认：自定义）"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSaving(false)}
                className="rounded-md bg-white/5 px-2.5 py-1 text-[11px] text-white/60 hover:bg-white/10"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={!saveName.trim()}
                className="rounded-md bg-accent px-3 py-1 text-[11px] text-white transition hover:bg-accent/80 disabled:opacity-40"
              >
                保存
              </button>
            </div>
          </div>
        )}

        <div className="border-b border-white/5 p-3 space-y-2">
          <input
            className="input !py-1.5 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索模板名称、内容、标签…"
          />
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setActiveCat("all")}
              className={`rounded-md px-2 py-1 text-[11px] transition ${
                activeCat === "all"
                  ? "bg-accent/20 text-accent"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              全部
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
                className={`rounded-md px-2 py-1 text-[11px] transition ${
                  activeCat === c
                    ? "bg-accent/20 text-accent"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-3">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-[12px] text-white/40">没有匹配的模板</div>
          ) : (
            <div className="space-y-2">
              {filtered.map((t) => (
                <div
                  key={t.id}
                  className="group rounded-xl border border-white/10 bg-white/[0.02] p-3 transition hover:border-accent/30 hover:bg-accent/5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-white/90">{t.name}</span>
                        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50">
                          {t.category}
                        </span>
                        {t.isBuiltin && (
                          <span className="text-[10px] text-white/30">内置</span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/50">
                        {t.prompt}
                      </p>
                      {t.tags && t.tags.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {t.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] text-white/40"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {t.size && (
                        <span className="mt-1 inline-block text-[10px] text-white/30">
                          尺寸: {t.size}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => {
                          onApply(t);
                          onClose();
                        }}
                        className="rounded-md bg-accent/20 px-2.5 py-1 text-[11px] text-accent transition hover:bg-accent/30"
                      >
                        应用
                      </button>
                      {!t.isBuiltin && (
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="rounded-md bg-white/5 px-2.5 py-1 text-[11px] text-white/40 transition hover:text-red-400"
                        >
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="border-t border-white/10 px-4 py-2 text-[10px] text-white/30">
          点击"应用"将模板的 Prompt、负面词、尺寸填入表单。自定义模板可随时删除。
        </footer>
      </aside>
    </div>
  );
}
