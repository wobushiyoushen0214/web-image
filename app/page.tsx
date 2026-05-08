"use client";

import { useEffect, useState } from "react";
import GenerateForm from "@/components/GenerateForm";
import EditForm from "@/components/EditForm";
import ResultGrid from "@/components/ResultGrid";
import HistoryPanel from "@/components/HistoryPanel";
import { HistoryItem, loadHistory, saveHistoryItem } from "@/lib/history";

type Tab = "generate" | "edit";

export default function Page() {
  const [tab, setTab] = useState<Tab>("generate");
  const [models, setModels] = useState<string[]>(["gpt-image-2"]);
  const [sizes, setSizes] = useState<string[]>(["1024x1024", "1024x1536", "1536x1024", "auto"]);
  const [enhanceModels, setEnhanceModels] = useState<string[]>([
    "moonshotai/kimi-k2.5",
    "minimaxai/minimax-m2.7",
  ]);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCount, setLoadingCount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activePrompt, setActivePrompt] = useState("");

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
  }, []);

  const onResult = (item: HistoryItem) => {
    setImages(item.images);
    setHistory(saveHistoryItem(item));
  };

  const onPickHistory = (item: HistoryItem) => {
    setTab(item.mode);
    setImages(item.images);
    setActivePrompt(item.prompt);
  };

  return (
    <main className="mx-auto min-h-screen max-w-[1400px] px-4 py-6 lg:px-8">
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
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-white/40 transition hover:text-white/80"
        >
          每小时限额 20 次
        </a>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-4">
          <div className="card flex p-1">
            <button
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
                tab === "generate"
                  ? "bg-white/10 text-white shadow-inner"
                  : "text-white/50 hover:text-white"
              }`}
              onClick={() => setTab("generate")}
            >
              文生图
            </button>
            <button
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
                tab === "edit"
                  ? "bg-white/10 text-white shadow-inner"
                  : "text-white/50 hover:text-white"
              }`}
              onClick={() => setTab("edit")}
            >
              图生图
            </button>
          </div>

          {tab === "generate" ? (
            <GenerateForm
              models={models}
              sizes={sizes}
              enhanceModels={enhanceModels}
              initialPrompt={activePrompt}
              loading={loading}
              setLoading={setLoading}
              setLoadingCount={setLoadingCount}
              setError={setError}
              onResult={onResult}
            />
          ) : (
            <EditForm
              models={models}
              sizes={sizes}
              enhanceModels={enhanceModels}
              initialPrompt={activePrompt}
              loading={loading}
              setLoading={setLoading}
              setLoadingCount={setLoadingCount}
              setError={setError}
              onResult={onResult}
            />
          )}
        </aside>

        <section className="space-y-6">
          {error && (
            <div className="animate-fade-in rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              <div className="font-medium">出错了</div>
              <div className="mt-1 text-red-200/80">{error}</div>
            </div>
          )}
          <ResultGrid images={images} loading={loading} loadingCount={loadingCount} />
          <HistoryPanel items={history} onPick={onPickHistory} onChange={setHistory} />
        </section>
      </div>
    </main>
  );
}
