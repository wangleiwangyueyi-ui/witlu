# Codex 逐阶段提示词 v2

用法：每次只把**一个阶段**的代码块完整粘贴给 Codex。上一阶段验收通过后，再进入下一阶段。所有阶段都以 `AGENTS.md` 和 `docs/PLAN.md` 为准。

---

## P0 · 工程与数据
```
阅读 AGENTS.md 和 docs/PLAN.md（第 0、3、4、6.3 节）。

1. 建立 pnpm workspace：packages/core、packages/engine、packages/web（Vite + React + TS strict + Tailwind v4），目录结构按 PLAN 6.3。添加 GPL-3.0 LICENSE 和 NOTICE.md（致谢上游，列出上游 README「数据来源与授权」中的所有原始来源，包括 CHGIS 引用格式）。
2. 把 https://github.com/DeanChensj/jiangshan-map 作为 git submodule 加到 upstream/，固定 commit。
3. scripts/import-upstream.mjs：用 Node vm 加载 upstream/js 下的 map_data、lore_core、lore_detail、i18n_dict、zh_hant、event_pinyin、china_geo_data、atlas_snapshots（解码参考 upstream/scripts/export_geojson.js，并带上 --with-prefectures 的逻辑，导出全部图层），输出规范化 JSON 到 packages/web/public/data/（dynasties、phases、milestones、settlements、corridors、rivers、eras、passes、gazetteer、persons、journeys、city-lore 分片、polity-summaries、landmark-events、i18n、pinyin、guqin、sources）。
4. scripts/build-geometry.mjs：每个快照输出简化矢量（mapshaper 保持拓扑）；全局政权注册表 polities.json（同名不同时代用 POLITY_PROFILES 的 key 区分；记录每个快照中的都城坐标）。
5. scripts/build-colors.mjs：按 PLAN 1.2「配色规则」生成 polity-colors.json——role=main 一律用金色 #F2C46D；rival 用四色着色算法从珊瑚 #FF8A7A、翡翠 #5FD3B5、天蓝 #7DB8FF（不够时加淡紫 #B79CFF）中分配，保证相邻政权颜色不同，并尽量在相邻快照间保持同一颜色；protectorate 用所属王朝的颜色加斜线纹理；neighbor 不填色。同屏饱和色超过 5 种的快照，次要政权改为只描边。输出报告 docs/progress/colors.md。
6. scripts/build-events.mjs：为每条事件计算 regime、lane、importance；生成 coexistence.json（政权存续区间 + 各阶段面积，供「历史长河」使用）。
7. scripts/build-moods.mjs：按 PLAN 2.3 的情绪类别，用关键词规则给每条事件标注 mood（sorrow / solemn / war / fire / glory / voyage / poetic / disaster / none），输出 moods.json 和 docs/progress/moods-review.md（按情绪分组列出全部事件，供我人工审校）。近现代惨案一律标为 solemn。
8. packages/core/time：年份与连续索引的换算（没有公元 0 年），年份 → {快照A, 快照B, t} 的映射（PLAN 6.5 时间驱动规则），附完整单元测试。
9. scripts/verify-parity.mjs：对比上游与新站的各项计数（快照、时期、阶段、大事、城池、走廊、人物、行迹、雄关、名胜、名城题记、政权小传、年号、专题页、郡州府要素数），任一项少于上游即失败；结果写入 docs/progress/parity.md。
10. package.json 脚本：data、dev、build、verify。

验收：pnpm data 和 pnpm verify 通过；P0.md 中附计数对比表。
```

