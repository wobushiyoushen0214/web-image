export function genId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export type HistoryItem = {
  id: string;
  mode: "generate" | "edit";
  prompt: string;
  model: string;
  size: string;
  images: string[];
  createdAt: number;
};

const KEY = "web-image:history";
const MAX = 50;

export function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryItem[];
  } catch {
    return [];
  }
}

export function saveHistoryItem(item: HistoryItem): HistoryItem[] {
  const list = loadHistory();
  const next = [item, ...list].slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function removeHistoryItem(id: string): HistoryItem[] {
  const next = loadHistory().filter((x) => x.id !== id);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearHistory(): void {
  localStorage.removeItem(KEY);
}

export function normalizeImages(data: unknown): string[] {
  const arr = (data as { data?: Array<{ url?: string; b64_json?: string }> })?.data ?? [];
  return arr
    .map((x) => {
      if (x.url) return `/api/image?u=${encodeURIComponent(x.url)}`;
      if (x.b64_json) return `data:image/png;base64,${x.b64_json}`;
      return "";
    })
    .filter(Boolean);
}
