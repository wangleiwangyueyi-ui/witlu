import { GlassPanel } from './Glass';
import { useI18n } from '../i18n';
import { useChapterSettings } from '../state/chapters';
import { useShell } from '../state/shell';
import { Credits } from './Credits';
import { River } from './River';
import { RollingYear, TimeControls } from './TimeDock';
import { useChronicle } from '../store/chronicle';
import { resetTimeView, seekYear } from '../store/time';
import { Calligraphy } from './Calligraphy';
import { TourControls } from './Tour';
import { WorldLegend, WorldTracks } from './World';
import { useChronicleText, formatYear } from '../i18n/chronicle';
import { chapterName, eventTitle, historicalText } from '../i18n/history';
export function ChapterHeading({ mobile = false }: {mobile?: boolean}) {
  const {locale}=useI18n(),ct=useChronicleText(),{data}=useChronicle(),year=useShell(s=>s.year);
  const phase=data?.phases.slice().reverse().find(p=>p.from<=year),dynasty=data?.dynasties.find(d=>d.key===phase?.dynastyKey);
  const title=dynasty?chapterName(dynasty,locale,data):ct('loading');
  return <div className={`chapter-heading ${mobile?'mobile-heading':''}`}><p className="eyebrow">{ct('chapter')} · {data&&dynasty?String(data.dynasties.indexOf(dynasty)+1).padStart(2,'0'):''} / 18</p><div className="chapter-title">{mobile&&<RollingYear/>}<h1 aria-label={title}>{dynasty&&<Calligraphy text={historicalText(dynasty.title,locale==='en'?'zh-Hans':locale,data)} label={title}/>}<span className={locale==='en'?'chapter-english':'sr-only'}>{title}</span></h1></div>{!mobile&&dynasty&&<p className="chapter-range">{formatYear(dynasty.fromYear,locale)} — {formatYear(dynasty.toYear,locale)}</p>}</div>;
}
export function ChapterContent({mobile=false}:{mobile?:boolean}) {
  const opening=useChapterSettings(s=>s.opening),replay=useChapterSettings(s=>s.replay);
  const {data,error}=useChronicle(),year=useShell(s=>s.year),{locale,t}=useI18n(),ct=useChronicleText();
  const phase=data?.phases.slice().reverse().find(p=>p.from<=year),dynasty=data?.dynasties.find(d=>d.key===phase?.dynastyKey);
  const events=data?.events.filter(e=>e.kind==='milestone'&&e.dynastyKey===dynasty?.key).sort((a,b)=>a.year-b.year)??[];
  return <div className="chapter-content">{mobile&&<><River compact/><TimeControls/><WorldTracks mobile/></>}
    <nav className="chronicle-breadcrumb" aria-label={ct('position')}><span>{ct('history')}</span><span>›</span><button onClick={()=>{if(dynasty){seekYear(dynasty.fromYear);resetTimeView();}}}>{dynasty&&chapterName(dynasty,locale,data)}</button><span>› {formatYear(year,locale)}</span></nav>
    <TourControls/><WorldLegend/>
    <section className="chapter-intro chapter-summary" key={`${dynasty?.key}:${replay}`} data-opening={opening}><h2>{ct('overview')}</h2><p>{ct('capital')} · {dynasty&&(locale==='en'?data?.translations.en.dynasties[dynasty.key]?.capital??dynasty.seat:historicalText(dynasty.seat,locale,data))}</p><p>{dynasty&&(locale==='en'?data?.translations.en.dynasties[dynasty.key]?.desc??dynasty.summary:historicalText(dynasty.summary,locale,data))}</p></section>
    <section className="chapter-intro phase-overview"><h2>{ct('phase')}{locale==='en'&&<small> · {ct('originalText')}</small>}</h2><p>{historicalText(phase?.overview??'',locale,data)}</p></section>
    <section className="chronicle-section"><h2>{ct('nearby')}</h2>{events.map(e=><button className="chronicle-event" data-current={e.year===year} key={e.id} onClick={()=>seekYear(e.year)}><time>{formatYear(e.year,locale)}</time><span>{eventTitle(e,locale,data)}</span></button>)}</section>
    {error&&<p role="alert">{ct('loadError')} · {error}</p>}<p className="chapter-disclaimer">{t('disclaimer')}</p><Credits/>
  </div>;
}
export function ChapterPanel(){return <GlassPanel className="chapter-panel"><ChapterHeading/><div className="chapter-scroll"><ChapterContent/></div></GlassPanel>;}
