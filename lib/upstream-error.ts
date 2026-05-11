const ERROR_MAP: Record<string, string> = {
  insufficient_quota: "上游额度不足，请联系管理员充值或更换 API Key",
  rate_limit_exceeded: "上游请求过于频繁，请稍后再试（Rate limit exceeded）",
  invalid_api_key: "API Key 无效或已过期，请检查服务端配置",
  model_not_found: "所选模型不可用，请切换其他模型重试",
  content_policy_violation: "内容审核未通过 (content_policy_violation)，请修改 Prompt 后重试",
  invalid_request_error: "请求参数有误，请检查输入",
  server_error: "上游服务器内部错误，请稍后重试",
  timeout: "上游响应超时，请稍后重试",
  billing_hard_limit_reached: "上游账户已达消费上限，请联系管理员",
  account_deactivated: "上游账户已被停用",
  safety_system: "内容审核未通过 (safety_system)，Prompt 可能包含敏感内容",
  moderation: "内容审核未通过 (moderation)，请修改 Prompt",
};

function matchErrorCode(code: string | undefined, type: string | undefined): string | null {
  if (code && ERROR_MAP[code]) return ERROR_MAP[code];
  if (type && ERROR_MAP[type]) return ERROR_MAP[type];
  for (const key of Object.keys(ERROR_MAP)) {
    if (code?.includes(key) || type?.includes(key)) return ERROR_MAP[key];
  }
  return null;
}

export function normalizeUpstreamError(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const err = (data as Record<string, unknown>).error;
  if (!err) return fallback;
  if (typeof err === "string") {
    const mapped = matchErrorCode(err, err);
    return mapped ?? err;
  }
  if (typeof err === "object") {
    const e = err as Record<string, unknown>;
    const code = typeof e.code === "string" ? e.code : undefined;
    const type = typeof e.type === "string" ? e.type : undefined;
    const message = typeof e.message === "string" ? e.message : undefined;
    const mapped = matchErrorCode(code, type);
    if (mapped) return `${mapped}（${message ?? code ?? type}）`;
    return message ?? code ?? type ?? fallback;
  }
  return fallback;
}

export function withNormalizedUpstreamError(data: unknown, fallback: string): { error: string } {
  return { error: normalizeUpstreamError(data, fallback) };
}
