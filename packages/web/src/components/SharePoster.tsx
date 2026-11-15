import {shareURL} from '../state/share-url';
import {useEffect,useState} from 'react';
import QRCode from 'qrcode';
import {useShell} from '../state/shell';
import {terrainBridge} from '../state/terrain';
import {GlassButton} from './Glass';
import {useExploreText} from './Explore';
export function SharePoster(){const t=useExploreText(),[open,setOpen]=useState(false),[poster,setPoster]=useState(''),[error,setError]=useState(''),[copied,setCopied]=useState(false);const year=useShell(s=>s.year);
 useEffect(()=>{const show=()=>{setOpen(true);setPoster('');setError('');setCopied(false);};window.addEventListener('atlas:share',show);return()=>window.removeEventListener('atlas:share',show);},[]);
 useEffect(()=>{if(!open)return;let alive=true;void(async()=>{
  const canvas=document.querySelector<HTMLCanvasElement>('.terrain-canvas');if(!canvas||!terrainBridge.engine)throw Error('Map is still loading');
  await document.fonts.ready;terrainBridge.engine.renderNow();const frozen=new Image();frozen.src=canvas.toDataURL();await frozen.decode();
  const css=getComputedStyle(document.documentElement),token=(n:string)=>css.getPropertyValue(n).trim();
  const width=1080,height=Math.round(1080*canvas.clientHeight/canvas.clientWidth)+340,out=document.createElement('canvas');out.width=width;out.height=height;const ctx=out.getContext('2d')!;
  ctx.fillStyle=token('--sky');ctx.fillRect(0,0,width,height);ctx.drawImage(frozen,0,0,width,height-340);
  const sx=width/canvas.clientWidth;ctx.textAlign='center';ctx.font=`${Math.round(18*sx)}px ${css.getPropertyValue('--font-ui')}`;ctx.fillStyle=token('--text');
  for(const node of document.querySelectorAll<HTMLElement>('.polity-labels [data-site]:not([hidden]),.place-label:not([hidden])')){const r=node.getBoundingClientRect();if(r.width&&r.height)ctx.fillText(node.textContent??'',(r.x+r.width/2)*sx,(r.y+r.height/2)*sx);}
  ctx.textAlign='left';ctx.font='48px '+css.getPropertyValue('--font-title');ctx.fillStyle=token('--polity-main');ctx.fillText('江山 · '+(year<0?'公元前 '+(-year):'公元 '+year)+' 年',50,height-250);
  ctx.font='26px '+css.getPropertyValue('--font-ui');ctx.fillStyle=token('--text');ctx.fillText('两千四百年 · 一图观之',50,height-190);ctx.fillText('历史疆域为示意性近似，非测绘边界',50,height-125);ctx.font='20px '+css.getPropertyValue('--font-ui');ctx.fillText('witlu.com · jiangshan-map / CHGIS',50,height-65);
  const url=shareURL(location.search,year);
  const qr=document.createElement('canvas');await QRCode.toCanvas(qr,url,{width:240,margin:2,color:{dark:token('--sky'),light:token('--text')},errorCorrectionLevel:'M'});ctx.drawImage(qr,width-280,height-290,230,230);
  if(alive)setPoster(out.toDataURL('image/png'));
 })().catch(e=>{if(alive)setError(String(e));});return()=>{alive=false;};},[open,year]);
 useEffect(()=>{if(!open)return;const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[open]);
 if(!open)return null;return <div className="share-backdrop" data-capture-ignore="true"><section className="glass share-dialog" role="dialog" aria-modal="true" aria-label={t('分享海报','Share poster')}><header><h2>{t('把此刻江山寄给朋友','Share this moment')}</h2><GlassButton icon="close" label={t('关闭','Close')} onClick={()=>setOpen(false)}/></header>{poster?<img className="share-poster" src={poster} alt={t('江山分享海报，含二维码及历史边界免责声明','Atlas poster with QR code and boundary disclaimer')}/>:<p role="status">{error||t('正在绘制海报…','Drawing poster…')}</p>}<p>{t('长按保存 / 发送给朋友','Touch and hold to save or send to a friend')}</p><nav>{poster&&<a download={'witlu-'+year+'.png'} href={poster}>{t('保存海报','Save poster')}</a>}<GlassButton onClick={()=>void navigator.clipboard.writeText(shareURL(location.search,year)).then(()=>setCopied(true)).catch(()=>setError(t('请复制地址栏链接','Copy the link from the address bar')))}>{copied?t('已复制','Copied'):t('复制链接','Copy link')}</GlassButton></nav></section></div>;
}
