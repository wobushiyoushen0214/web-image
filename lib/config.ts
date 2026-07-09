export const RELAY_BASE_URL = process.env.RELAY_BASE_URL ?? "https://freeapi.dgbmc.top/v1";
export const RELAY_API_KEY = process.env.RELAY_API_KEY ?? "";
export const RELAY_MODEL_API_KEYS = parseModelApiKeys(process.env.RELAY_MODEL_API_KEYS);

export const ENHANCE_BASE_URL = process.env.ENHANCE_BASE_URL ?? RELAY_BASE_URL;
export const ENHANCE_API_KEY = process.env.ENHANCE_API_KEY ?? RELAY_API_KEY;

const RELAY_MODELS = (process.env.RELAY_MODELS ?? "gpt-image-2")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const MODELS = Array.from(new Set([...RELAY_MODELS, ...Object.keys(RELAY_MODEL_API_KEYS)]));

export const ENHANCE_MODELS = (process.env.ENHANCE_MODELS ?? "z-ai/glm5,moonshotai/kimi-k2-thinking")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const DESCRIBE_MODEL = process.env.DESCRIBE_MODEL ?? "z-ai/glm-4.5v";

export const SIZES = ["1024x1024", "1024x1536", "1536x1024", "auto"] as const;
export type Size = (typeof SIZES)[number];

function parseModelApiKeys(value: string | undefined): Record<string, string> {
  if (!value) return {};
  const entries: Record<string, string> = {};
  for (const pair of value.split(",")) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const sep = trimmed.indexOf("=");
    if (sep <= 0) continue;
    const model = trimmed.slice(0, sep).trim();
    const key = trimmed.slice(sep + 1).trim();
    if (model && key) entries[model] = key;
  }
  return entries;
}

export function getRelayApiKeyForModel(model: string) {
  return RELAY_MODEL_API_KEYS[model] ?? RELAY_API_KEY;
}