## P1 · 设计系统、Liquid Glass 与 3D 玻璃图标
```
阅读 PLAN 第 1（v3 配色）、5 节以及 docs/design/ 中的 v3 效果图。

1. tokens.css：严格按 PLAN 1.2 色板定义全部颜色（深色系一律带蓝色倾向，禁止纯黑、纯灰）；文字白色三级透明度；深蓝投影；圆角；动效时长与曲线。加 stylelint / eslint 规则，禁止硬编码颜色和中性灰。白色文字对比度 ≥ 7:1。
2. 深色 Liquid Glass 组件（CSS 见 PLAN 1.6）：GlassPanel、GlassButton（液态按压 C1）、GlassChip、SegmentedControl、Sheet（手机三档抽屉，带速度判定和弹簧）、Toast、Popover。镜面高光跟随指针（C2）；在 Chromium 上用 SVG feDisplacementMap 做折射增强，其他浏览器自动降级。
3. 3D 玻璃图标集（分层 SVG：有色半透明底 → 符号 → 顶部高光 → 底部彩色反光 → 彩色投影）：搜索、图层、音乐、语言、分享、播放、暂停、上一个、下一个、复位 / 指北针、更多、关闭。另外做 Logo：玻璃印章「江山」（SVG + PWA 用的 PNG）。
4. 布局外壳：桌面、平板、手机三套（PLAN 5.1、5.2），地图区域暂时用 docs/design/v3_desktop.jpg 作为占位背景。手机端用 100dvh、适配安全区、overscroll-behavior:none。
5. i18n 框架（zh-Hans / zh-Hant / en）。宋体子集化脚本 scripts/build-fonts.mjs。
6. 验收控制台（URL 加 ?debug=1 时显示）：玻璃浮窗，显示实时帧率、画质档位、当前年份和快照；提供「特效开关」「触发天象」「触发疆域过渡」「触发章节开篇」几个分组（先留空，后续阶段逐步填充）；支持一键截图。
7. 部署预览：添加 public/_headers，写 docs/DEPLOY.md 中「Cloudflare Pages 连接 GitHub」的操作步骤（具体到每个页面点哪里），让每次推送都生成预览链接。

验收：三种视口截图；玻璃按钮按压录屏；lint 能拦截纯灰色；?debug=1 能看到控制台。
```

## P2 · 3D 引擎基础与彩色浮雕地形
```
阅读 PLAN 第 1.2、1.3、6.1–6.4、6.9、8 节，以及 docs/design/v3_desktop.jpg（配色标准）和 docs/design/reference_relief.jpg（只参考地形浮雕的立体质感，不参考配色）。

1. scripts/build-dem.mjs：下载 AWS Terrain Tiles terrarium（https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png，公有领域，含海底地形）东亚包围盒 z0–8，转为无损 WebP，支持断点续传。
2. scripts/bake-relief.mjs：用 sharp 烘焙**单色调**浮雕底图瓦片 z3–8：海拔只影响明暗（低地 #1A2E3B → 高原 #26404F → 雪峰 #9CC0D6），多方向晕渲（受光面 #3D5E72，阴影 #0F1E28）+ 坡度明暗，色相始终是黛青色，不能出现绿、黄、棕；海岸线来自 Natural Earth。底图明暗差控制在 25% 以内（PLAN 1.3 的 L0 层）。先输出 z5 全图预览 docs/progress/relief-preview.webp，和 v3 效果图并排对比后再批量生成。
3. packages/engine：PlatformAdapter 接口及 web 实现；Renderer；四叉树地形瓦片 LOD（屏幕误差选择）；顶点着色器做高程位移（陆地 ×1.8，海底 ×0.5）；底图贴图采样。
4. 地图相机：平移、缩放、旋转、俯仰（25°–65°，默认 45°，手机 40°），惯性，flyTo，限制在包围盒内；触控手势（单指平移，双指缩放、旋转、倾斜）。只有 3D，没有 2D 切换。
5. 拾取：射线与地形求交 → 经纬度。
6. 画质档位框架（极致 / 高 / 省电）+ 帧耗时自动调节（PLAN 8）；WebGL 上下文丢失后自动恢复。
7. /lab/terrain 演示页 + 接入主程序。

验收：截图与 v3 效果图风格一致（底图安静、只有黛青和蓝两种色调、山脊立体、青藏高原呈冰蓝色）；拖动、缩放帧率 ≥ 50fps（P2.md 中附 Performance 截图）。
```

## P3 · 海洋、天空与云
```
阅读 PLAN 第 2.1、6.6、6.7 节。

1. 水面（A1）：海面网格位于高度 0；着色器包括深度颜色（近岸 #1C4F80 → 大陆架 #12345C → 深海 #0B1F3A）、双层滚动法线贴图、柔和冷色月光反光（≤ 25%）、菲涅尔。东海、南海、印度洋、太平洋都要覆盖。海水要一直缓慢流动，但属于 L0 背景层，不能抢眼。
2. 构建期烘焙离岸距离场（scripts/bake-coast-distance.mjs）→ 海岸淡蓝色光浪（A3，不用白色）。
3. 洋流（A2）：黑潮、南海环流用慢速流线粒子表示。
4. 天空球（晴天渐变）、远景雾；光照循环（A5）。
5. 云（A4）：实例化柔边云片按风向漂移，每 30–60 秒飘来一两团，透明度 ≤ 35%、略带蓝色；云覆盖纹理投影到地形上形成很淡的移动云影；镜头拉近时云渐隐。
6. 以上全部接入画质档位和验收控制台开关。/lab/ocean、/lab/clouds 演示页。

验收：30 秒录屏（桌面 + 手机模拟），海面持续流动、光浪拍岸、云飘过并留下影子；眯眼看截图时，最先看到的仍应是版图和文字，而不是海和云；帧率数据写入 P3.md。
```

