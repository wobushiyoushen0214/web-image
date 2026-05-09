"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  onClose: () => void;
  onConfirm: (composite: Blob, mask: Blob, newSize: string) => void;
};

const PRESETS: { label: string; w: number; h: number }[] = [
  { label: "正方 1:1", w: 1024, h: 1024 },
  { label: "竖 2:3", w: 1024, h: 1536 },
  { label: "横 3:2", w: 1536, h: 1024 },
  { label: "宽 16:9", w: 1536, h: 864 },
  { label: "高 9:16", w: 864, h: 1536 },
];

const DIRS = [
  { key: "all", label: "四周扩展", h: 0.5, v: 0.5 },
  { key: "top", label: "向上扩", h: 0.5, v: 1 },
  { key: "bottom", label: "向下扩", h: 0.5, v: 0 },
  { key: "left", label: "向左扩", h: 1, v: 0.5 },
  { key: "right", label: "向右扩", h: 0, v: 0.5 },
] as const;

export default function OutpaintPanel({ src, onClose, onConfirm }: Props) {
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [presetIdx, setPresetIdx] = useState(2);
  const [dirIdx, setDirIdx] = useState(0);
  const [scale, setScale] = useState(0.7);
  const previewRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImgSize({ w: img.width, h: img.height });
      setImgEl(img);
    };
    img.src = src;
  }, [src]);

  const preset = PRESETS[presetIdx];
  const dir = DIRS[dirIdx];

  const fitInfo = (() => {
    if (!imgEl) return null;
    const targetRatio = preset.w / preset.h;
    const imgRatio = imgEl.width / imgEl.height;
    let drawW: number;
    let drawH: number;
    if (imgRatio > targetRatio) {
      drawW = preset.w * scale;
      drawH = drawW / imgRatio;
    } else {
      drawH = preset.h * scale;
      drawW = drawH * imgRatio;
    }
    const x = (preset.w - drawW) * dir.h;
    const y = (preset.h - drawH) * dir.v;
    return { drawW, drawH, x, y };
  })();

  useEffect(() => {
    const c = previewRef.current;
    if (!c || !imgEl || !fitInfo) return;
    c.width = preset.w;
    c.height = preset.h;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "rgba(124,92,255,0.18)";
    ctx.fillRect(0, 0, preset.w, preset.h);
    const stripe = 24;
    ctx.strokeStyle = "rgba(124,92,255,0.6)";
    ctx.lineWidth = 2;
    for (let i = -preset.h; i < preset.w + preset.h; i += stripe) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + preset.h, preset.h);
      ctx.stroke();
    }
    ctx.drawImage(imgEl, fitInfo.x, fitInfo.y, fitInfo.drawW, fitInfo.drawH);
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1;
    ctx.strokeRect(fitInfo.x, fitInfo.y, fitInfo.drawW, fitInfo.drawH);
  }, [imgEl, preset, fitInfo, dirIdx]);

  const exportAll = () => {
    if (!imgEl || !fitInfo) return;
    const composite = document.createElement("canvas");
    composite.width = preset.w;
    composite.height = preset.h;
    const cctx = composite.getContext("2d");
    if (!cctx) return;
    cctx.fillStyle = "#ffffff";
    cctx.fillRect(0, 0, preset.w, preset.h);
    cctx.drawImage(imgEl, fitInfo.x, fitInfo.y, fitInfo.drawW, fitInfo.drawH);

    const mask = document.createElement("canvas");
    mask.width = preset.w;
    mask.height = preset.h;
    const mctx = mask.getContext("2d");
    if (!mctx) return;
    mctx.fillStyle = "#ffffff";
    mctx.fillRect(0, 0, preset.w, preset.h);
    mctx.fillStyle = "#000000";
    mctx.fillRect(fitInfo.x, fitInfo.y, fitInfo.drawW, fitInfo.drawH);

    composite.toBlob((cBlob) => {
      if (!cBlob) return;
      mask.toBlob((mBlob) => {
        if (!mBlob) return;
        onConfirm(cBlob, mBlob, `${preset.w}x${preset.h}`);
      }, "image/png");
    }, "image/png");
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-sm">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <div className="text-sm font-semibold">扩图 · 拓展画面到新尺寸</div>
          <div className="text-[11px] text-white/40">
            紫色斜纹 = AI 即将生成的新区域；原图按比例放在指定位置
          </div>
        </div>
        <button onClick={onClose} className="rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white">
          ✕
        </button>
      </header>

      <div className="flex flex-1 items-center justify-center overflow-auto p-4">
        <canvas
          ref={previewRef}
          className="max-h-[70vh] max-w-full rounded-lg border border-white/10 shadow-2xl"
        />
      </div>

      <footer className="space-y-2 border-t border-white/10 bg-[#0d0e12] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-white/40">尺寸</span>
          {PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setPresetIdx(i)}
              className={`rounded-md border px-2.5 py-1 text-[11px] transition ${
                presetIdx === i
                  ? "border-accent/60 bg-accent/15 text-white"
                  : "border-white/10 bg-white/5 text-white/60 hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-white/40">方向</span>
          {DIRS.map((d, i) => (
            <button
              key={d.key}
              onClick={() => setDirIdx(i)}
              className={`rounded-md border px-2.5 py-1 text-[11px] transition ${
                dirIdx === i
                  ? "border-accent/60 bg-accent/15 text-white"
                  : "border-white/10 bg-white/5 text-white/60 hover:text-white"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-wider text-white/40">原图占比</span>
          <input
            type="range"
            min={0.3}
            max={0.95}
            step={0.05}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="flex-1 accent-accent"
          />
          <span className="w-12 text-right font-mono text-[11px] text-white/60">
            {Math.round(scale * 100)}%
          </span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn">
              取消
            </button>
            <button onClick={exportAll} disabled={!imgEl} className="btn btn-primary disabled:opacity-40">
              ✓ 应用扩图
            </button>
          </div>
        </div>
        <div className="text-[10px] text-white/30">
          原图 {imgSize.w}×{imgSize.h} → 输出 {preset.w}×{preset.h}
        </div>
      </footer>
    </div>
  );
}
