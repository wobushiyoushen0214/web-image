"use client";

export type ViewMode = "grid" | "large" | "masonry";

type Props = {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
};

export default function ViewModeToggle({ mode, onChange }: Props) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-white/5 p-0.5">
      <button
        onClick={() => onChange("grid")}
        className={`rounded-md px-2 py-1 text-[11px] transition ${
          mode === "grid" ? "bg-white/15 text-white" : "text-white/50 hover:text-white"
        }`}
        title="网格视图"
      >
        ⊞
      </button>
      <button
        onClick={() => onChange("large")}
        className={`rounded-md px-2 py-1 text-[11px] transition ${
          mode === "large" ? "bg-white/15 text-white" : "text-white/50 hover:text-white"
        }`}
        title="大图视图"
      >
        ⊡
      </button>
      <button
        onClick={() => onChange("masonry")}
        className={`rounded-md px-2 py-1 text-[11px] transition ${
          mode === "masonry" ? "bg-white/15 text-white" : "text-white/50 hover:text-white"
        }`}
        title="瀑布流视图"
      >
        ⊟
      </button>
    </div>
  );
}
