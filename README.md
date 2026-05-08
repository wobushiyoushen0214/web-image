# Web Image

OpenAI 兼容生图接口的 Web UI，可一键部署到 Vercel 供他人使用。

- 文生图 / 图生图（图片编辑）
- 服务端固定 API Key，前端不暴露
- 基于 IP 的滑动窗口限流（Vercel KV，缺失时降级到内存）
- 浏览器 localStorage 保存历史记录
- Next.js 14 App Router + Tailwind + TypeScript

## 本地开发

```bash
cp .env.example .env.local
# 编辑 .env.local 填入 RELAY_API_KEY
npm install
npm run dev
```

打开 http://localhost:3000 。

## 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `RELAY_BASE_URL` | 否 | 中转站 base URL，默认 `https://freeapi.dgbmc.top/v1` |
| `RELAY_API_KEY` | 是 | 中转站 API Key |
| `RELAY_MODELS` | 否 | 逗号分隔的模型列表，默认 `gpt-image-2` |
| `RATE_LIMIT_PER_HOUR` | 否 | 每个 IP 每小时调用上限，默认 `20` |
| `KV_REST_API_URL` | 否 | Vercel KV / Upstash Redis REST URL |
| `KV_REST_API_TOKEN` | 否 | Vercel KV / Upstash Redis REST Token |

未配置 KV 时，限流退化为单实例内存计数；Vercel Serverless 多实例下计数会偏少，建议生产环境务必接 KV。

## 部署到 Vercel

1. 将本仓库推到 GitHub。
2. Vercel → New Project → 选中仓库 → Framework 自动识别为 Next.js。
3. Environment Variables 填入：
   - `RELAY_API_KEY`（必填）
   - `RATE_LIMIT_PER_HOUR`（推荐设个保守值，例如 10–30）
4. 可选：在 Vercel → Storage → 创建 KV，会自动注入 `KV_REST_API_URL` / `KV_REST_API_TOKEN`。
5. Deploy。

## 接口约定

后端代理转发到中转站，与 OpenAI 一致：

- `POST /api/generate` → 上游 `/images/generations`，body 为 JSON：`{ prompt, model, size, n }`
- `POST /api/edit` → 上游 `/images/edits`，body 为 multipart：`prompt, model, size, n, image, mask?`
- `GET /api/config` → 返回前端可选模型与尺寸

如果你的中转站返回 `b64_json` 而不是 `url`，前端会自动转为 data URL 显示。

## 安全提示

- Key 存放在服务端环境变量，前端永远拿不到。
- 限流是防滥用最关键的一环；上线前务必接 KV。
- 如要进一步收紧，可在 `app/api/*` 加访问密码校验，或在 Vercel 前面挂 Cloudflare WAF / Access。
