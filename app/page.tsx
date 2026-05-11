"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import GenerateForm from "@/components/GenerateForm";
import EditForm from "@/components/EditForm";
import ResultGrid from "@/components/ResultGrid";
import HistoryPanel from "@/components/HistoryPanel";
import SkillsDrawer from "@/components/SkillsDrawer";
import BatchPanel, { type BatchTask } from "@/components/BatchPanel";
import BatchResultMatrix from "@/components/BatchResultMatrix";
import StoryboardPanel, { type StoryboardConfig, type StoryboardScene } from "@/components/StoryboardPanel";
import StoryboardResult from "@/components/StoryboardResult";
import ImageLightbox from "@/components/ImageLightbox";
import ImageCompare from "@/components/ImageCompare";
import TemplateDrawer from "@/components/TemplateDrawer";
import QueuePanel, { type QueueItem } from "@/components/QueuePanel";
import ShortcutsHelp, { useGlobalShortcuts } from "@/components/ShortcutsHelp";
import ViewModeToggle, { type ViewMode } from "@/components/ViewModeToggle";
import RetryPanel, { isContentPolicyError } from "@/components/RetryPanel";
import { useToast } from "@/components/Toast";
import { HistoryItem, loadHistory, saveHistoryItem, normalizeImages, toggleStar, genId } from "@/lib/history";
import { Skill, loadSkills } from "@/lib/skills";
import type { Template } from "@/lib/templates";
import { recordGenTime, estimateGenTime } from "@/lib/gen-stats";
import { saveDraft, loadDraft, clearDraft } from "@/lib/draft";

type Tab = "generate" | "edit" | "batch" | "storyboard";

