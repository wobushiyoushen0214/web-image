"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  onClose: () => void;
  onConfirm: (maskBlob: Blob) => void;
};

const MIN_BRUSH = 8;
const MAX_BRUSH = 120;

function makeStripePattern(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 16;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "rgba(124,92,255,0.85)";
  ctx.fillRect(0, 0, 16, 16);
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = 3;
  ctx.lineCap = "square";
  ctx.beginPath();
  for (let i = -16; i < 32; i += 8) {
    ctx.moveTo(i, 16);
    ctx.lineTo(i + 16, 0);
  }
  ctx.stroke();
  return c;
}

export default function MaskPainter({ src, onClose, onConfirm }: Props) {
  const imgCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const visualCanvasRef = useRef<HTMLCanvasElement>(null);
  const stripePatternRef = useRef<HTMLCanvasElement | null>(null);
  const [brush, setBrush] = useState(40);
  const [tool, setTool] = useState<"brush" | "eraser">("brush");
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hasStrokes, setHasStrokes] = useState(false);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const history = useRef<ImageData[]>([]);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });

  useEffect(() => {
    stripePatternRef.current = makeStripePattern();
  }, []);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const max = 1024;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      setSize({ w, h });
      requestAnimationFrame(() => {
        const ic = imgCanvasRef.current;
        const mc = maskCanvasRef.current;
        const vc = visualCanvasRef.current;
        if (!ic || !mc || !vc) return;
        ic.width = w;
        ic.height = h;
        mc.width = w;
        mc.height = h;
        vc.width = w;
        vc.height = h;
        ic.getContext("2d")?.drawImage(img, 0, 0, w, h);
        mc.getContext("2d")?.clearRect(0, 0, w, h);
        vc.getContext("2d")?.clearRect(0, 0, w, h);
      });
    };
    img.src = src;
  }, [src]);

  const pushHistory = () => {
    const mc = maskCanvasRef.current;
    if (!mc) return;
    const ctx = mc.getContext("2d");
    if (!ctx) return;
    history.current.push(ctx.getImageData(0, 0, mc.width, mc.height));
    if (history.current.length > 30) history.current.shift();
  };

  const repaintVisual = () => {
    const mc = maskCanvasRef.current;
    const vc = visualCanvasRef.current;
    const pat = stripePatternRef.current;
    if (!mc || !vc || !pat) return;
    const vctx = vc.getContext("2d");
    if (!vctx) return;
    vctx.clearRect(0, 0, vc.width, vc.height);
    vctx.drawImage(mc, 0, 0);
    vctx.globalCompositeOperation = "source-in";
    const pattern = vctx.createPattern(pat, "repeat");
    if (pattern) {
      vctx.fillStyle = pattern;
      vctx.fillRect(0, 0, vc.width, vc.height);
    }
    vctx.globalCompositeOperation = "source-over";
  };

  const undo = () => {
    const mc = maskCanvasRef.current;
    if (!mc || history.current.length === 0) return;
    const ctx = mc.getContext("2d");
    if (!ctx) return;
    const prev = history.current.pop();
    if (prev) ctx.putImageData(prev, 0, 0);
    setHasStrokes(history.current.length > 0);
    repaintVisual();
  };

  const clear = () => {
    const mc = maskCanvasRef.current;
    if (!mc) return;
    pushHistory();
    mc.getContext("2d")?.clearRect(0, 0, mc.width, mc.height);
    setHasStrokes(false);
    repaintVisual();
  };

  const localCoords = (e: React.PointerEvent) => {
    const mc = maskCanvasRef.current;
    if (!mc) return { x: 0, y: 0 };
    const rect = mc.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * mc.width) / rect.width,
      y: ((e.clientY - rect.top) * mc.height) / rect.height,
    };
  };

  const drawAt = (x0: number | null, y0: number | null, x1: number, y1: number) => {
    const mc = maskCanvasRef.current;
    if (!mc) return;
    const ctx = mc.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.strokeStyle = "rgba(255,255,255,1)";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brush;
    if (x0 == null || y0 == null) {
      ctx.beginPath();
      ctx.arc(x1, y1, brush / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    repaintVisual();
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pushHistory();
    drawing.current = true;
    const p = localCoords(e);
    last.current = p;
    drawAt(null, null, p.x, p.y);
    setHasStrokes(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const mc = maskCanvasRef.current;
    if (!mc) return;
    const rect = mc.getBoundingClientRect();
    setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    if (!drawing.current || !last.current) return;
    const p = localCoords(e);
    drawAt(last.current.x, last.current.y, p.x, p.y);
    last.current = p;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    drawing.current = false;
    last.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const exportMask = () => {
    const mc = maskCanvasRef.current;
    if (!mc) return;
    const out = document.createElement("canvas");
    out.width = mc.width;
    out.height = mc.height;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, out.width, out.height);
    const src = mc.getContext("2d")?.getImageData(0, 0, mc.width, mc.height);
    if (!src) return;
    const dst = ctx.getImageData(0, 0, out.width, out.height);
    for (let i = 0; i < src.data.length; i += 4) {
      const v = src.data[i + 3] > 16 ? 255 : 0;
      dst.data[i] = v;
      dst.data[i + 1] = v;
      dst.data[i + 2] = v;
      dst.data[i + 3] = 255;
    }
    ctx.putImageData(dst, 0, 0);
    out.toBlob((b) => {
      if (b) onConfirm(b);
    }, "image/png");
  };

  const brushScreenSize = (() => {
    const mc = maskCanvasRef.current;
    if (!mc) return brush;
    const rect = mc.getBoundingClientRect();
    if (!rect.width) return brush;
    return brush * (rect.width / mc.width);
  })();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-sm">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <div className="text-sm font-semibold">局部重绘 · 涂抹要修改的区域</div>
          <div className="text-[11px] text-white/40">紫色斜纹 = 重新生成的区域；其余保持不变</div>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </header>

      <div className="flex flex-1 items-center justify-center overflow-auto p-4">
        <div
          className="relative inline-block max-h-full max-w-full overflow-hidden rounded-lg shadow-2xl"
          style={{ width: size.w || undefined, height: size.h || undefined }}
        >
          <canvas ref={imgCanvasRef} className="block max-h-[70vh] w-auto select-none" />
          <canvas
            ref={visualCanvasRef}
            className="pointer-events-none absolute inset-0 block h-full w-full"
            style={{ opacity: 0.85 }}
          />
          <canvas
            ref={maskCanvasRef}
            className="pointer-events-auto absolute inset-0 block h-full w-full cursor-none touch-none opacity-0"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={(e) => {
              setCursorVisible(false);
              onPointerUp(e);
            }}
            onPointerEnter={() => setCursorVisible(true)}
          />
          {cursorVisible && (
            <div
              aria-hidden
              className="pointer-events-none absolute rounded-full border-2 border-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.5)]"
              style={{
                width: brushScreenSize,
                height: brushScreenSize,
                left: cursor.x - brushScreenSize / 2,
                top: cursor.y - brushScreenSize / 2,
              }}
            />
          )}
        </div>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-white/10 bg-[#0d0e12] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-md border border-white/10 bg-white/5 text-[11px]">
            <button
              onClick={() => setTool("brush")}
              className={`px-3 py-1.5 transition ${
                tool === "brush" ? "bg-accent/20 text-accent" : "text-white/60 hover:text-white"
              }`}
            >
              🖌 画笔
            </button>
            <button
              onClick={() => setTool("eraser")}
              className={`px-3 py-1.5 transition ${
                tool === "eraser" ? "bg-accent/20 text-accent" : "text-white/60 hover:text-white"
              }`}
            >
              🧹 橡皮
            </button>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-white/60">
            <span>大小</span>
            <input
              type="range"
              min={MIN_BRUSH}
              max={MAX_BRUSH}
              value={brush}
              onChange={(e) => setBrush(Number(e.target.value))}
              className="w-32 accent-accent"
            />
            <span className="w-6 text-right font-mono">{brush}</span>
          </div>
          <button
            onClick={undo}
            disabled={!hasStrokes}
            className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/70 transition hover:bg-white/10 disabled:opacity-30"
          >
            ↩ 撤销
          </button>
          <button
            onClick={clear}
            disabled={!hasStrokes}
            className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/70 transition hover:bg-red-500/20 hover:text-red-300 disabled:opacity-30"
          >
            清空
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="btn">
            取消
          </button>
          <button
            onClick={exportMask}
            disabled={!hasStrokes}
            className="btn btn-primary disabled:opacity-40"
          >
            ✓ 应用蒙版
          </button>
        </div>
      </footer>
    </div>
  );
}