## P4 · 疆域纹理与生长引擎
```
完整阅读 PLAN 第 1.3、2.2（B1–B3、B15）、6.5 节。

1. 政权纹理：切换快照时，用 GPU 在 Web Mercator 空间把矢量多边形光栅化到 4096²（手机 2048²）渲染目标，像素存政权 ID；地形着色器采样后做「颜色混合」（亮度取自地形晕渲，色相取自政权色，填充透明度 40%，暴露为参数）；没有中国政权覆盖的陆地亮度再降低 15%。边界为同色亮线 1.5px + 柔光 8px（PLAN 1.4）。
2. packages/core/edt：Felzenszwalb 有符号距离变换 + 单元测试（误差 < 1px）。
3. 生长 Worker：找出变化像素 → 涉及的政权集合 → A、B 两侧距离场（新出现的政权从都城生长，消失的政权收缩回都城）→ Float16 打包 → Transferable 回传；LRU 缓存 + 预计算。
4. 生长着色器：argmin(mix(sA, sB, t)) 决定归属 + 金色前沿（B1）；沿前沿发射灰飞烟灭粒子（B3）；新王朝建立时叠加水墨晕染（B2）。
5. 边界线：屏幕空间粗线，顶点高度贴合地形，白色主线 + 同色柔光；生长期间淡出。残影（B15）。
6. 时间驱动接口：setProgress(t)（拖动）和 play(A, B, duration)（播放 / 跳转）；拖得太快时退化为交叉淡化。
7. /lab/morph：选择快照 A、B，滑块控制 t，播放按钮。

验收：对以下过渡分别录屏，检查无闪烁、无缝隙、正放倒放一致：战国前 316 灭巴蜀；秦灭六国（前 230–前 221）；秦 → 楚汉；东汉 → 三国；西晋 → 东晋十六国；南北朝 → 隋；唐 648 安西四镇；北宋 → 南宋；明 → 清；1945 → 1946。在 P4.md 中记录准备耗时和帧率。
```

## P5 · 时间引擎与「历史长河」
```
阅读 PLAN 第 2.5、4（F01–F06、F29）、6.5（时间驱动）节。

1. store/time：连续年份、播放（0.5 / 1 / 2 / 4 倍速，跨朝代时自动放慢）、上一个 / 下一个、Shift ±10 年；键盘操作；年份输入（支持「前221」「-221」「贞观三年」「元狩二年」）。
2. 「历史长河」组件（Canvas 2D 或 WebGL 均可）：统一时期是一条宽河，分裂时期按政权分成多条支流（颜色 = 政权色，宽度 ∝ 疆域面积），统一时汇合；河面有流动光点；事件光点标在支流上；播放头是朱砂玻璃印章 + 年份大字（数字滚动）。
3. 交互：拖动时有惯性，速度慢时吸附到附近事件；拖动时水流加速（C5）；双指或两端手柄缩放、双击复原（F02）；安卓在朝代边界轻微震动（C6）。
4. 君主 + 年号（主纪年 + 并立政权）、面包屑。
5. 接到引擎：拖动时调用 setProgress，播放 / 跳转时调用 play；跨度超过 300 年时走「穿越云层」（B12：镜头拔高穿过云层，再俯冲回来）。

验收：拖动录屏；三国、南北朝、五代十国、宋辽金夏的分流与汇合正确；手机上热区 ≥ 44px。
```

## P6 · 章节、并行编年与书法开篇
```
阅读 PLAN 第 2.2（B10、B14）、4.3、5 节。

1. 章节面板（Liquid Glass）：书法落笔的朝代名（B10，用 Make Me a Hanzi 笔画数据，只打包用到的字）→ 印章落下 → 起止年、都城、君主年号、概述、阶段 overview、大事列表、免责声明。
2. 此刻天下、并行事件轨道（桌面 ≤ 4 列 / 手机分段控件 + 横滑卡片）；同年事件同时高亮，地图上同步出现光圈和光丝（B14），镜头框住全部同期事件。
3. 图例（F11）、政权档案与君主世系（F12）。
4. 章节导览模式（N5）：按 18 章 → 阶段 → 事件自动讲述，配镜头编排，可暂停、跳章。

验收：三国 230、南北朝 500、五代 950、宋辽金夏 1140 截图，各自 ≥ 3 条轨道；西汉 −100 年只有 1 条。
```

