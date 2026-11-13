# 许可、致谢与原始来源

数据与原始设计源自 **江山时序 Jiangshan Atlas**（DeanChensj / Chronicles of the Realm）：
https://github.com/DeanChensj/jiangshan-map 。上游 Copyright © 2026 DeanChensj。
本项目代码采用 GPL-3.0-only，全文见 LICENSE。固定的上游提交由 Git submodule gitlink 记录，构建产物 manifest.json 同时记录完整 SHA。

以下逐项保留固定版本上游 README「Data Sources & License」的全部原始来源与许可区分；第三方条款不会因为本仓库采用 GPL 而改变。

| 内容 | 原始来源 | 上游声明的许可 / 说明 |
|---|---|---|
| 应用、脚本、CLI、MCP 代码 | DeanChensj/jiangshan-map | GPL-3.0 |
| 政权轮廓 | aourednik/historical-basemaps，https://github.com/aourednik/historical-basemaps ，之后由上游依据史籍重绘 | GPL-3.0 |
| 一级政区（刺史部 / 道 / 路 / 省） | 上游依据史籍手绘，早期版本的来源未记录 | GPL-3.0；不补造来源 |
| 郡 / 州 / 府（含战国、秦郡） | CHGIS V6；Robert M. Hartwell China Historical GIS | 原条款：仅学术、非商业使用，不得再分发；**不适用 GPL-3.0**。上游简化到 0.01° 并作历史校订 |
| 城池、大事、行迹、人物纪事、地点题记 | 上游依据史籍编纂 | GPL-3.0 |
| 现代省界 | 阿里云 DataV GeoAtlas，https://datav.aliyun.com/portal/school/atlas/area_selector | 受 DataV GeoAtlas 自身条款约束 |
| 河流、湖泊、邻国 | 上游所用公有领域数据（README 未进一步标识单项数据集） | Public domain |
| 地形晕渲 | AWS Terrain Tiles，https://registry.opendata.aws/terrain-tiles/ ；原始高程 SRTM、GMTED2010、ETOPO1 | 原始数据为公有领域；上游 build_terrain_tiles.py 渲染图像为 GPL-3.0，发布图像不细于约 1 km / px |
| 古琴音频 | Wikimedia Commons：《流水》Liu Shui、《平沙落雁》Pingsha Luoyan、《阳关三叠》Yangguan Sandie、《醉渔唱晚》Zuiyu Changwan、《酒狂》Jiu Kuang | Public domain；原始音频 URL 随 guqin.json 保存，播放使用自托管 MP3 |

CHGIS 必须按以下格式引用（页脚和「关于」同时保留）：

> CHGIS, Version: 6. © Fairbank Center for Chinese Studies of Harvard University and the Center for Historical Geographical Studies at Fudan University, 2016.

CHGIS / Hartwell 衍生几何只由构建时读取 upstream/ 生成，不提交进本仓库。源数据应从 CHGIS 官方 Harvard Dataverse 分发渠道依原条款获取。来源细节见 upstream/data/atlas/README.md；生成的含郡州府文件携带独立许可提示。

学术校核参考：谭其骧主编《中国历史地图集》（The Historical Atlas of China）。它是上游核对史实的参考书，**不是**本仓库的图像或数据来源；未收录其图像或数据。

历史疆域为示意性近似，非测绘边界。main 标注沿用上游按《资治通鉴》纪年惯例确定的主政权，不代表正统评价。

字体：Adobe [Source Han Serif](https://github.com/adobe-fonts/source-han-serif) SC SemiBold（思源宋体），SIL Open Font License 1.1。网站使用重命名为 Witlu Song 的 WOFF2 标题子集，原始版权与许可证保留在 `packages/web/public/fonts/OFL-SourceHanSerif.txt`，源文件 URL 与 SHA-256 记录在同目录 manifest.json，生成步骤见 docs/FONTS.md。印章与界面图标为本项目自建 SVG；地图占位仅取自本仓库 docs/design/v3_desktop.jpg，不作为历史边界依据。

P2 地形由本仓库独立烘焙，不复用上游的地形渲染图。Terrarium 高程读取自 [AWS Terrain Tiles](https://registry.opendata.aws/terrain-tiles/)（访问于 2026-11-12），Mapzen / Tilezen 提供数据编排；东亚主要高程来源为 USGS SRTM、GMTED2010 和 NOAA ETOPO1。SRTM / GMTED2010 terrain data courtesy of the U.S. Geological Survey. ETOPO1 formal credit: DOC/NOAA/NESDIS/NCEI > National Centers for Environmental Information, NESDIS, NOAA, U.S. Department of Commerce. 美国政府原始数据不因本项目 GPL 许可而新增版权；本项目对其进行无损格式转换、设色与晕渲。低 zoom 瓦片覆盖到东亚之外，完整全球提供者声明保留于 [Tilezen attribution](https://github.com/tilezen/joerd/blob/master/docs/attribution.md)，不能把该集合所有地区一概称为无条件公有领域。

海陆掩码：Made with Natural Earth，采用 `ne_50m_land.geojson`，其多边形外缘即海岸线；固定 [natural-earth-vector commit ca96624](https://github.com/nvkelso/natural-earth-vector/tree/ca96624a56bd078437bca8184e78163e5039ad19)，SHA-256 `e874b27a51d146452be360cafb3cc50c86001074a67d534113e6534682f9826b`。[Natural Earth 条款](https://www.naturalearthdata.com/about/terms-of-use/)声明数据为公有领域。地形及海岸线均是现代自然地理背景，不作为历史政权边界证据。

本阶段提供本地界面和 Cloudflare Pages 连接说明，不修改域名或 DNS。

Terrain Tiles 全球提供者的原始完整声明已于 2026-11-12 归档到 [docs/sources/terrain-attribution.md](docs/sources/terrain-attribution.md)，包括低 zoom 瓦片所覆盖的其他地区来源；对应原始地址为上方 Tilezen attribution 链接。

## 章节书法笔画（P6）

Make Me a Hanzi（https://github.com/skishore/makemeahanzi），固定提交 `bddc96d41bef78427ed0e034e9f7e31d71fd1b92`。仅从 `graphics.txt` 提取 18 章简繁标题使用的 33 个字，未改变笔画与中线坐标。提取脚本：`scripts/build-calligraphy.mjs`；修改：2026-11-13，witlu contributors，删除未用字符、重新打包为 JSON。

图形数据衍生于文鼎 Arphic 字体，采用 Arphic Public License；这一独立素材保留原许可，不改为 GPL。完整许可、上游 COPYING 与可修改的笔画源文件一并位于 `assets/calligraphy/`，发布时复制到 `/calligraphy/`。字典数据未使用。原始图形文件 SHA-256 记录在子集元数据中。

# P7 程序合成环境音

`scripts/build-weather-audio.mjs` 原创生成雨、风、海浪、雷声四个 WAV，不包含第三方录音或采样。生成的 WAV 资源及其来源清单位于构建目录 `packages/web/public/assets/audio/weather/`，以 [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) 提供；在法律允许的范围内放弃这些音频资源的著作权及相关权利。生成脚本仍适用本仓库 GPL-3.0 许可。`sources.json` 记录生成来源、时长、采样率和 SHA-256；`LICENSE.txt` 随资源分发。古琴保留原有上游来源与授权说明。
