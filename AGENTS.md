# AGENTS.md — witlu.com（中国历代疆域）v2

在本仓库工作时必须遵守以下规则。完整方案见 `docs/PLAN.md`，逐阶段任务见 `docs/CODEX_PROMPTS.md`，视觉参考见 `docs/design/`。

## 项目一句话
基于上游开源项目 `upstream/`（DeanChensj/jiangshan-map，GPL-3.0）的全部数据，用 Three.js 自建 3D 引擎，重制一个深色少色、高对比、Liquid Glass 风格、海水流动、云层飘过、有天象情绪、疆域连续生长、支持多政权并行编年的中国历代疆域地图。部署在 https://witlu.com ，供个人和朋友非商业观赏。

## 硬性规则
1. **许可与致谢**：仓库使用 GPL-3.0。`NOTICE.md`、页脚和「关于」必须保留对上游和 CHGIS 的致谢与引用。
2. **全部图层上线**（包括郡州府 CHGIS 层和现代省界）。CHGIS 衍生数据不要提交进本仓库，构建时从 `upstream/` 读取。
3. **元素只能多不能少**：PLAN 第 4.1 节的 F01–F39 必须全部实现。`pnpm verify:parity` 中任一计数少于上游即失败，**禁止通过修改阈值让它通过**。
4. 不得修改 `upstream/` 中的任何文件；不得手工改动历史边界数据。
5. **只有 3D 视角**，不实现 2D 切换（可以有指北针 / 复位按钮）。
6. **v3 配色（深色、少色、高对比）**：只能使用 PLAN 1.2 色板，定义在 `packages/web/src/styles/tokens.css` 中，lint 要检查硬编码颜色。底图只有夜蓝和黛青两种色调；全画面的饱和色只有政权疆域（主朝代用金色，并立政权用珊瑚、翡翠、天蓝）和金色、朱砂两种强调色；文字用白色。禁止纯黑和中性灰（R=G=B），所有深色都要带蓝色倾向。所有视觉元素都要遵守 PLAN 1.3「注意力分层」：背景不能抢版图和文字的注意力。
7. **深链兼容**：上游所有 URL 参数原样支持。
8. 保留免责声明「历史疆域为示意性近似，非测绘边界」。近现代惨案只用「肃穆」天象，不做戏剧化演出。

## 可移植分层（为将来的小程序 / App 做准备，必须遵守）
- `packages/core`：纯 TypeScript。**禁止**出现 `window`、`document`、DOM 类型、WebGL、Three.js。
- `packages/engine`：Three.js 引擎。**只能**通过 `PlatformAdapter`（画布、rAF、图片解码、Worker、存储、音频、时间）访问外部环境，禁止直接使用 `document` / `window`。文字类界面（地名、卡片）不在引擎内绘制，引擎只输出屏幕坐标和可见性。
- `packages/web`：React 网站，可以使用任何浏览器 API。
- 所有数据都是静态 JSON 和瓦片，不引入后端。

## 技术约定
- pnpm workspace + TypeScript strict + Three.js + React + Zustand + Motion + Tailwind v4。
- 引擎每帧更新不允许触发 React 重渲染；引擎与 UI 之间通过事件总线或 store 订阅交互，并做节流。
- 每个视觉特效都要提供：独立开关、画质档位参数（极致 / 高 / 省电）、`prefers-reduced-motion` 降级。
- 时间统一用 `packages/core/time` 换算（没有公元 0 年）。
- 不使用需要 token 或在中国大陆访问不稳定的服务（Mapbox、Google Fonts 等），所有资源自托管。
- 新的着色器和特效先在 `packages/web/src/lab/` 下做独立演示页（路由 `/lab/<name>`），验证通过后再接入主程序。

## 完成定义
1. `pnpm verify` 全部通过（typecheck、lint、vitest、verify:parity、playwright 冒烟）。
2. Playwright 截图（1440×900、iPhone 14、Pixel 7）保存到 `docs/progress/screenshots/Pxx/`；动效类任务还要附录屏（Playwright video）。
3. 在 `docs/progress/Pxx.md` 写明：完成项、未完成项、与 PLAN 的偏差及原因、帧率与性能数据、已知问题。
4. 提交语义清晰的 commit。

## 常用命令
```bash
pnpm install
pnpm data        # 导入上游数据并生成全部派生数据
pnpm tiles       # 下载高程瓦片 + 烘焙彩色浮雕底图（耗时较长，支持断点续传）
pnpm dev
pnpm verify
pnpm build
```
