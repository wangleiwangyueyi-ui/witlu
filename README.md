# witlu · 中国历代疆域

Three.js + React 的静态历史地图重制。已接入完整数据基座、深色 Liquid Glass 界面、真实 3D 地形、海洋与云层、可逆疆域生长，以及 P5 连续时间与历史长河。其他内容交互按 docs/PLAN.md 的后续阶段接入。

需要 Node >=22.12、pnpm 10.20、Git。首次使用：

```sh
git submodule update --init --recursive
pnpm install
pnpm exec playwright install chromium
pnpm data
pnpm tiles # 首次下载与烘焙较久，支持断点续传
pnpm verify
pnpm dev
```

开发页 `?debug=1` 可打开验收控制台，支持画质切换和一键导出截图。更多菜单包含高光、折射与减少动态开关。手机章节抽屉支持三档拖动与键盘操作。`pnpm fonts` 更新自托管思源宋体标题子集（见 [FONTS.md](docs/FONTS.md)）；`pnpm assets` 重建印章 SVG / PNG。Cloudflare Pages 首次连接和自动分支预览步骤见 [DEPLOY.md](docs/DEPLOY.md)。

`pnpm build` 会先运行完整数据管线与类型检查，再生成 `packages/web/dist`。`pnpm verify` 包含 strict 类型检查、ESLint、层边界与颜色规则、Vitest、parity 和三个 Chromium 模拟视口的 Playwright 冒烟。移动端模拟不等于真机 Safari / 微信测试。

代码分为 `packages/core`（零平台依赖）、`packages/engine`（Three.js / PlatformAdapter）、`packages/web`（React 和浏览器 API）。引擎目录遵循 PLAN 6.3；逐帧绘制与 React 界面更新分离，支持分级画质和 WebGL 上下文恢复。

历史长河支持拖动惯性、双指缩放、上/下一年、Shift 十年和空格播放。年份框接受 `前221`、`-221`、`元狩二年`；`贞观三年`会列出唐/西夏选择，带前缀 `唐贞观三年`可直接跳转。实现说明见 [TIME.md](docs/TIME.md)，验收与已知限制见 [P5.md](docs/progress/P5.md)。独立实验页 `/lab/timeline`、`/lab/time-flight`；`pnpm test:timeline` 顺序生成三视口录屏与性能数据。

构建顺序：`import-upstream` → `build-geometry` → `build-territories` → `build-colors` → `build-events` → `build-moods` → `verify-parity`。所有派生 JSON、几何和音频由固定上游重新构建，不提交 CHGIS 衍生数据。

来源与许可见 [NOTICE.md](NOTICE.md)。代码采用 GPL-3.0；CHGIS / Hartwell 郡州府层、DataV 现代省界保留原条款。历史疆域为示意性近似，非测绘边界。
