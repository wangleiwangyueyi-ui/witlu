import { useShell } from '../state/shell';
import type { Locale } from './messages';
export const chronicleMessages = {
  jumpYear: ['跳转年份', '跳轉年份', 'Go to year'], speed: ['播放倍速', '播放倍速', 'Playback speed'],
  yearRange: ['年份范围：前403—2027', '年份範圍：前403—2027', 'Year range: 403 BCE–2027 CE'],
  ambiguousEra: ['年号重名，请选择：', '年號重名，請選擇：', 'Multiple era matches. Choose one:'],
  invalidYear: ['未识别年份或年号，请试「前221」「贞观三年」', '未識別年份或年號，請試「前221」「貞觀三年」', 'Unrecognized year or era. Try -221 or 唐贞观三年.'],
  riverHelp: ['历史长河 · 左右键逐年，Shift 十年，双击复原', '歷史長河 · 左右鍵逐年，Shift 十年，雙擊復原', 'River of time · Arrows: one year; Shift: ten years; double-click: reset'],
  zoomIn: ['缩小时间范围', '縮小時間範圍', 'Zoom in on timeline'], zoomOut: ['扩大时间范围', '擴大時間範圍', 'Zoom out on timeline'], resetView: ['复原', '復原', 'Reset'],
  branches: ['当前支流', '當前支流', 'Current tributaries'], river: ['历史长河', '歷史長河', 'River of time'],
  riverHint: ['拖动 · 双指缩放 · 空格播放', '拖動 · 雙指縮放 · 空格播放', 'Drag · Pinch to zoom · Space to play'],
  flow: ['河面光点', '河面光點', 'River glints'], flight: ['穿越云层', '穿越雲層', 'Cloud passage'], haptics: ['边界轻触', '邊界輕觸', 'Boundary haptics'],
  on: ['开', '開', 'On'], off: ['关', '關', 'Off'], chapter: ['历史章节', '歷史章節', 'Historical chapter'], history: ['中国历代', '中國歷代', 'Chinese history'],
  position: ['历史位置', '歷史位置', 'Historical position'], eraTracks: ['此刻天下 · 君主与年号', '此刻天下 · 君主與年號', 'Polities · Rulers and eras'],
  mainEra: ['主纪年', '主紀年', 'Main chronology'], overview: ['章节概述', '章節概述', 'Chapter overview'], phase: ['阶段概述', '階段概述', 'Phase overview'],
  nearby: ['附近大事', '附近大事', 'Nearby events'], chronology: ['并行事件轨道', '並行事件軌道', 'Parallel chronicles'], sameYear: ['同期共鸣', '同期共鳴', 'Same-year resonance'],
  legend: ['政权图例', '政權圖例', 'Polity legend'], dossier: ['政权档案', '政權檔案', 'Polity dossier'], lineage: ['君主世系', '君主世系', 'Rulers and succession'],
  noRuler: ['无可核实纪年', '無可核實紀年', 'No dated reign available'], noEvent: ['附近无记录事件', '附近無記錄事件', 'No nearby event recorded'],
  capital: ['都城', '都城', 'Capital'], area: ['面积', '面積', 'Area'], focus: ['聚焦政权', '聚焦政權', 'Focus polity'], noCapital: ['无确证坐标', '無確證座標', 'No confirmed coordinates'],
  previousPage: ['上一组政权', '上一組政權', 'Previous polities'], nextPage: ['下一组政权', '下一組政權', 'Next polities'],
  guide: ['章节导览', '章節導覽', 'Chapter guide'], startGuide: ['开始导览', '開始導覽', 'Start tour'], pauseGuide: ['暂停导览', '暫停導覽', 'Pause tour'], resumeGuide: ['继续导览', '繼續導覽', 'Resume tour'], stopGuide: ['结束导览', '結束導覽', 'End tour'],
  previousChapter: ['上一章', '上一章', 'Previous chapter'], nextChapter: ['下一章', '下一章', 'Next chapter'], opening: ['书法开篇', '書法開篇', 'Calligraphic opening'],
  replayOpening: ['重播开篇', '重播開篇', 'Replay opening'], event: ['事件', '事件', 'Event'], phaseStep: ['阶段', '階段', 'Phase'],
  source: ['来源', '來源', 'Source'], close: ['关闭', '關閉', 'Close'], originalText: ['原文', '原文', 'Original text'],
  legendHint: ['悬停查看，点击聚焦，档案查看世系', '懸停查看，點擊聚焦，檔案查看世系', 'Hover for details; select to focus; open dossier for succession'],
  calligraphyCredit: ['笔画：Make Me a Hanzi / 文鼎', '筆畫：Make Me a Hanzi / 文鼎', 'Strokes: Make Me a Hanzi / Arphic'],
  loading: ['正在读取史料', '正在讀取史料', 'Loading historical data'], loadError: ['时间资料加载失败', '時間資料載入失敗', 'Could not load chronology data'],
  timelineLab: ['历史长河实验室', '歷史長河實驗室', 'Timeline laboratory'], flightLab: ['穿越云层实验', '穿越雲層實驗', 'Cloud passage laboratory'],
  labHelp: ['左右键逐年，Shift 十年；空格播放；拖动及双指缩放。', '左右鍵逐年，Shift 十年；空格播放；拖動及雙指縮放。', 'Arrows: one year; Shift: ten years; Space: play; drag and pinch to zoom.'],
  flightHelp: ['跨越 300 年时拔高穿云，再俯冲到新年代。', '跨越 300 年時拔高穿雲，再俯衝到新年代。', 'Jumps over 300 years rise through clouds and descend into the new era.'],
  chapterLab: ['章节与同期共鸣实验室', '章節與同期共鳴實驗室', 'Chapters and resonance laboratory'],
  reignYears: ['纪年跨度', '紀年跨度', 'Recorded reign spans'], approximation: ['座标为上游候选都城', '座標為上游候選都城', 'Coordinates are upstream capital candidates'],
} satisfies Record<string, [string, string, string]>;
export type ChronicleKey = keyof typeof chronicleMessages;
export function chronicleText(locale: Locale, key: ChronicleKey) { return chronicleMessages[key][locale === 'en' ? 2 : locale === 'zh-Hant' ? 1 : 0]; }
export function useChronicleText() { const locale = useShell(s => s.locale); return (key: ChronicleKey) => chronicleText(locale, key); }
export function formatYear(year: number, locale: Locale) { return locale === 'en' ? `${Math.abs(year)} ${year < 0 ? 'BCE' : 'CE'}` : `${year < 0 ? '前' : ''}${Math.abs(year)}年`; }
