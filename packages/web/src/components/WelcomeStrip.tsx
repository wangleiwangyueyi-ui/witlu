import { useEffect, useState } from 'react';
import { useChronicle } from '../store/chronicle';
import { useTour } from '../store/tour';
import { startQuiz, useExplore } from '../state/explore';
import { useShell } from '../state/shell';
import './welcome-strip.css';

const key = 'witlu-start-guide-v1';
const words = {
  'zh-Hans': ['初来乍到','导览','寻一处故地','古地名小试','关闭新手提示'],
  'zh-Hant': ['初來乍到','導覽','尋一處故地','古地名小試','關閉新手提示'],
  en: ['New here?','Tour','Find a place','Map quiz','Dismiss welcome tips'],
};

function firstTime() {
  try { return !localStorage.getItem(key); } catch { return true; }
}

export default function WelcomeStrip() {
  const locale = useShell(s => s.locale), {data} = useChronicle();
  const [visible,setVisible] = useState(firstTime);
  const [heading,guide,search,quiz,dismiss] = words[locale];
  useEffect(() => {
    if (visible) {
      try { localStorage.setItem(key,'seen'); } catch { /* Storage is optional. */ }
    }
  }, [visible]);
  if (!visible) return null;

  const choose = (action: () => void) => { setVisible(false); action(); };
  return <aside className="welcome-strip" aria-label={heading}>
    <strong>{heading}</strong>
    <button type="button" disabled={!data} onClick={() => {
      if (!data) return;
      choose(() => {
        const year = useShell.getState().year;
        const chapter = [...data.phases].reverse().find(phase => phase.from <= year)?.dynastyKey;
        useTour.getState().start(data,chapter);
        window.dispatchEvent(new Event('atlas:open-tour'));
      });
    }}>{guide}</button>
    <button type="button" onClick={() => choose(() => useExplore.setState({searchOpen:true,query:''}))}>{search}</button>
    <button type="button" onClick={() => choose(() => { void startQuiz(); })}>{quiz}</button>
    <button type="button" aria-label={dismiss} onClick={() => setVisible(false)}>×</button>
  </aside>;
}
