# witlu · 中国历代疆域

[江山](https://witlu.com/)是一张用 Three.js 和 React 构建的历史地图。默认从正北以二维视角查看历代疆域，右侧史志栏展示并存政权与本朝大事。底部时间轴把前 403 年至今的朝代总览和政权事件泳道放在一起。手机上的史志抽屉可收起、半开或全开。

![公元 230 年的 v4 桌面地图、此刻天下、本朝大事和并行泳道](docs/progress/screenshots/R7/desktop-atlas.png)

[iPhone 14 界面](docs/progress/screenshots/R7/iPhone-14-atlas.png) · [Pixel 7 界面](docs/progress/screenshots/R7/Pixel-7-atlas.png) · [二维分享海报](docs/progress/screenshots/R7/desktop-poster-export.png)

## 使用地图

- 在顶栏搜索人物、地名、拼音和年号，支持多人行迹同看。首访可跳过开场地球，也可从「初来乍到」进入导览、搜索或古地名小试。
- 点击朝代总览选年，拖动两端缩放时间范围，双击复原。点击政权泳道中的刻度可跳到史事。键盘左右键跳年，Shift 加左右键跳事件。年份框接受「前221」「元狩二年」「唐贞观三年」。
- 点击政权卡或图例色块可聚焦疆域。点击城市可打开地点卡。打开分享可下载含年份二维码的二维海报。微信可长按图片保存。
- `?terrain=1` 进入三维实验视角。`?debug=1` 打开验收控制台和 vConsole，可调节画质、测试性能和导出截图。

## 本地开发

需要 Node ≥22.19、pnpm 10.20 和 Git。

```sh
git submodule update --init --recursive
pnpm install
pnpm exec playwright install chromium
pnpm data
pnpm tiles
pnpm verify
pnpm dev
```

首次下载和烘焙瓦片耗时较长，支持断点续传。`pnpm build` 运行数据管线和类型检查，发布目录为 `packages/web/dist`。`pnpm verify` 包含 strict 类型检查、ESLint、Stylelint、Vitest、上游数据量对齐和三种视口的 Playwright 回归。发布步骤及设备检查见 [Cloudflare Pages 部署](docs/DEPLOY.md) 和 [真机微信验收](docs/DEVICE-TESTS.md)。

代码分为纯 TypeScript 的 `packages/core`、使用 PlatformAdapter 的 `packages/engine`，以及 React 前端 `packages/web`。完整数据和构建约定见 [PLAN.md](docs/PLAN.md)。`pnpm fonts` 更新自托管思源宋体子集，`pnpm assets` 重建印章图标。CHGIS 衍生数据在构建时从固定上游生成。

数据与许可见 [NOTICE.md](NOTICE.md)。代码采用 GPL-3.0。感谢 DeanChensj / jiangshan-map、CHGIS 与各原始数据来源，CHGIS / Hartwell 郡州府层和 DataV 现代省界保留原条款。历史疆域为示意性近似，非测绘边界。
