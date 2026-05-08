export const RELAY_BASE_URL = process.env.RELAY_BASE_URL ?? "https://freeapi.dgbmc.top/v1";
export const RELAY_API_KEY = process.env.RELAY_API_KEY ?? "";

export const ENHANCE_BASE_URL = process.env.ENHANCE_BASE_URL ?? RELAY_BASE_URL;
export const ENHANCE_API_KEY = process.env.ENHANCE_API_KEY ?? RELAY_API_KEY;

export const MODELS = (process.env.RELAY_MODELS ?? "gpt-image-2")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const ENHANCE_MODELS = (process.env.ENHANCE_MODELS ?? "moonshotai/kimi-k2.5,minimaxai/minimax-m2.7")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const SIZES = ["1024x1024", "1024x1536", "1536x1024", "auto"] as const;
export type Size = (typeof SIZES)[number];
