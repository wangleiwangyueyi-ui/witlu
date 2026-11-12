# P2 地形构建与运行

包围盒为 60°E–150°E、0°N–60°N；坐标使用 Web Mercator，Three.js 世界单位是 km。地图中心和相机目标均受此范围限制，包围盒外不绘制地形，边缘渐隐至夜蓝。

```sh
pnpm tiles:preview  # 先下载 z0–5，输出 z5 全图与 v3 并排预览
pnpm tiles          # 下载 z0–8 并烘焙 z3–8 全量瓦片
pnpm verify:terrain
pnpm dev            # /lab/terrain 或主程序 /?debug=1
pnpm test:performance
```

`pnpm build` 包含 `pnpm tiles`，新检出不会静默遗漏地形。首次运行需访问 AWS 和 GitHub；运行时只读取本站 `/tiles/`。源 DEM 与浮雕产物均被 Git 忽略，CHGIS 数据规则不变。Cloudflare 构建细节见 [DEPLOY.md](DEPLOY.md)。

## 数据与续传

- `build-dem.mjs` 下载 Terrarium z0–8，每级在包围盒覆盖瓦片外加一格 halo，用于计算无缝坡度。共 5,242 张，256×256；先解码 RGB、无损 WebP 编码，再逐字节验证往返，负海拔与蓝通道的 1/256m 均保留。
- 文件先写 `.part` 再原子重命名。已有 WebP 完整解码成功后跳过；失败自动重下。请求超时 45s，最多 5 次指数退避，默认并发 8。
- `bake-relief.mjs` 使用固定 Natural Earth 50m land 外缘作海岸线，洞保留为水域。原始 GeoJSON SHA-256 固定并验证；现代地形不代表历史海岸或国界。
- z3–8 共 4,728 张浮雕。晕渲用真实邻瓦片的中心差分与随纬度变化的米/像素，多光向融合后叠加坡度。所有设色读取 `tokens.css`。
- 缓存 `.cache/terrain/bake/` 保存配方摘要和色彩审计；脚本、色板或配方改变会重新烘焙。完整覆盖与颜色约束由 `pnpm verify:terrain` 检查。
- DEM 参数：`--min-zoom 0 --max-zoom 8 --concurrency 8`。浮雕预览使用 `--preview`；全量发布运行不带缩小范围的 `pnpm tiles`。

## 色彩与预览门槛

先生成 `docs/progress/relief-preview.webp` 和 `relief-comparison.webp`，查看山脊与高原层次后才运行批量烘焙。本次采用先压缩海拔设色亮度、后叠加晕渲的顺序，避免高原被亮度封顶抹平。

L0 的“明暗差 ≤25%”采用显示端 sRGB 加权亮度跨度 `(maxY − minY)`，Y 归一化到 0–1。全量输出为 23.80 个百分点；同时检查线性相对亮度 ≤0.1，使白字对比度至少 7:1。每个像素都必须满足 B > G > R，禁止绿色、黄色、棕色和中性灰。雪峰使用冰蓝色板，经过 L0 明度压缩，不以原始 `#9CC0D6` 满亮度铺满高原。

默认输出 WebP quality 85。若有损压缩的振铃使像素违反色域或明暗限制，修复异常像素，并对该张瓦片使用无损编码保留修复结果；不降低验收阈值。本次 4,728 张中有 2,602 张触发保护。该策略与 PLAN 的“全部 quality 85”存在明确偏差，换来严格色彩边界。浮雕 alpha 254=海、255=陆，保持海底 RGB；着色器把它用作海陆掩码，不直接当可见透明度。

## 引擎与交互

`packages/engine` 只通过 PlatformAdapter 访问环境，浏览器实现位于 `packages/web/src/platform/`。Three.js 由页面动态导入。四叉树用投影 texel 的屏幕误差、视锥和瓦片预算选择 LOD；低层先出图，所有可见子层齐备后替换父层，裙边遮盖不同 LOD 的裂缝。请求并发 4，GPU/CPU 资源 LRU 有界，隐藏页面暂停 rAF，销毁与上下文恢复都有清理。

顶点着色器将 Terrarium 高程转换为 km，并补偿 Mercator 纬度尺度，陆地 ×1.8、海底 ×0.5。独立静态海面位于 0m，海底可透出。拾取网格使用相同采样和位移公式，只与真实表面求交，不把裙边当可点击地形。引擎不绘制文字，拾取结果通过事件传给 DOM。

拖动平移；滚轮 / ± 缩放；Shift 或右键拖动旋转、俯仰；单指平移，双指距离控制缩放、角度控制旋转、垂直移动控制倾斜。俯仰 25°–65°，桌面默认 45°，手机 40°。Home / 指北针复位，实验页可 flyTo 青藏。所有视图均为透视 3D。减少动态时关闭惯性与 flyTo 补间，保留直接手势操作。

极致 / 高 / 省电上限 z8 / z7 / z6，手机最多 z7；DPR 上限 2 / 1.5 / 1；新瓦片网格细分 64 / 32 / 16。已有缓存网格在切档时保留，避免加载闪烁，新瓦片使用新档密度。连续 2 秒帧耗时 >22ms 降档，连续 10 秒 <12ms 尝试升档，可独立关闭自动画质。位移、晕渲和海面也可独立关闭。引擎只每 500ms 发布统计，不逐帧触发 React 渲染。

本仓库锁定的 Three.js r180 从 r163 起已移除 WebGL1，因此 P2 采用 WebGL2；不支持时显示清晰提示。已通过 `WEBGL_lose_context` 实际丢失/恢复测试。P3 的动态海洋/天空、P4 的历史政权疆域仍按阶段待实现。

## 性能证据

`pnpm test:performance` 单 worker 顺序运行三个视口，自动检查平均 ≥50fps、draw call ≤250，以及相机经度和距离确实变化。Windows 显式使用 ANGLE D3D11，避免 Playwright 默认 SwiftShader 软件光栅化；其他系统保留默认后端。测试输出会记录真实 WebGL renderer，不能用 User Agent 冒充真机。

帧耗时来自 rAF，另记录引擎 CPU 耗时与 CDP Performance 指标；gzip trace 可在 Chrome DevTools **Performance → Load profile** 加载。手机结果仅为相同 PC GPU 上的 iPhone 14 / Pixel 7 视口与触控模拟，不能证明 iPhone 12 或骁龙 7 实机速度，也不等同 4G 冷启动验收。完整截图、录屏、测量范围及已知问题见 [P2.md](progress/P2.md)。
