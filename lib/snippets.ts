export type SnippetCategory = {
  id: string;
  name: string;
  emoji: string;
  items: string[];
};

export const SNIPPETS: SnippetCategory[] = [
  {
    id: "composition",
    name: "构图",
    emoji: "🎯",
    items: [
      "close-up shot",
      "medium shot",
      "wide angle shot",
      "bird's eye view",
      "low angle shot",
      "dutch angle",
      "symmetrical composition",
      "rule of thirds",
      "centered composition",
      "negative space",
      "shallow depth of field",
      "leading lines",
    ],
  },
  {
    id: "lighting",
    name: "光线",
    emoji: "💡",
    items: [
      "golden hour lighting",
      "blue hour",
      "soft natural light",
      "harsh sunlight",
      "rim light",
      "backlit silhouette",
      "studio lighting",
      "neon lighting",
      "candlelight",
      "moonlight",
      "volumetric lighting",
      "cinematic lighting",
      "dramatic chiaroscuro",
    ],
  },
  {
    id: "style",
    name: "风格",
    emoji: "🎨",
    items: [
      "photorealistic",
      "cinematic photography",
      "watercolor painting",
      "oil painting",
      "ink wash painting (水墨)",
      "anime style",
      "pixar 3D style",
      "studio ghibli style",
      "cyberpunk",
      "art nouveau",
      "minimalist flat design",
      "isometric illustration",
      "ukiyo-e",
      "low poly 3D",
    ],
  },
  {
    id: "color",
    name: "色调",
    emoji: "🌈",
    items: [
      "vibrant saturated colors",
      "muted pastel palette",
      "monochromatic",
      "warm tones",
      "cool tones",
      "high contrast",
      "duotone",
      "sepia tone",
      "neon palette",
      "earth tones",
      "complementary color scheme",
    ],
  },
  {
    id: "camera",
    name: "镜头/相机",
    emoji: "📷",
    items: [
      "shot on Sony A7R IV",
      "85mm portrait lens",
      "35mm film grain",
      "macro photography",
      "tilt-shift",
      "long exposure",
      "fisheye lens",
      "anamorphic lens flare",
      "Kodak Portra 400",
      "shallow f/1.4 bokeh",
    ],
  },
  {
    id: "quality",
    name: "质量词",
    emoji: "✨",
    items: [
      "highly detailed",
      "sharp focus",
      "8k resolution",
      "intricate details",
      "professional",
      "award-winning",
      "trending on artstation",
      "masterpiece",
      "photorealistic skin texture",
      "ultra realistic",
    ],
  },
];

export function findSnippetCategory(itemValue: string): SnippetCategory | null {
  for (const c of SNIPPETS) {
    if (c.items.includes(itemValue)) return c;
  }
  return null;
}
