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
  seed?: number;
  negative?: string;
  starred?: boolean;
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

function trim(list: HistoryItem[]): HistoryItem[] {
  const starred = list.filter((x) => x.starred);
  const unstarred = list.filter((x) => !x.starred).slice(0, Math.max(0, MAX - starred.length));
  return [...starred, ...unstarred].sort((a, b) => b.createdAt - a.createdAt);
}

export function saveHistoryItem(item: HistoryItem): HistoryItem[] {
  const list = loadHistory();
  const idx = list.findIndex((x) => x.id === item.id);
  const next = idx >= 0 ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list];
  const trimmed = trim(next);
  localStorage.setItem(KEY, JSON.stringify(trimmed));
  return trimmed;
}

export function removeHistoryItem(id: string): HistoryItem[] {
  const next = loadHistory().filter((x) => x.id !== id);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearHistory(): void {
  localStorage.removeItem(KEY);
}

export function toggleStar(id: string): HistoryItem[] {
  const next = loadHistory().map((x) => (x.id === id ? { ...x, starred: !x.starred } : x));
  const trimmed = trim(next);
  localStorage.setItem(KEY, JSON.stringify(trimmed));
  return trimmed;
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
