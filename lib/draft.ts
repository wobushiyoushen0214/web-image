const DRAFT_KEY = "web-image:draft";

type Draft = {
  prompt: string;
  negative: string;
  model: string;
  size: string;
  tab: string;
  savedAt: number;
};

export function saveDraft(draft: Partial<Draft>): void {
  if (typeof window === "undefined") return;
  const existing = loadDraft();
  const merged = { ...existing, ...draft, savedAt: Date.now() };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(merged));
}

export function loadDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    if (Date.now() - d.savedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return d;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  localStorage.removeItem(DRAFT_KEY);
}
