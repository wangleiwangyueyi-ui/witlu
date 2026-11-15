# witlu.com 深链与开放接口

所有公开链接使用 `https://witlu.com/`。负数表示公元前，没有公元 0 年。边界是示意性近似，非测绘边界。

| 参数 | 行为 |
|---|---|
| `year` | 整数、逗号分隔年份、年号；例如 `-221`、`1079,1080,1094,1097`、`贞观三年` |
| `place` | 古今地名、英文、拼音；逗号、顿号、箭头分站，分号分路线；支持 `1079:湖州,黄州:1080` |
| `lng`、`lat` | 经度、纬度，直接打开该点沿革 |
| `trace` | `经度,纬度`，打开点地溯源 |
| `center`、`zoom` | 镜头中心与 1–8 倍缩放 |
| `person` | 1–4 人，姓名、英文或上游 key |
| `event`、`journey`、`stop` | 史局、行迹与零起始站点；负一从首站开始、镜头框住全部行迹 |
| `polity` | 上游政权档案 key，例如 `caowei` |
| `hover` | 州府名称，开启州府图层与提示 |
| `q` | 万能搜索并选中首条结果 |
| `lang` | `zh`、`zh-cn`、`zh-Hans`、`zh-tw`、`zh-Hant`、`en` 等旧别名 |
| `layers`、`mob_chron`、`mob_leg` | 打开图层、移动章节、图例 |
| `quiz` | 打开舆图寻址小试 |
| `embed=1` | 精简嵌入布局；点击激活地图手势，可释放滚动 |
| `from`、`to`、`lock=1`、`autoplay=1` | 时间范围、固定年份并隐藏时间控制、自动播放 |
| `terrain` | 接受旧参数；按项目要求，任何值都保留 3D 视角 |

多路线的年份数等于路线数时，年份按路线分配；否则按全局站点分配，剩余站点沿用最后一个年份。每站内嵌的年份优先。多人、路线和地点的结果保留上游名胜别名，例如“浔阳”可解析到琵琶亭。

## 浏览器 API

`window.atlasAPI` 的方法均返回 Promise，适配异步静态 JSON 加载。

```js
await atlasAPI.locate({year: 819, place: '蓝关', zoom: 2.5});
await atlasAPI.inspect({year: 1102, place: '浔阳'}); // 不改变页面
await atlasAPI.resolvePlace('Chang-an', 741);
await atlasAPI.openPerson('libai,dufu,gaoshi', 2);
await atlasAPI.search('huoqubing');
```

`inspect` 返回年份、年号、朝代、政权、一级政区、州府、今属省份、附近城池、名城题记和 witlu.com 深链。路线返回各站及各段距离，分路线重新计算起点；人物返回 `person.events`、`profiles` 和共同站点。没有录入的数据返回空值，不补造史料。

WebMCP 按能力检测注册 `jiangshan_locate`、`jiangshan_inspect`、`jiangshan_open_person`，兼容新的 `document.modelContext` 及旧的 `navigator.modelContext`。没有该实验性浏览器能力时，普通 API 仍可使用。新规范的 AbortSignal 和旧接口的 unregisterTool 都在组件卸载时清理；并未向第三方代理自动发送数据。

规范参考：[W3C WebMCP](https://webmachinelearning.github.io/webmcp/)；本仓库提供新接口模拟注册与调用的 e2e 检查，尚未在实际开启 WebMCP 的浏览器中连接外部代理。

## 本地 MCP 与 Skill

先递归克隆本仓库并运行 `pnpm install`。MCP 通过 stdio 提供 `inspect_place`、`inspect_person`、`search_atlas`，无需后端或密钥：

```json
{"mcpServers":{"witlu":{"command":"node","args":["/absolute/path/witlu/scripts/mcp-server.mjs"]}}}
```

查询直接读取固定提交的 upstream 原始数据；Node CommonJS 适配器只读这些文件，不修改子模块。

Skill 位于 `skills/jiangshan-atlas/SKILL.md`，同时发布到 `/skills/jiangshan-atlas/SKILL.md`。CLI 示例：

```sh
python skills/jiangshan-atlas/scripts/jiangshan.py --year 1102 --place 浔阳 --inspect
python skills/jiangshan-atlas/scripts/jiangshan.py --person sushi --stop 2 --inspect
```

`--out path.png` 使用仓库 Playwright 截图。默认访问 witlu.com；本地验收设置 `JIANGSHAN_PUBLIC_URL=http://127.0.0.1:4173`。离线查询仍可用；截图需要已运行的本地站点或可访问的线上站点。
