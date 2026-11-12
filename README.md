# witlu · 中国历代疆域

Three.js + React 的静态历史地图重制。当前阶段 P0：工程、全量史料管线与时间模型。视觉与完整交互按 docs/PLAN.md 后续阶段实现。

需要 Node >=22.12、pnpm 10.20、Git。首次使用：

```sh
git submodule update --init --recursive
pnpm install
pnpm exec playwright install chromium
pnpm data
pnpm verify
pnpm dev
```

`pnpm build` 会先运行完整数据管线与类型检查，再生成 `packages/web/dist`。`pnpm verify` 包含 strict 类型检查、ESLint、层边界与颜色规则、Vitest、parity 和三个 Chromium 模拟视口的 Playwright 冒烟。移动端模拟不等于真机 Safari / 微信测试。

代码分为 `packages/core`（零平台依赖）、`packages/engine`（Three.js / PlatformAdapter）、`packages/web`（React 和浏览器 API）。引擎目录遵循 PLAN 6.3；本阶段仅声明适配器与输出类型，不启用渲染循环。

构建顺序：`import-upstream` → `build-geometry` → `build-colors` → `build-events` → `build-moods` → `verify-parity`。所有派生 JSON、几何和音频由固定上游重新构建，不提交 CHGIS 衍生数据。

来源与许可见 [NOTICE.md](NOTICE.md)。代码采用 GPL-3.0；CHGIS / Hartwell 郡州府层、DataV 现代省界保留原条款。历史疆域为示意性近似，非测绘边界。
