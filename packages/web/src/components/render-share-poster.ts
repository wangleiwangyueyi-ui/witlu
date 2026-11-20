import { terrainBridge } from '../state/terrain';
import { useShell } from '../state/shell';
import { loadStaticSnapshots, staticSnapshotAt } from './StaticAtlas';

type Locale = ReturnType<typeof useShell.getState>['locale'];
const captions = {
  'zh-Hans': ['江山','中国历代疆域','两千四百年 · 一图观之','历史疆域为示意性近似，非测绘边界','扫码打开同一年份'],
  'zh-Hant': ['江山','中國歷代疆域','兩千四百年 · 一圖觀之','歷史疆域為示意性近似，非測繪邊界','掃碼開啟同一年份'],
  en: ['Jiangshan','Historical Atlas of China','2,400 years in one atlas','Historical territories are approximate and are not survey boundaries.','Scan to open this year'],
} as const;

async function mapSource(year: number) {
  const terrain = document.querySelector<HTMLCanvasElement>('.terrain-canvas');
  const engine = terrainBridge.engine;
  const live = terrain && engine?.flat && terrain.dataset.ready === 'true' &&
    terrain.dataset.context !== 'lost' && useShell.getState().year === year;
  const stats = engine?.morph.stats();
  if (live && stats?.ready && !stats.preparing && !stats.playing) {
    return { image: terrain, viewport: terrain.getBoundingClientRect(), drawNow: () => engine.renderNow() };
  }

  const snapshot = staticSnapshotAt(await loadStaticSnapshots(),year);
  const image = new Image();
  image.src = snapshot?.image ?? '/fallback/initial.webp';
  await image.decode();
  return { image };
}

function drawLabels(context: CanvasRenderingContext2D, viewport: DOMRect, sky: string) {
  const labels = [
    ...document.querySelectorAll<HTMLElement>('.map-label:not([hidden])'),
    ...document.querySelectorAll<HTMLElement>('.polity-labels [data-site]:not([hidden]) strong'),
  ];
  context.textBaseline = 'middle';
  context.strokeStyle = sky;
  context.lineJoin = 'round';
  for (const node of labels) {
    const rect = node.getBoundingClientRect();
    const text = node.textContent?.trim();
    if (!text || !rect.width || !rect.height || rect.left < viewport.left || rect.right > viewport.right ||
      rect.top < viewport.top || rect.bottom > viewport.bottom || node.closest('[hidden]')) continue;
    const style = getComputedStyle(node);
    if (style.visibility !== 'visible') continue;
    const place = node.classList.contains('map-label');
    const marker = place ? getComputedStyle(node,'::before') : undefined;
    const x = rect.left - viewport.left, y = rect.top - viewport.top + rect.height / 2;
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    context.textAlign = place ? 'left' : 'center';
    context.fillStyle = style.color;
    context.lineWidth = place ? 1.6 : 3;
    const textX = place ? x + (parseFloat(marker?.width ?? '') || 0) + 5 : x + rect.width / 2;
    if (marker) {
      const size = parseFloat(marker.width);
      context.save();
      context.translate(x + size / 2,y);
      context.fillStyle = marker.backgroundColor;
      if (node.dataset.kind === 'capital') {
        context.strokeStyle = marker.borderTopColor;
        context.lineWidth = 1;
        context.beginPath(); context.arc(0,0,size/2,0,2*Math.PI); context.stroke();
        context.beginPath(); context.arc(0,0,size/4,0,2*Math.PI);
        context.fillStyle = marker.borderTopColor; context.fill();
      } else if (node.dataset.kind === 'prefecture') {
        context.strokeStyle = marker.borderTopColor;
        context.lineWidth = 1;
        context.setLineDash([2,1]);
        context.beginPath(); context.moveTo(-size/2,0); context.lineTo(size/2,0); context.stroke();
      } else {
        context.beginPath(); context.arc(0,0,size/2,0,2*Math.PI); context.fill();
      }
      context.restore();
    }
    const lineHeight = parseFloat(style.lineHeight);
    // Canvas does not wrap text. Match the width of a wrapped DOM label.
    const limit = rect.height > lineHeight * 1.4 ? rect.width : undefined;
    context.strokeText(text,textX,y,limit);
    context.fillText(text,textX,y,limit);
  }
}

