# 章节与并行编年

## 数据与界面

`packages/core/time/chapters.ts` 是纯 TypeScript 模型。`activeTracks` 以当前快照中的 `main` / `rival` 为准，匹配政权完整 key 和区域纪年；不按显示列数截掉政权。`buildTour` 生成 18 章、198 阶段、526 大事，共 742 站。`sameYearSites` 合并事件地点并去重。

`WorldTracks` 桌面每页四列，手机显示全部政权标签与横向吸附卡片；`WorldLegend` 提供聚焦，`PolityDossier` 展示上游介绍及有日期的继承顺序。`PolityLabels` 直接更新 DOM 位置，投影来自引擎，每 80ms 更新一次，不触发 React 帧级重渲染。

`store/tour` 管理讲述队列。`TourDriver` 每站五秒；切换到后台、手动拖动或播放时暂停。章节和阶段按候选都城取景，事件按事件坐标取景。没有可靠坐标时保持当前镜头。

## B10 与许可

`node scripts/build-calligraphy.mjs` 从固定 Make Me a Hanzi 提交提取章节标题的简繁用字。`assets/calligraphy` 是可修改源数据和许可的版本化副本，`public/calligraphy` 为构建复制产物。正常构建利用本地子集，首次缺失时才下载固定上游。站点不请求第三方运行时字体或笔画 API。

SVG 真实字形轮廓裁剪中线描边，按笔画顺序调整 dashoffset。1.6 秒落笔（省电 1 秒），随后印章落下与概述淡入。动画关闭或减少动态时直接展示。Arphic 素材保留自己的许可，不与 GPL 代码混淆。

## B14 与取景

`Resonance` 只创建光圈与连接树，不在引擎内画文字。计时使用帧间实际时差，1.8 秒后结束；省电无连线，减少动态关闭。构造和更新只通过既有引擎与 PlatformAdapter 生命周期访问环境。

`AtlasRenderer.frameSites` 利用投影迭代求目标相机，让所有地点在 Web 层传入的安全矩形内。`camera-story.ts` 负责桌面右侧面板、下方事件轨道与手机抽屉的留白参数。

## 连续拖动

政权 ID 栅格仍为桌面 4096² / 手机 2048²。引擎保留三张纹理的 LRU；当前 A/B、正在准备与预热读回的纹理被固定占用，等待任务完成后再修剪。Worker 距离场缓存不变。

跨快照拖动 `prepare(A,B,true)` 只准备 ID 栅格和调色板，不执行 CPU 像素读回、SDF Worker、边界几何和粒子构建。地形着色器交叉采样 A/B。`timeStore.scrubbing` 和速度同时归零后，等待 250ms 才重新调用完整 prepare；期间预取相邻几何，空闲时预计算距离场。

测试 `P6 held drag…` 持续保持 scrubbing，断言 preview 与 Worker 0ms；松手后断言恢复 SDF，并执行 GPU/CPU 像素归属审计。启动测试前应结束旧开发服务器，让 Playwright 创建干净 Vite 实例；长时间热更新后的裸动态 import 可能读取另一份 store 模块，不能用该环境做性能对比。

## 验收

- `pnpm verify`：包含 P6 模型、三视口五年份、世系、导览、繁英控件、减少动态、同期地点取景和拖动审计。
- `pnpm test:chapters`：以上功能检查及三视口串行录屏、220–240 与 210–285 两个窗口的拖动帧率；窗口端点有 DOM 断言。
- 完整证据和限制见 [P6.md](progress/P6.md)。
