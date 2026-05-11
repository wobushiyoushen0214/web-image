export type Template = {
  id: string;
  name: string;
  category: string;
  prompt: string;
  negative?: string;
  size?: string;
  tags?: string[];
  isBuiltin?: boolean;
};

const KEY = "web-image:templates";

export const BUILTIN_TEMPLATES: Template[] = [
  {
    id: "product-white",
    name: "产品图 · 白底",
    category: "产品",
    prompt: "Professional product photography, centered on pure white background, soft studio lighting, high-end commercial quality, sharp focus, clean minimal composition",
    negative: "text, watermark, shadow on background, cluttered",
    size: "1024x1024",
    tags: ["电商", "产品"],
    isBuiltin: true,
  },
  {
    id: "product-lifestyle",
    name: "产品图 · 场景",
    category: "产品",
    prompt: "Lifestyle product photography in a cozy modern interior, natural window light, shallow depth of field, warm tones, editorial magazine style",
    negative: "text, watermark, artificial looking",
    size: "1536x1024",
    tags: ["电商", "场景"],
    isBuiltin: true,
  },
  {
    id: "portrait-cinematic",
    name: "人像 · 电影感",
    category: "人像",
    prompt: "Cinematic portrait photography, dramatic rim lighting, shallow depth of field f/1.4, moody atmosphere, film grain, shot on Arri Alexa, color graded",
    negative: "cartoon, anime, deformed, ugly, blurry",
    size: "1024x1536",
    tags: ["人像", "电影"],
    isBuiltin: true,
  },
  {
    id: "portrait-studio",
    name: "人像 · 棚拍",
    category: "人像",
    prompt: "Professional studio portrait, Rembrandt lighting setup, clean background, sharp eyes, natural skin texture, 85mm lens, fashion photography",
    negative: "cartoon, deformed, blurry, noisy",
    size: "1024x1536",
    tags: ["人像", "棚拍"],
    isBuiltin: true,
  },
  {
    id: "landscape-epic",
    name: "风景 · 史诗",
    category: "风景",
    prompt: "Epic landscape photography, golden hour, dramatic clouds, vast scale, National Geographic quality, ultra wide angle, vivid colors, sharp throughout",
    negative: "people, text, watermark, hdr artifacts",
    size: "1536x1024",
    tags: ["风景", "自然"],
    isBuiltin: true,
  },
  {
    id: "landscape-moody",
    name: "风景 · 氛围",
    category: "风景",
    prompt: "Moody atmospheric landscape, fog and mist, muted desaturated colors, long exposure water, minimalist composition, fine art photography",
    negative: "people, text, oversaturated",
    size: "1536x1024",
    tags: ["风景", "氛围"],
    isBuiltin: true,
  },
  {
    id: "anime-character",
    name: "动漫 · 角色",
    category: "插画",
    prompt: "Anime character illustration, detailed eyes, dynamic pose, vibrant colors, clean lineart, studio lighting, trending on pixiv, high quality anime art",
    negative: "realistic, photo, 3d, deformed hands, bad anatomy",
    size: "1024x1536",
    tags: ["动漫", "角色"],
    isBuiltin: true,
  },
  {
    id: "3d-cute",
    name: "3D · 可爱卡通",
    category: "插画",
    prompt: "Cute 3D character render, Pixar style, soft lighting, pastel colors, rounded shapes, adorable expression, clay material, studio background",
    negative: "realistic, scary, dark, horror",
    size: "1024x1024",
    tags: ["3D", "卡通"],
    isBuiltin: true,
  },
  {
    id: "icon-app",
    name: "图标 · App",
    category: "设计",
    prompt: "Modern app icon design, 3D rendered, glossy material, rounded square shape, single centered symbol, gradient background, iOS style, clean and minimal",
    negative: "text, complex, cluttered, flat",
    size: "1024x1024",
    tags: ["图标", "UI"],
    isBuiltin: true,
  },
  {
    id: "poster-retro",
    name: "海报 · 复古",
    category: "设计",
    prompt: "Retro vintage poster design, bold typography area, limited color palette, screen print texture, 1960s graphic design style, geometric shapes",
    negative: "photo, realistic, modern, gradient",
    size: "1024x1536",
    tags: ["海报", "复古"],
    isBuiltin: true,
  },
  {
    id: "food-overhead",
    name: "美食 · 俯拍",
    category: "产品",
    prompt: "Overhead food photography, beautiful plating, natural light from window, rustic wooden table, fresh ingredients scattered, editorial food styling, appetizing colors",
    negative: "artificial, plastic, blurry, dark",
    size: "1024x1024",
    tags: ["美食", "摄影"],
    isBuiltin: true,
  },
  {
    id: "arch-interior",
    name: "建筑 · 室内",
    category: "建筑",
    prompt: "Modern interior architecture photography, clean lines, natural light flooding in, minimalist furniture, warm wood and white palette, wide angle, architectural digest quality",
    negative: "cluttered, dark, old, dirty",
    size: "1536x1024",
    tags: ["建筑", "室内"],
    isBuiltin: true,
  },
];

export function loadUserTemplates(): Template[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Template[];
  } catch {
    return [];
  }
}

export function saveUserTemplate(t: Template): Template[] {
  const list = loadUserTemplates();
  const idx = list.findIndex((x) => x.id === t.id);
  if (idx >= 0) list[idx] = { ...t, isBuiltin: false };
  else list.unshift({ ...t, isBuiltin: false });
  localStorage.setItem(KEY, JSON.stringify(list));
  return list;
}

export function removeUserTemplate(id: string): Template[] {
  const list = loadUserTemplates().filter((x) => x.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
  return list;
}

export function getAllTemplates(): Template[] {
  return [...loadUserTemplates(), ...BUILTIN_TEMPLATES];
}

export function getCategories(templates: Template[]): string[] {
  return Array.from(new Set(templates.map((t) => t.category)));
}
