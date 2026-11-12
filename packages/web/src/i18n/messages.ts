export const hans = {
  waterMotion: '海水流动', moonlight: '冷色反光', coastWaves: '海岸光浪', currents: '洋流粒子', sky: '渐变天空', fog: '远景雾', lightCycle: '光照循环', clouds: '漂移云片', cloudShadows: '移动云影',
  app: '中国历代疆域', brand: '江山', chapter: '第五章 · 三国', chapterName: '三国', chapterRange: '220 — 280',
  intro: '一江山河，三分天下。', description: '汉室倾颓，群雄逐鹿。魏、蜀汉、吴相继立国，山川之间，新的秩序正在形成。',
  world: '此刻天下', chronicle: '并行纪事', overview: '章节概述', capital: '都城', ruler: '君主', area: '疆域',
  wei: '魏', shu: '蜀汉', wu: '吴', caorui: '曹叡', liushan: '刘禅', sunquan: '孙权', luoyang: '洛阳', chengdu: '成都', jianye: '建业',
  weiEra: '太和四年', shuEra: '建兴八年', wuEra: '黄龙二年',
  weiEvent: '曹真伐蜀，因连日大雨退军。', shuEvent: '诸葛亮北伐，魏蜀相持于秦岭之间。', wuEvent: '孙权遣卫温、诸葛直航海至夷洲。',
  main: '主纪年', rival: '并立政权', riverTitle: '历史长河', year: '年份', ce: '公元', bce: '公元前',
  search: '搜索', searchPlaceholder: '搜索此刻天下', noResults: '未找到匹配的政权',
  layers: '图层', territories: '政权疆域', divisions: '一级政区', prefectures: '郡州府', modern: '现代省界', rivers: '河湖古泽', places: '城池与地名',
  music: '古琴', playMusic: '播放古琴', pauseMusic: '暂停古琴', musicLoading: '正在载入古琴', musicError: '古琴暂未能播放，请重试',
  language: '语言', share: '分享', shareCopied: '链接已复制', shareFailed: '暂时无法复制，请复制地址栏链接',
  play: '播放', pause: '暂停', previous: '上一年', next: '下一年', reset: '复位 / 指北', resetDone: '已复位三维视角', more: '更多', close: '关闭',
  quality: '画质', ultra: '极致', high: '高', eco: '省电', highlight: '镜面高光', refraction: '玻璃折射', pressMotion: '液态按压', motion: '减少动态',
  about: '关于与致谢', aboutTitle: '山河有据，来处可寻。', credit: '数据与原始设计源自', upstream: '江山时序 Jiangshan Atlas', license: '代码与上游自创数据采用 GPL-3.0；郡州府与现代省界遵循其原始许可。', legitimacy: 'main 沿用上游《资治通鉴》纪年惯例，不代表正统评价。',
  disclaimer: '历史疆域为示意性近似，非测绘边界', reference: '三维地形', referenceHint: '地形已可自由浏览。历史疆域与资料图层将在后续阶段接入。',
  debug: '验收控制台', fps: '实时帧率', snapshot: '当前快照', effects: '特效开关', moods: '触发天象', transitions: '触发疆域过渡', openings: '触发章节开篇', empty: '暂无已接入项目', screenshot: '一键截图', screenshotDone: '截图已保存', screenshotError: '截图未能保存，请重试',
  expand: '展开章节', collapse: '收起章节', sheet: '章节抽屉', sheetPositions: '收起 / 半开 / 全开',
  dataReady: '全量史料已载入', loading: '正在读取史料', dataError: '史料暂未能载入，请刷新重试', prefsSaved: '已更新显示偏好',
  chapterGuide: '章节导览', musicCredit: '流水 · 古琴', uiSettings: '界面设置', north: '北', selected: '已选中',
  caption: '循历史长河，观天下分合。', timescale: '三国纪年', inspect: '检视数据', glossary: '35 个专题 · 18 个时期',
} as const;
export type MessageKey = keyof typeof hans;
export const hant: Record<MessageKey, string> = {
  ...hans, waterMotion: '海水流動', moonlight: '冷色反光', coastWaves: '海岸光浪', currents: '洋流粒子', sky: '漸變天空', fog: '遠景霧', lightCycle: '光照循環', clouds: '漂移雲片', cloudShadows: '移動雲影', app: '中國歷代疆域', chapter: '第五章 · 三國', chapterName: '三國', intro: '一江山河，三分天下。', description: '漢室傾頹，群雄逐鹿。魏、蜀漢、吳相繼立國，山川之間，新的秩序正在形成。',
  world: '此刻天下', chronicle: '並行紀事', overview: '章節概述', capital: '都城', ruler: '君主', area: '疆域', shu: '蜀漢', wu: '吳', caorui: '曹叡', liushan: '劉禪', sunquan: '孫權', luoyang: '洛陽', jianye: '建業', shuEra: '建興八年', wuEra: '黃龍二年',
  weiEvent: '曹真伐蜀，因連日大雨退軍。', shuEvent: '諸葛亮北伐，魏蜀相持於秦嶺之間。', wuEvent: '孫權遣衛溫、諸葛直航海至夷洲。', main: '主紀年', rival: '並立政權', riverTitle: '歷史長河', year: '年份', bce: '公元前',
  search: '搜尋', searchPlaceholder: '搜尋此刻天下', noResults: '未找到匹配的政權', layers: '圖層', territories: '政權疆域', divisions: '一級政區', prefectures: '郡州府', modern: '現代省界', places: '城池與地名', playMusic: '播放古琴', pauseMusic: '暫停古琴', musicLoading: '正在載入古琴', musicError: '古琴暫未能播放，請重試',
  language: '語言', share: '分享', shareCopied: '連結已複製', shareFailed: '暫時無法複製，請複製網址列連結', pause: '暫停', previous: '上一年', next: '下一年', reset: '復位 / 指北', resetDone: '已復位三維視角', more: '更多', close: '關閉',
  quality: '畫質', ultra: '極致', eco: '省電', highlight: '鏡面高光', refraction: '玻璃折射', pressMotion: '液態按壓', motion: '減少動態', rivers: '河湖古澤', about: '關於與致謝', aboutTitle: '山河有據，來處可尋。', credit: '資料與原始設計源自', upstream: '江山時序 Jiangshan Atlas', license: '程式碼與上游自創資料採用 GPL-3.0；郡州府與現代省界遵循其原始授權。', legitimacy: 'main 沿用上游《資治通鑑》紀年慣例，不代表正統評價。',
  disclaimer: '歷史疆域為示意性近似，非測繪邊界', reference: '三維地形', referenceHint: '地形已可自由瀏覽。歷史疆域與資料圖層將在後續階段接入。',
  debug: '驗收控制台', fps: '即時幀率', snapshot: '目前快照', effects: '特效開關', moods: '觸發天象', transitions: '觸發疆域過渡', openings: '觸發章節開篇', empty: '暫無已接入項目', screenshot: '一鍵截圖', screenshotDone: '截圖已儲存', screenshotError: '截圖未能儲存，請重試',
  expand: '展開章節', collapse: '收起章節', sheet: '章節抽屜', sheetPositions: '收起 / 半開 / 全開', dataReady: '全量史料已載入', loading: '正在讀取史料', dataError: '史料暫未能載入，請重新整理', prefsSaved: '已更新顯示偏好', chapterGuide: '章節導覽', uiSettings: '介面設定', selected: '已選取', caption: '循歷史長河，觀天下分合。', timescale: '三國紀年', inspect: '檢視資料', glossary: '35 個專題 · 18 個時期',
};
export const en: Record<MessageKey, string> = {
  waterMotion: 'Water motion', moonlight: 'Moon reflection', coastWaves: 'Coastal waves', currents: 'Ocean currents', sky: 'Gradient sky', fog: 'Distant fog', lightCycle: 'Lighting cycle', clouds: 'Drifting clouds', cloudShadows: 'Cloud shadows',
  app: 'Historical Atlas of China', brand: 'Jiangshan', chapter: 'CHAPTER V · THREE KINGDOMS', chapterName: 'Three Kingdoms', chapterRange: '220 — 280 CE', intro: 'One realm. Three kingdoms.', description: 'As the Han order recedes, Wei, Shu Han and Wu take shape. Between mountains and rivers, a new balance emerges.',
  world: 'THE WORLD IN THIS YEAR', chronicle: 'PARALLEL CHRONICLES', overview: 'CHAPTER OVERVIEW', capital: 'Capital', ruler: 'Ruler', area: 'Territory', wei: 'Wei', shu: 'Shu Han', wu: 'Wu', caorui: 'Cao Rui', liushan: 'Liu Shan', sunquan: 'Sun Quan', luoyang: 'Luoyang', chengdu: 'Chengdu', jianye: 'Jianye', weiEra: 'Taihe 4', shuEra: 'Jianxing 8', wuEra: 'Huanglong 2', weiEvent: 'Cao Zhen’s campaign into Shu is halted by persistent rain.', shuEvent: 'Zhuge Liang’s northern campaigns contest the Qinling frontier.', wuEvent: 'Sun Quan sends Wei Wen and Zhuge Zhi by sea to Yizhou.',
  main: 'Main chronology', rival: 'Coexisting polity', riverTitle: 'RIVER OF TIME', year: 'Year', ce: 'CE', bce: 'BCE', search: 'Search', searchPlaceholder: 'Search the three kingdoms', noResults: 'No matching polity', layers: 'Layers', territories: 'Polities', divisions: 'Regional divisions', prefectures: 'Prefectures', modern: 'Modern provinces', rivers: 'Rivers & ancient lakes', places: 'Cities & place names', music: 'Guqin', playMusic: 'Play guqin', pauseMusic: 'Pause guqin', musicLoading: 'Loading guqin', musicError: 'Audio could not start. Please retry.', language: 'Language', share: 'Share', shareCopied: 'Link copied', shareFailed: 'Please copy the link from your address bar', play: 'Play', pause: 'Pause', previous: 'Previous year', next: 'Next year', reset: 'Reset / north', resetDone: '3D view reset', more: 'More', close: 'Close',
  quality: 'Quality', ultra: 'Ultra', high: 'High', eco: 'Eco', highlight: 'Specular highlight', refraction: 'Glass refraction', pressMotion: 'Liquid press', motion: 'Reduce motion', about: 'About & credits', aboutTitle: 'Every landscape has a source.', credit: 'Data and original design by', upstream: '江山时序 Jiangshan Atlas', license: 'Code and original upstream data: GPL-3.0. CHGIS and modern provinces retain their original terms.', legitimacy: '“main” follows the upstream Zizhi Tongjian chronology; it is not a judgment of legitimacy.', disclaimer: 'Historical territories are schematic approximations, not surveyed boundaries.', reference: '3D terrain', referenceHint: 'Explore the terrain freely. Historical territory and data layers will follow in later stages.',
  debug: 'Acceptance console', fps: 'Live frame rate', snapshot: 'Snapshot', effects: 'Effect toggles', moods: 'Trigger weather', transitions: 'Trigger border transition', openings: 'Trigger chapter opening', empty: 'No integrations yet', screenshot: 'Save screenshot', screenshotDone: 'Screenshot saved', screenshotError: 'Could not save screenshot. Please retry.', expand: 'Expand chapter', collapse: 'Collapse chapter', sheet: 'Chapter sheet', sheetPositions: 'Collapsed / Half / Expanded', dataReady: 'Complete source data loaded', loading: 'Loading source data', dataError: 'Could not load source data. Please refresh.', prefsSaved: 'Display preferences updated', chapterGuide: 'Chapter guide', musicCredit: 'Liu Shui · Guqin', uiSettings: 'Interface settings', north: 'N', selected: 'Selected', caption: 'Follow the river of time.', timescale: 'Three Kingdoms chronology', inspect: 'Inspect source data', glossary: '35 topics · 18 periods',
};
export const messages = { 'zh-Hans': hans, 'zh-Hant': hant, en };
export type Locale = keyof typeof messages;