export async function renderSharePoster(year: number, locale: Locale, url: string) {
  await document.fonts.ready;
  const map = await mapSource(year);
  const width = 1080, heading = 170, footer = 320;
  const sourceWidth = map.viewport?.width ?? map.image.width;
  const sourceHeight = map.viewport?.height ?? map.image.height;
  // A portrait viewport contains map behind the toolbar and sheet. Use a
  // centered crop so the exported map and its text stay large on a phone.
  const croppedHeight = Math.min(sourceHeight,sourceWidth * 1.25);
  const cropTop = (sourceHeight - croppedHeight) / 2;
  const mapHeight = Math.round(width * croppedHeight / sourceWidth);
  const out = document.createElement('canvas');
  out.width = width;
  out.height = heading + mapHeight + footer;
  const ctx = out.getContext('2d');
  if (!ctx) throw Error('Canvas unavailable');
  const css = getComputedStyle(document.documentElement);
  const token = (name: string) => css.getPropertyValue(name).trim();
  const sky = token('--sky'), text = token('--text'), accent = token('--gold-glow');

  ctx.fillStyle = sky;
  ctx.fillRect(0,0,out.width,out.height);
  map.drawNow?.();
  const heightScale = map.image.height / sourceHeight;
  ctx.drawImage(map.image,0,cropTop*heightScale,map.image.width,croppedHeight*heightScale,0,heading,width,mapHeight);
  if (map.viewport) {
    ctx.save();
    ctx.beginPath(); ctx.rect(0,heading,width,mapHeight); ctx.clip();
    ctx.translate(0,heading);
    ctx.scale(width/sourceWidth,mapHeight/croppedHeight);
    ctx.translate(0,-cropTop);
    drawLabels(ctx,map.viewport,sky);
    ctx.restore();
  }
  const [brand,title,tagline,disclaimer,scan] = captions[locale];
  const yearLabel = locale === 'en' ? (year < 0 ? `${-year} BCE` : `${year} CE`) :
    (year < 0 ? `公元前 ${-year} 年` : `公元 ${year} 年`);
  const bottom = heading + mapHeight, fontUI = token('--font-ui'), fontTitle = token('--font-title');
  ctx.fillStyle = accent;
  ctx.font = `54px ${fontTitle}`;
  ctx.fillText(brand,50,86);
  ctx.font = `27px ${fontUI}`;
  ctx.fillStyle = text;
  ctx.fillText(title,52,130);
  ctx.textAlign = 'right';
  ctx.font = `44px ${fontTitle}`;
  ctx.fillStyle = accent;
  ctx.fillText(yearLabel,width-50,99);
  ctx.textAlign = 'left';

  ctx.fillStyle = token('--glass-edge');
  ctx.fillRect(50,bottom+26,width-100,1);
  ctx.font = `42px ${fontTitle}`;
  ctx.fillStyle = text;
  ctx.fillText(tagline,50,bottom+101,690);
  ctx.font = `31px ${fontUI}`;
  ctx.fillText(disclaimer,50,bottom+171,690);
  ctx.font = `25px ${fontUI}`;
  ctx.fillStyle = token('--text-secondary');
  ctx.fillText('witlu.com · jiangshan-map / CHGIS',50,bottom+230,690);

  const {default: QRCode} = await import('qrcode');
  const qr = document.createElement('canvas');
  await QRCode.toCanvas(qr,url,{width:216,margin:4,color:{dark:sky,light:text},errorCorrectionLevel:'M'});
  ctx.drawImage(qr,width-266,bottom+44,216,216);
  ctx.textAlign = 'center';
  ctx.font = `20px ${fontUI}`;
  ctx.fillText(scan,width-158,bottom+290,216);
  return out.toDataURL('image/png');
}
