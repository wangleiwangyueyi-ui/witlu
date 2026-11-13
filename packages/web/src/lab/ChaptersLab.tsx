import { App } from '../App';
import { ChapterEffectControls } from '../components/Tour';
import { useChronicleText } from '../i18n/chronicle';
import { seekYear } from '../store/time';
export default function ChaptersLab(){const t=useChronicleText();return <><App/><div className="glass chapters-lab-controls"><strong>{t('chapterLab')}</strong><div>{[-100,230,500,950,1140].map(y=><button key={y} onClick={()=>seekYear(y)}>{y}</button>)}</div><ChapterEffectControls/></div></>;}
