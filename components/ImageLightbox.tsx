"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  images: string[];
  initialIndex?: number;
  onClose: () => void;
  compareImage?: string | null;
};

export default function ImageLightbox({ images, initialIndex = 0, onClose, compareImage }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [compareMode, setCompareMode] = useState(!!compareImage);
  const [sliderPos, setSliderPos] = useState(50);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const src = images[index];

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    resetView();
  }, [index, resetView]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIndex((i) => Math.min(images.length - 1, i + 1));
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(5, z + 0.5));
      if (e.key === "-") setZoom((z) => Math.max(0.5, z - 0.5));
      if (e.key === "0") resetView();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length, onClose, resetView]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    setZoom((z) => Math.max(0.5, Math.min(5, z + delta)));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (zoom <= 1) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setPan({
      x: dragStart.current.panX + (e.clientX - dragStart.current.x),
      y: dragStart.current.panY + (e.clientY - dragStart.current.y),
    });
  };

  const onPointerUp = () => setDragging(false);

  const onSliderMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    setSliderPos(x);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-md">
      <header className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 text-sm text-white/70">
          <span>
            {index + 1} / {images.length}
          </span>
          <span className="text-white/30">|</span>
          <span>{Math.round(zoom * 100)}%</span>
          {compareImage && (
            <button
              onClick={() => setCompareMode((v) => !v)}
              className={`rounded-md px-2 py-1 text-xs transition ${
                compareMode
                  ? "bg-accent/20 text-accent"
                  : "bg-white/10 text-white/60 hover:text-white"
              }`}
            >
              ⇔ 对比
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => Math.min(5, z + 0.5))}
            className="rounded-md bg-white/10 px-2 py-1 text-xs text-white/70 hover:bg-white/20"
          >
            +
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.5))}
            className="rounded-md bg-white/10 px-2 py-1 text-xs text-white/70 hover:bg-white/20"
          >
            −
          </button>
          <button
            onClick={resetView}
            className="rounded-md bg-white/10 px-2 py-1 text-xs text-white/70 hover:bg-white/20"
          >
            1:1
          </button>
          <a
            href={src}
            download={`image-${Date.now()}.png`}
            className="rounded-md bg-white/10 px-2 py-1 text-xs text-white/70 hover:bg-white/20"
          >
            ↓ 下载
          </a>
          <button
            onClick={onClose}
            className="rounded-md bg-white/10 px-2.5 py-1 text-sm text-white/70 hover:bg-white/20 hover:text-white"
          >
            ✕
          </button>
        </div>
      </header>

      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden"
        onWheel={onWheel}
      >
        {compareMode && compareImage ? (
          <div
            className="relative h-full w-full select-none"
            onPointerMove={onSliderMove}
            onPointerDown={onSliderMove}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={compareImage}
              alt="before"
              className="absolute inset-0 h-full w-full object-contain"
            />
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt="after"
                className="h-full w-full object-contain"
              />
            </div>
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-lg"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white px-2 py-1 text-[10px] font-bold text-black shadow">
                ⇔
              </div>
            </div>
            <div className="absolute bottom-4 left-4 rounded bg-black/60 px-2 py-1 text-[11px] text-white/70">
              Before
            </div>
            <div className="absolute bottom-4 right-4 rounded bg-black/60 px-2 py-1 text-[11px] text-white/70">
              After
            </div>
          </div>
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center ${
              zoom > 1 ? "cursor-grab" : ""
            } ${dragging ? "cursor-grabbing" : ""}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt="fullscreen"
              className="max-h-full max-w-full select-none transition-transform duration-100"
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              }}
              draggable={false}
            />
          </div>
        )}

        {images.length > 1 && !compareMode && (
          <>
            {index > 0 && (
              <button
                onClick={() => setIndex((i) => i - 1)}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-3 text-white/80 backdrop-blur transition hover:bg-black/80"
              >
                ‹
              </button>
            )}
            {index < images.length - 1 && (
              <button
                onClick={() => setIndex((i) => i + 1)}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-3 text-white/80 backdrop-blur transition hover:bg-black/80"
              >
                ›
              </button>
            )}
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex items-center justify-center gap-2 py-3">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-12 w-12 overflow-hidden rounded-md border-2 transition ${
                i === index ? "border-accent" : "border-white/20 opacity-60 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
