# 出图能力路线图（Image Quality Roadmap）

> 状态：Stage 1 进行中 · 2026-05-09
> 方向：先打磨"出图引擎"，暂不做商业化（用户/积分/支付）。
> 决策：去掉「多模型对比」一项。

---

## 总览

```
用户 prompt ──▶ [可选] AI 美化 ──▶ [可选] 拼接 Skills ──▶ 上游 /images/generations ──▶ 返回
                                                              │
                                    上游完全黑盒（只传 model/size/n/prompt/quality/background）
```

## 当前能力与缺口

**已具备**
- AI 美化（一次性扩写）：[app/api/enhance/route.ts](app/api/enhance/route.ts)
- Skills 系统（风格注入）：[lib/skills.ts](lib/skills.ts)
- 文生图 / 图生图：[app/api/generate/route.ts](app/api/generate/route.ts) · [app/api/edit/route.ts](app/api/edit/route.ts)

**缺口（按对出图质量影响排序）**

| # | 缺口 | 影响 |
|---|---|---|
| 1 | Prompt 工程深度（结构化、负面词、风格参考） | ★★★★★ |
| 2 | 没有参考图（构图/风格/人脸借鉴） | ★★★★★ |
| 3 | 没有局部重绘（inpaint） | ★★★★ |
| 4 | 没有扩图（outpaint） | ★★★★ |
| 5 | 没有高清放大 | ★★★★ |
| 6 | 没有 seed 控制 | ★★★ |
| 7 | 没有批量变体 | ★★★ |
| 8 | 没有风格/角色一致性 | ★★★ |
| 9 | 没有反推 prompt（图→词） | ★★ |
| 10 | 结果筛选机制 | ★★ |
| 11 | Prompt 片段库 | ★★ |
| 12 | 模型能力档案 | ★ |

---

## 分阶段计划

### 🔥 Stage 1 · Prompt 工程升级（1–2 周，立竿见影）

不动上游、不加依赖，纯前后端拉一档质量。

| 子项 | 说明 |
|---|---|
| **结构化 Prompt 构造器** | 拆 prompt 为 主体 / 构图 / 光线 / 风格 / 色彩 / 质量词 / 负面词，可只填主体 |
| **负面词（Negative Prompt）** | 后端拼到 prompt 尾部 + 同时透传 `negative_prompt` 字段；常用负面词库一键勾选 |
| **AI 美化 v2** | 多版本生成（摄影/插画/写实）+ 增量细化（"更电影感"）+ 原始/美化对比 |
| **Prompt 片段（Snippets）库** | 内置 200+ 词块（镜头/光线/色调/风格/艺术家），点击插入 |
| **反推 Prompt（图→词）** | 上传图调 Vision 模型反推 prompt，可一键填入编辑框 |
| **Seed 暴露 + 锁定** | 服务端总是产生 seed 并回吐；UI 显示；"基于这张微调"按钮固定 seed |

#### 第一口甜头（1 周内可交付）
1. 负面词 + 结构化 prompt 构造器
2. Seed 可见 + 锁定重生成
3. 反推 prompt（图→词）
4. AI 美化 v2（三选一 + 增量细化）

---

### 🎯 Stage 2 · 图像条件控制（2–3 周，质变）

| 子项 | 状态 | 说明 |
|---|---|---|
| **局部重绘（Inpaint）** | ✅ | Canvas 画笔 + 紫色斜纹蒙版可视化 + 撤销/清空，导出黑白 mask 走 `/api/edit` |
| **扩图（Outpaint）** | ✅ | 5 个尺寸预设 × 5 个方向 + 原图占比滑杆，本地合成 composite + mask 走 `/api/edit` |
| **高清放大** | ✅ | 新增 `/api/upscale`，img2img 二跑兜底（不依赖上游 upscale 端点），输出 1536² |
| **去背景 / 换背景** | ✅ | 新增 `/api/remove-bg`，带抠图 prompt + `background=transparent`，回落白底；ResultGrid 结果卡下棋盘格背景预览透明 |
| **参考图模式** | ⏳ | 风险高，等评估上游 image-to-image weight 支持情况 |

---

### 🎭 Stage 3 · 一致性与批量（3–4 周）

> ❌ 移除「多模型对比」

| 子项 | 状态 | 说明 |
|---|---|---|
| **批量变体矩阵** | ✅ | prompt × N Skills × M 尺寸，2 路客户端并发，矩阵展示 + 单 cell 状态/seed/微调入口 |
| **系列图工作流（故事板）** | ✅ | 角色描述 + 风格 + 共享 seed + 可选参考图（img2img），多场景串行执行 |
| **角色一致性** | ⏳ | 上传 3–5 张同角色图，提取特征注入；无 LoRA 时走"特征提示增强"软一致性 |

---

### 🛠 Stage 4 · 工程与体验（持续）

| 子项 | 状态 | 说明 |
|---|---|---|
| **结果收藏** | ✅ | history schema 加 `starred` 字段；ResultGrid 信息条 + History 卡片都能星标；收藏不计入 50 上限 |
| **历史搜索** | ✅ | HistoryPanel 加搜索框（prompt/尺寸/seed）+ 「⭐ 只看收藏」筛选 |
| **模型能力档案** | ⏳ | 每个模型显示擅长/不擅长/推荐尺寸/典型 prompt 长度 |
| **Prompt 历史智能化** | ⏳ | 成功 prompt 归档；失败 prompt 标红+改写建议 |
| **可靠性** | ⏳ | 上游多路由备份；进度条；失败重试 |

