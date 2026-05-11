"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  imageA: string;
  imageB: string;
  onClose: () => void;
  labelA?: string;
  labelB?: string;
};

export default function ImageCompare({ imageA, imageB, onClose, labelA = "A", labelB = "B" }: Props) {
  const [mode, setMode] = useState<"slider" | "side" | "overlay">("slider");
  const [sliderPos, setSliderPos] = useState(50);
  const [opacity, setOpacity] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onSliderMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    setSliderPos(x);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-md">
      <header className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white/80">图片对比</span>
          <div className="flex overflow-hidden rounded-md bg-white/10 text-[11px]">
            <button
              onClick={() => setMode("slider")}
              className={`px-2.5 py-1 transition ${mode === "slider" ? "bg-white/20 text-white" : "text-white/50 hover:text-white"}`}
            >
              滑块
            </button>
            <button
              onClick={() => setMode("side")}
              className={`px-2.5 py-1 transition ${mode === "side" ? "bg-white/20 text-white" : "text-white/50 hover:text-white"}`}
            >
              并排
            </button>
            <button
              onClick={() => setMode("overlay")}
              className={`px-2.5 py-1 transition ${mode === "overlay" ? "bg-white/20 text-white" : "text-white/50 hover:text-white"}`}
            >
              叠加
            </button>
          </div>
          {mode === "overlay" && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/40">透明度</span>
              <input
                type="range"
                min="0"
                max="100"
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-white/20 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              />
              <span className="text-[11px] text-white/40">{opacity}%</span>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded-md bg-white/10 px-2.5 py-1 text-sm text-white/70 hover:bg-white/20 hover:text-white"
        >
          ✕
        </button>
      </header>

      <div ref={containerRef} className="relative flex-1 overflow-hidden p-4">
        {mode === "slider" && (
          <div
            className="relative h-full w-full select-none"
            onPointerMove={onSliderMove}
            onPointerDown={onSliderMove}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageA}
              alt={labelA}
              className="absolute inset-0 h-full w-full object-contain"
            />
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageB}
                alt={labelB}
                className="h-full w-full object-contain"
              />
            </div>
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white/80"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white px-2 py-1 text-[10px] font-bold text-black shadow">
                ⇔
              </div>
            </div>
            <div className="absolute bottom-4 left-4 rounded bg-black/60 px-2 py-1 text-[11px] text-white/70">
              {labelA}
            </div>
            <div className="absolute bottom-4 right-4 rounded bg-black/60 px-2 py-1 text-[11px] text-white/70">
              {labelB}
            </div>
          </div>
        )}

        {mode === "side" && (
          <div className="flex h-full gap-4">
            <div className="flex-1 flex flex-col items-center gap-2">
              <span className="text-[11px] text-white/50">{labelA}</span>
              <div className="flex-1 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageA} alt={labelA} className="max-h-full max-w-full object-contain rounded-lg" />
              </div>
            </div>
            <div className="w-px bg-white/10" />
            <div className="flex-1 flex flex-col items-center gap-2">
              <span className="text-[11px] text-white/50">{labelB}</span>
              <div className="flex-1 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageB} alt={labelB} className="max-h-full max-w-full object-contain rounded-lg" />
              </div>
            </div>
          </div>
        )}

        {mode === "overlay" && (
          <div className="relative h-full w-full flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageA}
              alt={labelA}
              className="absolute max-h-full max-w-full object-contain"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageB}
              alt={labelB}
              className="absolute max-h-full max-w-full object-contain"
              style={{ opacity: opacity / 100 }}
            />
            <div className="absolute bottom-4 left-4 rounded bg-black/60 px-2 py-1 text-[11px] text-white/70">
              {labelA} (底层)
            </div>
            <div className="absolute bottom-4 right-4 rounded bg-black/60 px-2 py-1 text-[11px] text-white/70">
              {labelB} ({opacity}%)
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
