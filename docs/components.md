# P1 玻璃界面约定

`src/components/Glass.tsx` 提供 GlassPanel、GlassButton、GlassChip、SegmentedControl、Popover；Sheet 与 Toast 单独导出。所有色值来自 `styles/tokens.css`，SVG 内也只引用 CSS 变量。原生浏览器 API 只出现在 web 层。

- GlassButton 接收 `icon` / `label` / children 与按钮属性，按下缩至 0.96，松手弹簧复位；更多菜单可单独关闭液态按压，系统或用户减少动态时同样禁用形变。
- GlassPanel 和按钮在指针移动时直接更新 `--mx` / `--my`，不逐帧 setState。更多菜单可独立关闭高光和折射；画质档修改模糊半径；省电档禁用折射。
- Chromium + CSS 支持检测通过才开启 SVG feDisplacementMap backdrop-filter；Safari / Firefox 使用普通 blur 玻璃。减少动态关闭移动高光与折射；背景静止。
- SegmentedControl 使用 tablist / tab，支持左右方向键、Home / End 和焦点跟随。Popover 支持外部点击、Escape 关闭与焦点返回。
- Sheet 有收起、半开、全开三档；只有顶部把手接管拖动，内容仍可滚动。落档参考速度投影与最近档位，并使用弹簧；把手键盘上下与 Home / End 可达三档。
- Toast 使用 aria-live polite。关于面板有 modal 语义、焦点循环、Escape 关闭并返回触发点。

图标来自统一五层 SVG：深蓝投影 / 半透明本体 / 白色内部符号 / 上沿高光 / 蓝色底部反光。组件图标包括搜索、图层、音乐、语言、分享、播放、暂停、上一个、下一个、指北、更多、关闭；相机、勾选、折叠为补充符号。印章由 build-brand.mjs 原生矢量路径生成，输出独立 SVG 与 32 / 180 / 192 / 512 PNG。

字典为 `i18n/messages.ts`，三种语言使用同一 MessageKey 类型。Zustand 保留语言、画质、界面特效偏好，禁用或无法访问存储时仍能使用。P1 的地图和河流图形是视觉占位，展示的政权卡片为 230 年示例；历史时间驱动、真实图层和章节切换在后续阶段接入。

`?debug=1` 显示 FPS、画质、年份、快照。FPS 通过 rAF 采样但只以 DOM ref 每 500ms 更新，不触发每帧 React 渲染。四组触发器暂为空，后续可按组接入。截图在用户点击时动态加载 html-to-image，使用自托管图片 / 字体导出 PNG，忽略控制台和 Toast，不要求系统屏幕录制权限。
