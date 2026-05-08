export type Skill = {
  id: string;
  name: string;
  content: string;
  enabled: boolean;
  updatedAt: number;
};

const KEY = "web-image:skills";
const MAX_CONTENT = 4000;

export function loadSkills(): Skill[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Skill[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveSkills(list: Skill[]): void {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function upsertSkill(s: Skill): Skill[] {
  const list = loadSkills();
  const idx = list.findIndex((x) => x.id === s.id);
  const trimmed = { ...s, content: s.content.slice(0, MAX_CONTENT), updatedAt: Date.now() };
  if (idx >= 0) list[idx] = trimmed;
  else list.unshift(trimmed);
  saveSkills(list);
  return list;
}

export function removeSkill(id: string): Skill[] {
  const list = loadSkills().filter((x) => x.id !== id);
  saveSkills(list);
  return list;
}

export function toggleSkill(id: string): Skill[] {
  const list = loadSkills().map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x));
  saveSkills(list);
  return list;
}

export function activeSkillsContent(skills: Skill[]): string {
  const active = skills.filter((s) => s.enabled);
  if (!active.length) return "";
  return active.map((s) => s.content.trim()).join("\n\n---\n\n");
}

export function composePrompt(userPrompt: string, skills: Skill[]): string {
  const skillText = activeSkillsContent(skills);
  if (!skillText) return userPrompt;
  const user = userPrompt.trim();
  if (!user) return skillText;
  return `${skillText}\n\n---\n\nUser input:\n${user}`;
}

export const SKILL_MAX = MAX_CONTENT;
