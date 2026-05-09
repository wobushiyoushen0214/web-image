"use client";

import { useState } from "react";

const NEGATIVE_PRESETS: { label: string; value: string }[] = [
  { label: "低质量", value: "low quality, blurry, jpeg artifacts" },
  { label: "畸形手脚", value: "deformed hands, extra fingers, mutated limbs, bad anatomy" },
  { label: "多人/多脸", value: "multiple people, extra heads, duplicate faces" },
  { label: "水印/文字", value: "watermark, signature, text, logo" },
  { label: "过曝/欠曝", value: "overexposed, underexposed, washed out" },
  { label: "AI 痕迹", value: "ai-generated look, plastic skin, uncanny" },
];

type Props = {
  negative: string;
  onNegativeChange: (v: string) => void;
  seed: string;
  onSeedChange: (v: string) => void;
  seedLocked: boolean;
  onSeedLockedChange: (b: boolean) => void;
};

export default function AdvancedControls({
  negative,
  onNegativeChange,
  seed,
  onSeedChange,
  seedLocked,
  onSeedLockedChange,
}: Props) {
  const [open, setOpen] = useState(Boolean(negative || seed));
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-white/40 transition hover:text-white/70"
      >
        <span>高级 · {open ? "收起" : "展开"}</span>
        <span className="flex items-center gap-2 text-[10px] normal-case tracking-normal">
          {negative && <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-amber-300">负面词</span>}
          {seedLocked && seed && <span className="rounded bg-accent/20 px-1.5 py-0.5 text-accent">seed {seed}</span>}
        </span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-white/5 p-3">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="label !mb-0">负面词（避免出现）</label>
              {negative && (
                <button
                  type="button"
                  onClick={() => onNegativeChange("")}
                  className="text-[10px] text-white/40 hover:text-white/80"
                >
                  清空
                </button>
              )}
            </div>
            <textarea
              className="input min-h-[56px] resize-y text-xs"
              value={negative}
              onChange={(e) => onNegativeChange(e.target.value)}
              placeholder="例如：low quality, deformed hands, watermark..."
            />
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {NEGATIVE_PRESETS.map((p) => {
                const enabled = negative.includes(p.value);
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      if (enabled) {
                        onNegativeChange(
                          negative
                            .replace(p.value, "")
                            .replace(/,\s*,/g, ",")
                            .replace(/^[,\s]+|[,\s]+$/g, ""),
                        );
                      } else {
                        onNegativeChange(negative ? `${negative}, ${p.value}` : p.value);
                      }
                    }}
                    className={`rounded-full border px-2 py-0.5 text-[10px] transition ${
                      enabled
                        ? "border-amber-500/60 bg-amber-500/15 text-amber-200"
                        : "border-white/10 bg-white/5 text-white/50 hover:text-white"
                    }`}
                  >
                    {enabled ? "✓ " : "+ "}
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="label !mb-0">Seed（随机种子）</label>
              <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-white/50">
                <input
                  type="checkbox"
                  checked={seedLocked}
                  onChange={(e) => onSeedLockedChange(e.target.checked)}
                  className="accent-accent"
                />
                锁定 seed（出图微调时复用）
              </label>
            </div>
            <div className="flex gap-1.5">
              <input
                className="input flex-1 text-xs"
                value={seed}
                onChange={(e) => onSeedChange(e.target.value.replace(/[^\d-]/g, ""))}
                placeholder="留空 = 随机；填数字 = 固定"
                disabled={!seedLocked}
              />
              <button
                type="button"
                onClick={() => onSeedChange(String(Math.floor(Math.random() * 2_147_483_647)))}
                className="rounded-lg border border-white/10 bg-white/5 px-3 text-[11px] text-white/70 transition hover:bg-white/10"
                disabled={!seedLocked}
                title="随机一个 seed"
              >
                🎲
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
