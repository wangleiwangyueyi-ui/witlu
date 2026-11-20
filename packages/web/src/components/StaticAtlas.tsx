import {useEffect,useState} from 'react';
import {useShell} from '../state/shell';

interface StaticSnapshot {key:string;from:number;to:number;caption:string;image:string}
let snapshotsRequest: Promise<StaticSnapshot[]> | undefined;

export function loadStaticSnapshots() {
  return snapshotsRequest ??= fetch('/fallback/manifest.json').then(response => {
    if (!response.ok) throw Error('Static atlas unavailable');
    return response.json() as Promise<StaticSnapshot[]>;
  }).catch(error => { snapshotsRequest = undefined; throw error; });
}

export function staticSnapshotAt(snapshots: StaticSnapshot[], year: number) {
  return snapshots.find(snapshot => year >= snapshot.from && year < snapshot.to) ??
    (year >= 2026 ? snapshots.at(-1) : undefined);
}

export function StaticAtlas({unavailable=false}:{unavailable?:boolean}) {
  const year=useShell(s=>s.year), locale=useShell(s=>s.locale), [snapshots,setSnapshots]=useState<StaticSnapshot[]>([]);
  useEffect(() => {
    let mounted = true;
    void loadStaticSnapshots().then(data => { if (mounted) setSnapshots(data); }).catch(() => {});
    return () => { mounted = false; };
  }, []);
  const current = staticSnapshotAt(snapshots,year);
  const labels = {
    en:['Static atlas','Interactive map rendering is unavailable. Explore the static atlas with the timeline.','Retry map'],
    'zh-Hant':['靜態疆域圖','互動地圖暫時無法顯示，可用時間軸瀏覽各朝代靜態圖。','重試地圖'],
    'zh-Hans':['静态疆域图','交互地图暂时无法显示，可用时间轴浏览各朝代静态图。','重试地图'],
  };
  const [atlas,fallback,retry] = labels[locale];
  return <div className="static-atlas" data-testid={unavailable?'static-atlas':'initial-atlas'}>
    <figure>
      <img src={current?.image??'/fallback/initial.webp'} fetchPriority="high" alt={`${atlas} · ${year} · ${current?.caption??''}`}/>
      {unavailable && <figcaption role="status">{fallback}<button type="button" onClick={()=>location.reload()}>{retry}</button></figcaption>}
    </figure>
  </div>;
}
