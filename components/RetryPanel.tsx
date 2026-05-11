"use client";

import { useState } from "react";

type Props = {
  error: string;
  originalPrompt: string;
  onRewrite: (newPrompt: string) => void;
  onDismiss: () => void;
  enhanceModels: string[];
};

const POLICY_KEYWORDS = [
  "content_policy",
  "审核未通过",
  "moderation",
  "safety",
  "policy violation",
  "content policy",
  "违规",
  "sensitive",
];

export function isContentPolicyError(error: string): boolean {
  const lower = error.toLowerCase();
  return POLICY_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
}

export default function RetryPanel({ error, originalPrompt, onRewrite, onDismiss, enhanceModels }: Props) {
  const [rewriting, setRewriting] = useState(false);
  const [rewrittenPrompt, setRewrittenPrompt] = useState<string | null>(null);
  const [rewriteError, setRewriteError] = useState<string | null>(null);

  const handleRewrite = async () => {
    setRewriting(true);
    setRewriteError(null);
    try {
      const res = await fetch("/api/rewrite-safe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: originalPrompt,
          model: enhanceModels[0] ?? "",
          errorMessage: error,
        }),
      });
      const raw = await res.text();
      let data: any;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(`HTTP ${res.status}：${raw.slice(0, 200)}`);
      }
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      if (!data.prompt) throw new Error("改写失败");
      setRewrittenPrompt(data.prompt);
    } catch (e) {
      setRewriteError(e instanceof Error ? e.message : String(e));
    } finally {
      setRewriting(false);
    }
  };

  return (
    <div className="animate-fade-in rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-lg">⚠️</span>
        <div className="flex-1 space-y-3">
          <div>
            <div className="font-medium text-amber-200">内容审核未通过</div>
            <div className="mt-1 text-amber-200/70 text-[12px]">{error}</div>
          </div>

          {!rewrittenPrompt && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleRewrite}
                disabled={rewriting}
                className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/20 px-3 py-1.5 text-[12px] font-medium text-amber-200 transition hover:bg-amber-500/30 disabled:opacity-50"
              >
                {rewriting ? (
                  <>
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-amber-300/40 border-t-amber-300" />
                    AI 改写中…
                  </>
                ) : (
                  <>✨ AI 智能改写（绕过审核）</>
                )}
              </button>
              <button
                onClick={onDismiss}
                className="rounded-md px-2.5 py-1.5 text-[12px] text-white/50 transition hover:text-white"
              >
                手动修改
              </button>
            </div>
          )}

          {rewriteError && (
            <div className="rounded-md bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
              改写失败：{rewriteError}
            </div>
          )}

          {rewrittenPrompt && (
            <div className="space-y-2">
              <div className="text-[11px] font-medium text-emerald-300">改写后的 Prompt：</div>
              <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-[12px] leading-relaxed text-white/80">
                {rewrittenPrompt}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => onRewrite(rewrittenPrompt)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/20 px-3 py-1.5 text-[12px] font-medium text-emerald-200 transition hover:bg-emerald-500/30"
                >
                  ✓ 使用改写后的 Prompt 重新生成
                </button>
                <button
                  onClick={handleRewrite}
                  disabled={rewriting}
                  className="rounded-md bg-white/5 px-2.5 py-1.5 text-[12px] text-white/50 transition hover:text-white disabled:opacity-50"
                >
                  {rewriting ? "改写中…" : "再改写一次"}
                </button>
                <button
                  onClick={onDismiss}
                  className="rounded-md px-2.5 py-1.5 text-[12px] text-white/40 transition hover:text-white"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
