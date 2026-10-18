# 物序 —— 网页版交互原型

**参赛分类：移动与网络应用开发**

**视觉方向：深蓝像素风，顶部系统栏 + 横向指令标签 + 仪表盘网格，像素边框、硬阴影、扫描线**

> 技术栈：纯 HTML + CSS + Vanilla JS（无构建、无依赖），数据存浏览器 localStorage。
> 说明：当前识别结果为**本地模拟数据（演示模式）**，用于跑通“拍照 → AI 识别 → 人工确认 → 入库/提醒/汇总”的完整交互闭环；真实接入方法见文末。

## 如何运行
1. 直接用浏览器打开 `index.html`（推荐 Chrome/Edge，双击即可）；
2. 或在本目录起本地服务：`python -m http.server 8080` 后访问 `http://localhost:8080/`；
3. 手机预览：把本目录上传到任意静态托管（GitHub Pages / Vercel / 微信云托管静态网站等），手机浏览器打开即可体验“拍照”调用摄像头。

## 已实现（对照 docs/02 功能需求）
| 页面 | 功能 |
| --- | --- |
| 首页 | 拍照总入口（物品/保质期/记一餐）、统计卡片、临期提醒、最近入库、今日饮食进度 |
| 物品库 | 关键词搜索、分类筛选、卡片列表、手动添加、编辑/删除 |
| 保质期 | 临期四级分组（已过期/7 天/30 天/正常）、已食用/已用完/已丢弃 处理 |
| 饮食 | 拍照记餐、手动记录、餐次分组、热量/三大营养素、近 7 日柱状图、健康小建议（含免责声明） |
| 我的 | 健康档案（自动算 TDEE/目标）、提醒设置、数据导出 JSON、重置演示数据 |

## 拍照识别流程（演示）
点击任意“拍照”入口 → 选择图片来源（拍照/相册）→ 图片预览 + “AI 识别中” → 结果确认页（可编辑）→ 保存。
三个结果确认页分别对应 docs/04 的三种 JSON Schema：
- 物品：`{items:[{name, category, location, count, confidence}]}`
- 保质期：`{name, expireDate, storage, kind, count}`
- 饮食：`{dishes:[{name, portion, kcal, p, f, c}]}`

## 代码结构
```
web/
├─ index.html      页面骨架（顶栏 + 主视图 + 底部导航）
├─ css/style.css   样式（移动优先、响应式）
├─ js/mock.js      演示种子数据 + 模拟 AI 识别（替换点）
└─ js/app.js      核心逻辑：存储/路由/首页/物品库/保质期
   js/app2.js     饮食/我的/拍照流程/结果确认/初始化
```

## 如何接入真实 AI（替换模拟）
1. `js/mock.js` 中的 `MOCK.recognizeItems / recognizeExpiry / recognizeDiet` 是**唯一替换点**；
2. 改为向后端上传图片：`POST /v1/vision/*`（接口见 docs/03），返回与现有确认页 JSON 完全一致的结构即可，前端无需大改；
3. 提醒（Web Push / 邮件）与云端存储（用户体系、多端同步）为后端增量工作，见 docs/07。

## 演示数据
首次打开自动生成 10 件物品（含 1 件已过期沙拉酱、1 件 3 天后到期的酸奶等）+ 今日午餐记录，方便直接演示“临期提醒”与“饮食汇总”。
可在“我的 → 重置演示数据”一键恢复。

## 如何部署成独立网站（公网链接）
1. 本目录为纯静态站点，可部署到 GitHub Pages / Vercel / Netlify；
2. 详细步骤、国内方案与自定义域名见根目录 `docs/08_网站部署与上线指南.md`；
3. 已内置 PWA 配置（manifest.webmanifest + icon.svg），部署后可“添加到主屏幕”。

## 账号与云同步（正式产品功能）
- 代码已内置：`config.js`（Supabase 配置）、`js/cloud.js`（同步引擎）、“我的 → 账号与云同步”UI；
- 填写 `config.js` 后即启用“账号登录 + 云端备份 + 多端同步”；开通步骤与建表 SQL 见根目录 `docs/09_账号与云同步实施说明.md`；
- 未配置时不影响本地使用（自动提示“云端未配置”）。

## WebSocket 实时同步
- 登录后自动建立 WebSocket 长连接（Supabase Realtime），其他设备改动会实时推送到本机并自动刷新；
- 断线自动重连（8 秒），不可用时降级为 30 秒轮询兜底；界面在“我的 → 账号与云同步”显示连接状态；
- 需要在 Supabase 执行一次 `alter publication supabase_realtime add table public.user_data;`，详见根目录 `docs/10_WebSocket实时同步说明.md`。

## 真实 AI 识别（视觉大模型 / OCR）
- 拍照识别默认走 **Supabase Edge Function `ai-recognize`**（密钥保存在服务端，前端不暴露）；
- 未部署或调用失败时自动回退演示数据，并提示用户；
- 部署步骤、模型选型（智谱 GLM-4V / 通义 Qwen-VL / 豆包等）见根目录 `docs/11_真实AI接入说明.md`；
- 相关文件：`supabase/functions/ai-recognize/index.ts`（服务端）、`js/ai.js`（前端客户端）。

### 两种 AI 代理可选
1. **Supabase Edge Function**（默认）：`supabase/functions/ai-recognize/index.ts`，见 `docs/11`；
2. **Cloudflare Worker**（更易部署）：`cloudflare-worker/worker.js`，把地址填入 `config.js` 的 `AI_ENDPOINT` 即可，见 `docs/12`。