---

## 优先级（ICE 打分）

| 优先级 | 能力 | I | C | E |
|---|---|---|---|---|
| 🔥 P0 | 负面词 + 结构化 prompt | 9 | 9 | 9 |
| 🔥 P0 | Seed 暴露 + 微调 | 8 | 9 | 9 |
| 🔥 P0 | 反推 Prompt | 8 | 8 | 8 |
| 🔥 P0 | AI 美化 v2 | 8 | 9 | 8 |
| ⭐ P1 | Prompt 片段库 | 7 | 9 | 8 |
| ⭐ P1 | 局部重绘画笔 | 9 | 8 | 6 |
| ⭐ P1 | 扩图 | 8 | 8 | 6 |
| ⭐ P1 | 高清放大 | 9 | 7 | 5 |
| ⭐ P1 | 去背景 | 7 | 9 | 7 |
| 🎯 P2 | 批量矩阵 | 7 | 8 | 6 |
| 🎯 P2 | 参考图模式 | 9 | 6 | 4 |
| 🎯 P3 | 角色一致性 | 8 | 5 | 3 |

---

## Stage 1 实施清单（正在进行）

- [x] 后端 generate 透传 `seed`（仅在用户锁定时；负面词改为 prompt 文本注入，不传上游字段）
- [x] 后端 edit 透传 `seed`
- [x] history schema 增加 `seed` / `negative` 字段
- [x] AI 美化 v2：增加 `mode=refine` 增量细化（API + 独立 Popover UI）
- [x] 新增 `/api/describe`：图 → prompt
- [x] GenerateForm：负面词 UI + seed 锁定（AdvancedControls 共享组件）
- [x] EditForm：seed 锁定 + 反推 prompt 按钮
- [x] ResultGrid：显示 seed + "基于这张微调"
- [x] Prompt 片段（Snippets）库：6 大类 60+ 词条，独立 Drawer，点击追加到 Prompt 末尾
- [x] Refine 独立 Popover：`✏️ 细化` 按钮挂在 PromptEditor 外部工具栏，不嵌入 textarea 容器，支持 6 个预设 + ↺ 切回原文

## Stage 2 实施清单

- [x] MaskPainter 组件（Canvas + 斜纹蒙版可视化 + 画笔/橡皮/撤销/清空）
- [x] EditForm 接入 inpaint：上传图后 "🎨 涂蒙版" 按钮，蒙版自动随 file 重置
- [x] OutpaintPanel 组件（5 尺寸 × 5 方向 + 占比滑杆，本地合成 composite + mask）
- [x] EditForm 接入 outpaint：上传图后 "📐 扩图" 按钮，自动覆写 file/mask/size
- [x] `/api/upscale`：img2img 二跑兜底，输出 1536²，不依赖上游新端点
- [x] ResultGrid 接入 "⤴ 高清放大"，原地替换并写回 history
- [x] `/api/remove-bg`：抠图 prompt + `background=transparent`，结果卡棋盘格背景预览透明
- [x] ResultGrid 接入 "✂ 去背景"，与 upscale 共用 onPostProcessed 回写
- [ ] 参考图模式（构图/风格/配色借鉴）—— 待评估

## Stage 3 实施清单

- [x] BatchPanel：prompt + 多 Skills + 多尺寸 + 任务数预算（上限 12）
- [x] BatchResultMatrix：行=Skill / 列=尺寸，每 cell 独立 pending/loading/done/error 状态
- [x] page.tsx Tab 第三页 "📊 批量"，runBatch 客户端 2 路并发执行
- [x] 单 cell "✎" 按钮：seed/prompt 同步回主工作台微调
- [x] StoryboardPanel：角色/风格/负面词 + 风格 Skill 单选 + 共享 seed + 参考图（img2img 模式）+ 场景列表（最多 6 幕）
- [x] StoryboardResult：横向连环画展示，每幕显示编号/文本/seed/缩略图
- [x] page.tsx Tab 第四页 "🎬 故事板"，runStoryboard 串行执行
- [x] 单幕 "✎" 按钮：跳到主工作台用该幕的 seed/prompt 微调
- [ ] 角色一致性（人脸/角色注入）—— 待 Vision 模型探针

## Stage 4 实施清单

- [x] history `starred` 字段 + `toggleStar` API；收藏不计入 50 上限，新增 trim 函数区分对待
- [x] HistoryPanel：搜索框（prompt/尺寸/seed）+ 「⭐ 只看收藏」筛选 + 卡片 hover 星标按钮 + 已收藏左上角徽标
- [x] ResultGrid 信息条加 "⭐ 收藏" 按钮，状态与 history 双向同步
- [x] page.tsx onToggleCurrentStar：切星后从新 history 里找回 currentItem 以保持一致
- [ ] 快捷键 1-4 选图 / 空格预览 / ⌘K 搜索
- [ ] 模型能力档案
- [ ] Prompt 历史智能化（失败标红 + 改写建议）
- [ ] 上游可靠性（多路由 / 重试 / 进度）