export default function Page() {
  const [tab, setTab] = useState<Tab>("generate");
  const [models, setModels] = useState<string[]>(["gpt-image-2"]);
  const [sizes, setSizes] = useState<string[]>(["1024x1024", "1024x1536", "1536x1024", "auto"]);
  const [enhanceModels, setEnhanceModels] = useState<string[]>([
    "z-ai/glm5",
    "moonshotai/kimi-k2-thinking",
  ]);
  const [images, setImages] = useState<string[]>([]);
  const [currentItem, setCurrentItem] = useState<HistoryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCount, setLoadingCount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activePrompt, setActivePrompt] = useState("");
  const [activeNegative, setActiveNegative] = useState("");
  const [activeSeed, setActiveSeed] = useState<number | null>(null);
  const [lastSubmittedPrompt, setLastSubmittedPrompt] = useState("");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillsOpen, setSkillsOpen] = useState(false);

  const [lightbox, setLightbox] = useState<{ images: string[]; index: number; compare?: string } | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const queueAbortMap = useRef<Map<string, AbortController>>(new Map());
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [snippetsOpen2, setSnippetsOpen2] = useState(false);
  const [compareState, setCompareState] = useState<{ a: string; b: string } | null>(null);
  const { toast } = useToast();

  const TABS: Tab[] = ["generate", "edit", "batch", "storyboard"];
  const shortcutHandlers = useMemo(() => ({
    onTab: (idx: number) => setTab(TABS[idx]),
    onTemplate: () => setTemplateOpen(true),
    onSnippets: () => setSnippetsOpen2((v) => !v),
    onFullscreen: () => {
      if (images.length > 0) setLightbox({ images, index: 0 });
    },
    onHelp: () => setShortcutsOpen(true),
  }), [images]);
  useGlobalShortcuts(shortcutHandlers);

  const [batchTasks, setBatchTasks] = useState<BatchTask[]>([]);
  const [batchSizes, setBatchSizes] = useState<string[]>([]);
  const [batchSkillRows, setBatchSkillRows] = useState<{ id: string | null; name: string }[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const batchAbortRef = useRef(false);

  const [storyboardScenes, setStoryboardScenes] = useState<StoryboardScene[]>([]);
  const [storyboardSeed, setStoryboardSeed] = useState<number | null>(null);
  const [storyboardRunning, setStoryboardRunning] = useState(false);
  const storyboardAbortRef = useRef(false);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.models) && d.models.length) setModels(d.models);
        if (Array.isArray(d.sizes) && d.sizes.length) setSizes(d.sizes);
        if (Array.isArray(d.enhanceModels) && d.enhanceModels.length) setEnhanceModels(d.enhanceModels);
      })
      .catch(() => {});
    setHistory(loadHistory());
    setSkills(loadSkills());
    const draft = loadDraft();
    if (draft) {
      if (draft.prompt) setActivePrompt(draft.prompt);
      if (draft.negative) setActiveNegative(draft.negative);
      if (draft.tab) setTab(draft.tab as Tab);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      saveDraft({ prompt: activePrompt, negative: activeNegative, tab });
    }, 1000);
    return () => clearTimeout(timer);
  }, [activePrompt, activeNegative, tab]);

  const onResult = (item: HistoryItem) => {
    setImages(item.images);
    setCurrentItem(item);
    setHistory(saveHistoryItem(item));
    clearDraft();
    toast(`生成完成 · ${item.images.length} 张图片`, "success");
  };

  const onPickHistory = (item: HistoryItem) => {
    setTab(item.mode);
    setImages(item.images);
    setCurrentItem(item);
    setActivePrompt(item.prompt);
    setActiveNegative(item.negative ?? "");
    setActiveSeed(item.seed ?? null);
  };

  const onTweak = () => {
    if (!currentItem) return;
    setActivePrompt(currentItem.prompt);
    setActiveNegative(currentItem.negative ?? "");
    setActiveSeed(currentItem.seed ?? null);
  };

  const onToggleCurrentStar = () => {
    if (!currentItem) return;
    const next = toggleStar(currentItem.id);
    setHistory(next);
    const updated = next.find((x) => x.id === currentItem.id);
    if (updated) setCurrentItem(updated);
  };

  const runBatch = async (tasks: BatchTask[], model: string) => {
    const uniqSizes = Array.from(new Set(tasks.map((t) => t.size)));
    const seenRow = new Set<string>();
    const rows: { id: string | null; name: string }[] = [];
    for (const t of tasks) {
      const key = t.skillId ?? "none";
      if (seenRow.has(key)) continue;
      seenRow.add(key);
      rows.push({ id: t.skillId, name: t.skillName });
    }
    setBatchSizes(uniqSizes);
    setBatchSkillRows(rows);
    setBatchTasks(tasks);
    setBatchRunning(true);
    batchAbortRef.current = false;
    setError(null);

    const CONCURRENCY = 2;
    const queue = [...tasks];
    const runOne = async (t: BatchTask) => {
      setBatchTasks((cur) => cur.map((x) => (x.id === t.id ? { ...x, status: "loading" } : x)));
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: t.prompt, model, size: t.size, n: 1 }),
        });
        const raw = await res.text();
        let data: any;
        try {
          data = JSON.parse(raw);
        } catch {
          throw new Error(`HTTP ${res.status}：${raw.slice(0, 200)}`);
        }
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        const imgs = normalizeImages(data);
        if (!imgs.length) throw new Error("无返回图");
        const seed = typeof data?.seed === "number" ? data.seed : undefined;
        setBatchTasks((cur) =>
          cur.map((x) =>
            x.id === t.id ? { ...x, status: "done", image: imgs[0], seed } : x,
          ),
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setBatchTasks((cur) =>
          cur.map((x) => (x.id === t.id ? { ...x, status: "error", error: msg } : x)),
        );
      }
    };

    const workers = Array.from({ length: CONCURRENCY }).map(async () => {
      while (queue.length > 0) {
        if (batchAbortRef.current) break;
        const t = queue.shift();
        if (!t) break;
        await runOne(t);
      }
    });
    await Promise.all(workers);
    setBatchRunning(false);
  };

  const onPickBatchSeed = (t: BatchTask) => {
    if (t.seed == null || !t.image) return;
    setTab("generate");
    setActivePrompt(t.prompt);
    setActiveSeed(t.seed);
    setImages([t.image]);
    setCurrentItem({
      id: `batch-${t.id}`,
      mode: "generate",
      prompt: t.prompt,
      model: "",
      size: t.size,
      images: [t.image],
      createdAt: Date.now(),
      seed: t.seed,
    });
  };

  const composeStoryboardPrompt = (cfg: StoryboardConfig, sceneText: string, skill: Skill | null) => {
    const parts: string[] = [];
    if (cfg.characterDesc) parts.push(`Character: ${cfg.characterDesc}`);
    parts.push(`Scene: ${sceneText}`);
    if (cfg.styleDesc) parts.push(`Style: ${cfg.styleDesc}`);
    const base = parts.join(". ");
    if (!skill) return base;
    return `${skill.content.trim()}\n\n---\n\nUser input:\n${base}`;
  };

  const runStoryboard = async (cfg: StoryboardConfig) => {
    const initial: StoryboardScene[] = cfg.scenes.map((s) => ({
      id: s.id,
      text: s.text,
      status: "pending",
    }));
    setStoryboardScenes(initial);
    setStoryboardSeed(cfg.sharedSeed);
    setStoryboardRunning(true);
    storyboardAbortRef.current = false;
    setError(null);

    const skill = cfg.skillId ? skills.find((s) => s.id === cfg.skillId) ?? null : null;
    const useImg2Img = !!cfg.referenceFile;

    for (const sc of cfg.scenes) {
      if (storyboardAbortRef.current) break;
      setStoryboardScenes((cur) =>
        cur.map((x) => (x.id === sc.id ? { ...x, status: "loading" } : x)),
      );
      const prompt = composeStoryboardPrompt(cfg, sc.text, skill);
      try {
        let data: any;
        if (useImg2Img && cfg.referenceFile) {
          const fd = new FormData();
          fd.append("prompt", prompt);
          fd.append("model", cfg.model);
          fd.append("size", cfg.size);
          fd.append("n", "1");
          fd.append("image", cfg.referenceFile);
          if (cfg.negative) fd.append("negative_prompt", cfg.negative);
          if (cfg.sharedSeed != null) fd.append("seed", String(cfg.sharedSeed));
          const res = await fetch("/api/edit", { method: "POST", body: fd });
          const raw = await res.text();
          try {
            data = JSON.parse(raw);
          } catch {
            throw new Error(`HTTP ${res.status}：${raw.slice(0, 200)}`);
          }
          if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        } else {
          const body: Record<string, unknown> = {
            prompt,
            model: cfg.model,
            size: cfg.size,
            n: 1,
          };
          if (cfg.sharedSeed != null) body.seed = cfg.sharedSeed;
          if (cfg.negative) body.negative_prompt = cfg.negative;
          const res = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const raw = await res.text();
          try {
            data = JSON.parse(raw);
          } catch {
            throw new Error(`HTTP ${res.status}：${raw.slice(0, 200)}`);
          }
          if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        }
        const imgs = normalizeImages(data);
        if (!imgs.length) throw new Error("无返回图");
        const seed = typeof data?.seed === "number" ? data.seed : undefined;
        setStoryboardScenes((cur) =>
          cur.map((x) =>
            x.id === sc.id ? { ...x, status: "done", image: imgs[0], seed, prompt } : x,
          ),
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setStoryboardScenes((cur) =>
          cur.map((x) => (x.id === sc.id ? { ...x, status: "error", error: msg, prompt } : x)),
        );
      }
    }
    setStoryboardRunning(false);
  };

  const onPickStoryboardScene = (s: StoryboardScene) => {
    if (s.seed == null || !s.image) return;
    setTab("generate");
    setActivePrompt(s.prompt ?? s.text);
    setActiveSeed(s.seed);
    setImages([s.image]);
    setCurrentItem({
      id: `story-${s.id}`,
      mode: "generate",
      prompt: s.prompt ?? s.text,
      model: "",
      size: "",
      images: [s.image],
      createdAt: Date.now(),
      seed: s.seed,
    });
  };

  const onOpenLightbox = (imgs: string[], index: number, compare?: string) => {
    setLightbox({ images: imgs, index, compare });
  };

  const onApplyTemplate = (t: Template) => {
    setActivePrompt(t.prompt);
    if (t.negative) setActiveNegative(t.negative);
    if (t.size) setActiveSize(t.size);
  };

  const [activeSize, setActiveSize] = useState<string | null>(null);

  const addToQueue = useCallback((prompt: string, model: string, size: string, n: number) => {
    const items: QueueItem[] = Array.from({ length: n }, () => ({
      id: genId(),
      prompt,
      status: "pending" as const,
    }));
    setQueue((prev) => [...prev, ...items]);
    return items.map((x) => x.id);
  }, []);

  const cancelQueueItem = useCallback((id: string) => {
    const ctrl = queueAbortMap.current.get(id);
    if (ctrl) ctrl.abort();
    setQueue((prev) =>
      prev.map((x) => (x.id === id && (x.status === "pending" || x.status === "running")
        ? { ...x, status: "cancelled" as const }
        : x)),
    );
  }, []);

  const cancelAllQueue = useCallback(() => {
    queueAbortMap.current.forEach((ctrl) => ctrl.abort());
    setQueue((prev) =>
      prev.map((x) => (x.status === "pending" || x.status === "running"
        ? { ...x, status: "cancelled" as const }
        : x)),
    );
  }, []);

  const retryQueueItem = useCallback((id: string) => {
    setQueue((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status: "pending" as const, error: undefined } : x)),
    );
  }, []);

  const clearQueue = useCallback(() => setQueue([]), []);

  const exportZip = async (items: HistoryItem[]) => {
    const urls = items.flatMap((it) => it.images);
    if (!urls.length) return;
    setError(null);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      await Promise.all(
        urls.map(async (url, i) => {
          const res = await fetch(url);
          const blob = await res.blob();
          const ext = blob.type.includes("png") ? "png" : "jpg";
          zip.file(`image-${i + 1}.${ext}`, blob);
        }),
      );
      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = `web-image-export-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast(`已导出 ${urls.length} 张图片`, "success");
    } catch (e) {
      setError(`导出失败：${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const onCompareImages = (a: string, b: string) => {
    setCompareState({ a, b });
  };

  return (
    <main className="mx-auto min-h-screen max-w-[1400px] px-4 py-6 lg:px-8">
      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          initialIndex={lightbox.index}
          compareImage={lightbox.compare}
          onClose={() => setLightbox(null)}
        />
      )}
      <TemplateDrawer
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        onApply={onApplyTemplate}
        currentPrompt={activePrompt}
        currentNegative={activeNegative}
        currentSize={activeSize ?? undefined}
      />
      <ShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      {compareState && (
        <ImageCompare
          imageA={compareState.a}
          imageB={compareState.b}
          onClose={() => setCompareState(null)}
          labelA="图片 A"
          labelB="图片 B"
        />
      )}
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-pink-500 text-lg font-bold text-white shadow-lg shadow-accent/30">
            ✦
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">Web Image</h1>
            <p className="text-xs text-white/40">OpenAI 兼容生图 · gpt-image-2</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShortcutsOpen(true)}
            className="rounded-md bg-white/5 px-2 py-1 text-[11px] text-white/40 transition hover:bg-white/10 hover:text-white/70"
            title="键盘快捷键"
          >
            ⌨ ?
          </button>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-white/40 transition hover:text-white/80"
          >
            每小时限额 20 次
          </a>
        </div>
      </header>

      <SkillsDrawer open={skillsOpen} onClose={() => setSkillsOpen(false)} onChange={setSkills} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-4">
          <div className="card flex p-1">
            <button
              className={`flex-1 whitespace-nowrap rounded-xl px-2 py-2 text-[13px] font-medium transition ${
                tab === "generate"
                  ? "bg-white/10 text-white shadow-inner"
                  : "text-white/50 hover:text-white"
              }`}
              onClick={() => setTab("generate")}
            >
              文生图
            </button>
            <button
              className={`flex-1 whitespace-nowrap rounded-xl px-2 py-2 text-[13px] font-medium transition ${
                tab === "edit"
                  ? "bg-white/10 text-white shadow-inner"
                  : "text-white/50 hover:text-white"
              }`}
              onClick={() => setTab("edit")}
            >
              图生图
            </button>
            <button
              className={`flex-1 whitespace-nowrap rounded-xl px-2 py-2 text-[13px] font-medium transition ${
                tab === "batch"
                  ? "bg-white/10 text-white shadow-inner"
                  : "text-white/50 hover:text-white"
              }`}
              onClick={() => setTab("batch")}
            >
              📊 批量
            </button>
            <button
              className={`flex-1 whitespace-nowrap rounded-xl px-2 py-2 text-[13px] font-medium transition ${
                tab === "storyboard"
                  ? "bg-white/10 text-white shadow-inner"
                  : "text-white/50 hover:text-white"
              }`}
              onClick={() => setTab("storyboard")}
            >
              🎬 故事板
            </button>
          </div>

          {tab === "generate" && (
            <GenerateForm
              models={models}
              sizes={sizes}
              enhanceModels={enhanceModels}
              skills={skills}
              onOpenSkills={() => setSkillsOpen(true)}
              onOpenTemplates={() => setTemplateOpen(true)}
              initialPrompt={activePrompt}
              initialNegative={activeNegative}
              initialSeed={activeSeed}
              initialSize={activeSize}
              loading={loading}
              setLoading={setLoading}
              setLoadingCount={setLoadingCount}
              setError={setError}
              onResult={onResult}
              onSubmitPrompt={setLastSubmittedPrompt}
            />
          )}
          {tab === "edit" && (
            <EditForm
              models={models}
              sizes={sizes}
              enhanceModels={enhanceModels}
              skills={skills}
              onOpenSkills={() => setSkillsOpen(true)}
              onOpenTemplates={() => setTemplateOpen(true)}
              initialPrompt={activePrompt}
              initialNegative={activeNegative}
              initialSeed={activeSeed}
              initialSize={activeSize}
              loading={loading}
              setLoading={setLoading}
              setLoadingCount={setLoadingCount}
              setError={setError}
              onResult={onResult}
              onSubmitPrompt={setLastSubmittedPrompt}
            />
          )}
          {tab === "batch" && (
            <BatchPanel
              skills={skills}
              models={models}
              sizes={sizes}
              enhanceModels={enhanceModels}
              onOpenSkills={() => setSkillsOpen(true)}
              setError={setError}
              onStart={runBatch}
              running={batchRunning}
            />
          )}
          {tab === "storyboard" && (
            <StoryboardPanel
              skills={skills}
              models={models}
              sizes={sizes}
              onOpenSkills={() => setSkillsOpen(true)}
              setError={setError}
              onStart={runStoryboard}
              running={storyboardRunning}
            />
          )}
        </aside>

        <section className="space-y-6">
          {error && (
            isContentPolicyError(error) && lastSubmittedPrompt ? (
              <RetryPanel
                error={error}
                originalPrompt={lastSubmittedPrompt}
                enhanceModels={enhanceModels}
                onRewrite={(newPrompt) => {
                  setActivePrompt(newPrompt);
                  setError(null);
                  toast("已填入改写后的 Prompt，点击生成按钮重试", "info");
                }}
                onDismiss={() => setError(null)}
              />
            ) : (
              <div className="animate-fade-in rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium">出错了</div>
                    <div className="mt-1 text-red-200/80">{error}</div>
                    {error.toLowerCase().includes("rate limit") && (
                      <div className="mt-2 text-[11px] text-red-200/60">
                        请求过于频繁，请等待一段时间后重试。
                      </div>
                    )}
                    {(error.includes("超时") || error.includes("timeout")) && (
                      <button
                        onClick={() => {
                          setError(null);
                          toast("请重新点击生成按钮重试", "info");
                        }}
                        className="mt-2 rounded-md bg-red-500/20 px-2.5 py-1 text-[11px] text-red-200 transition hover:bg-red-500/30"
                      >
                        ↻ 关闭并重试
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="rounded-md p-1 text-red-200/50 transition hover:text-red-200"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          )}
          <QueuePanel
            items={queue}
            onCancel={cancelQueueItem}
            onCancelAll={cancelAllQueue}
            onRetry={retryQueueItem}
            onClear={clearQueue}
          />
          {tab !== "batch" && tab !== "storyboard" && (
            <div className="flex items-center justify-end">
              <ViewModeToggle mode={viewMode} onChange={setViewMode} />
            </div>
          )}
          {tab === "batch" ? (
            <BatchResultMatrix
              tasks={batchTasks}
              sizes={batchSizes}
              skillRows={batchSkillRows}
              onPickSeed={onPickBatchSeed}
            />
          ) : tab === "storyboard" ? (
            <StoryboardResult
              scenes={storyboardScenes}
              sharedSeed={storyboardSeed}
              onPickScene={onPickStoryboardScene}
            />
          ) : (
            <ResultGrid
              images={images}
              loading={loading}
              loadingCount={loadingCount}
              seed={currentItem?.seed ?? null}
              prompt={currentItem?.prompt}
              starred={currentItem?.starred ?? false}
              viewMode={viewMode}
              onTweak={onTweak}
              onToggleStar={currentItem ? onToggleCurrentStar : undefined}
              onImageClick={(idx) => onOpenLightbox(images, idx)}
              onPostProcessed={(next) => {
                setImages(next);
                if (currentItem) {
                  const updated = { ...currentItem, images: next };
                  setCurrentItem(updated);
                  setHistory(saveHistoryItem(updated));
                }
              }}
              setError={setError}
            />
          )}
          <HistoryPanel items={history} onPick={onPickHistory} onChange={setHistory} onExportZip={exportZip} onCompare={onCompareImages} />
        </section>
      </div>
    </main>
  );
}
