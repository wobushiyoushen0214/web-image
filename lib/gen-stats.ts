const KEY = "web-image:gen-stats";

type GenStat = {
  model: string;
  size: string;
  duration: number;
  timestamp: number;
};

const MAX_RECORDS = 100;

function loadStats(): GenStat[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as GenStat[];
  } catch {
    return [];
  }
}

function saveStats(stats: GenStat[]): void {
  localStorage.setItem(KEY, JSON.stringify(stats.slice(-MAX_RECORDS)));
}

export function recordGenTime(model: string, size: string, duration: number): void {
  const stats = loadStats();
  stats.push({ model, size, duration, timestamp: Date.now() });
  saveStats(stats);
}

export function estimateGenTime(model: string, size: string): number | null {
  const stats = loadStats();
  const relevant = stats.filter((s) => s.model === model && s.size === size);
  if (relevant.length < 2) {
    const modelOnly = stats.filter((s) => s.model === model);
    if (modelOnly.length < 2) return null;
    const avg = modelOnly.reduce((sum, s) => sum + s.duration, 0) / modelOnly.length;
    return Math.round(avg);
  }
  const recent = relevant.slice(-10);
  const avg = recent.reduce((sum, s) => sum + s.duration, 0) / recent.length;
  return Math.round(avg);
}

export function getStats(): { totalGenerations: number; avgTime: number | null; fastestTime: number | null } {
  const stats = loadStats();
  if (stats.length === 0) return { totalGenerations: 0, avgTime: null, fastestTime: null };
  const avg = stats.reduce((sum, s) => sum + s.duration, 0) / stats.length;
  const fastest = Math.min(...stats.map((s) => s.duration));
  return {
    totalGenerations: stats.length,
    avgTime: Math.round(avg),
    fastestTime: Math.round(fastest),
  };
}