## P7 · 天象系统与音效
```
阅读 PLAN 第 2.3、2.6、6.7 节。

1. 粒子系统：雨（含海面雨点涟漪）、雪、花瓣、光尘、火星、烟尘；数量按画质档位。
2. 闪电（程序化分叉 + 全局补光 + 云内闪光）、丁达尔光束、江面火光（赤壁）、洪水漫延、镜头轻震。
3. 天空预设：晴、悲恸（深靛蓝，不用灰）、肃穆、盛世金光等；WeatherDirector 根据 moods.json 切换预设，处理过渡、持续时间、频率限制（10 秒内最多一次），4 倍速时只变天色。
4. 音效：雨、雷（闪电后延迟 0.6–1.2 秒）、风、海浪（靠近海岸时），与古琴混音；默认静音，用户点击后开启；兼容微信。音效素材只用 CC0 或公有领域资源，并在 NOTICE.md 中登记来源。
5. 按 PLAN 2.6 的两个编排示例（秦灭六国、靖康之变）实现并录屏。

验收：两个示例录屏 + 崖山海战、赤壁之战、贞观之治、雪拥蓝关四个录屏；省电档录屏确认已降级。
```

## P8 · 玻璃标记、走廊与地点
```
阅读 PLAN 第 1.4（地图标记表）、2.2（B4–B9、B11）、6.8 节和 F08–F17。

1. 3D 玻璃标记：都城印章方块、汉阙城楼、交叉双戟、卷轴、玻璃珠、灯笼（glTF + Draco，总计 ≤ 300KB，实例化）；高画质档用 MeshPhysicalMaterial，其余档位用仿玻璃着色器；出现时弹簧放大 + 光圈。
2. 走廊：长城拔地而起（B5）、运河注水（B6）、丝路驼队（B7）、郑和宝船（B8）、黄河改道（B9）、迁都光带（B4）、诗句浮现（B11）。
3. 地名：引擎输出屏幕坐标与碰撞结果，网站用 DOM 绘制（系统中文字体，玻璃小标签）。
4. 点地溯源卡（F16）、名关（F17）、郡州府悬停与今属省份（F14）、古今透视镜（F15）、河湖古泽与古海岸线（F08）、地图气泡（F27）、双击开卡（F28）。

验收：上游 README「玩法二」的全部示例链接都能复现；各走廊动画录屏。
```

## P9 · 搜索、人物、小试、音乐、解说
```
实现 F05、F18–F23（要求同上游 README「玩法三」「玩法四」及快捷键表）：万能搜索（拼音、年号解析、快捷词、轮换示例）；点人溯事（玻璃灯笼站点 + 流星弧线 B13 + 诗句浮现）；多人同途；点事溯局（安史之乱、靖康，分阵营配色）；舆图寻址小试（10 题、落针确认、同心圆评分、官阶封号）；古琴 5 首；语音解说（并行事件按轨道依次播报）。
验收：上游 README 中所有示例链接都能复现。
```

## P10 · 深链、嵌入、AI、SEO、PWA、海报、开场
```
实现 F30–F36、N7、N8、N10：上游全部深链参数 + e2e 测试逐条验证；嵌入模式；atlasAPI 与 WebMCP；llms.txt、MCP、Skill 中的域名改为 witlu.com；35 个专题页按新风格预渲染 + sitemap + OG；PWA（玻璃印章图标）；分享海报（画面 + 二维码 + 免责声明，微信中长按保存）；开场地球（从太空穿过云层降落到中国，书法写出「两千四百年 · 一图观之」，只在首次访问出现，可跳过）。
验收：深链 e2e 全部通过；Lighthouse SEO ≥ 95。
```

## P11 · 手机与微信加固、性能、上线
```
逐条落实 PLAN 第 7、8、9、10 节：
- 达到性能预算（附帧率测试脚本与报告）；画质自动调节在中端安卓上验证；
- 微信专项清单全部处理；?debug=1 时加载 vConsole；完全不支持 WebGL 时用静态图兜底；
- 无障碍（键盘可达、aria 标签）；
- public/_headers 缓存策略；docs/DEPLOY.md 写清 Cloudflare Pages 与 Squarespace 域名两种配置方案的逐步操作；
- 上线后用脚本检查 witlu.com 和 www 的状态码、HTTPS、缓存头。
输出真机测试清单模板，由我在 iOS 和安卓微信里逐项勾选。
```
