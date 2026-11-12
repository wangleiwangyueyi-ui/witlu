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

本阶段只构建本地数据与工程，不执行部署。后续新增 Natural Earth、Make Me a Hanzi 等资源时应补记实际取得的版本和许可。
